import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const buildReject = (message?: string) => {
  const payload: Record<string, string> = {
    'control:Auth-Type': 'Reject'
  };

  if (message) {
    payload['reply:Reply-Message'] = message;
  }

  return payload;
};

const buildAccept = (message?: string) => {
  const payload: Record<string, string> = {};

  if (message) {
    payload['reply:Reply-Message'] = message;
  }

  return payload;
};

export const rlmController = {
  // Authorization endpoint
  async authorize(req: Request, res: Response) {
    try {
      const { username, password, nas_ip_address, nas_port } = req.body;
      
      console.log('RADIUS Authorization request:', {
        username,
        password: password ? '***' : 'none',
        nas_ip_address,
        nas_port,
        timestamp: new Date().toISOString()
      });

      // First, try to find a regular customer
      let customer = await prisma.organizationCustomer.findFirst({
        where: {
          OR: [
            { pppoeUsername: username },
            { hotspotUsername: username }
          ]
        },
        include: {
          package: true,
          organization: true
        }
      });

      let isHotspotVoucher = false;
      let hotspotVoucher = null;

      // If no regular customer found, check for hotspot voucher
      if (!customer) {
        hotspotVoucher = await prisma.hotspotVoucher.findUnique({
          where: {
            voucherCode: username
          },
          include: {
            package: true,
            organization: true
          }
        });

        if (hotspotVoucher) {
          isHotspotVoucher = true;
          console.log(`Found hotspot voucher for ${username}:`, {
            id: hotspotVoucher.id,
            status: hotspotVoucher.status,
            lastUsedAt: hotspotVoucher.lastUsedAt,
            expiresAt: hotspotVoucher.expiresAt,
            packageDuration: `${hotspotVoucher.package?.duration} ${hotspotVoucher.package?.durationType}`
          });
          
          // Check if voucher is active and not expired
          if (hotspotVoucher.status !== 'ACTIVE') {
            return res.json(buildReject('Voucher not active'));
          }

          if (hotspotVoucher.expiresAt && new Date() > hotspotVoucher.expiresAt) {
            return res.json(buildReject('Voucher expired'));
          }

          // Check if voucher duration has been exceeded
          if (hotspotVoucher.lastUsedAt && hotspotVoucher.package) {
            const durationMs = rlmController.getDurationInMs(hotspotVoucher.package.durationType);
            const totalDurationMs = durationMs * hotspotVoucher.package.duration;
            const timeSinceFirstUse = new Date().getTime() - hotspotVoucher.lastUsedAt.getTime();
            const remainingMs = Math.max(0, totalDurationMs - timeSinceFirstUse);
            
            console.log(`Voucher duration check for ${username}:`, {
              lastUsedAt: hotspotVoucher.lastUsedAt.toISOString(),
              packageDuration: `${hotspotVoucher.package.duration} ${hotspotVoucher.package.durationType}`,
              durationMs: durationMs,
              totalDurationMs: totalDurationMs,
              timeSinceFirstUse: timeSinceFirstUse,
              remainingMs: remainingMs,
              remainingHours: Math.floor(remainingMs / (60 * 60 * 1000)),
              remainingMinutes: Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
            });
            
            if (timeSinceFirstUse > totalDurationMs) {
              // Mark voucher as expired due to duration
              await prisma.hotspotVoucher.update({
                where: { id: hotspotVoucher.id },
                data: { status: 'EXPIRED' }
              });
              
              return res.json(buildReject('Voucher duration expired'));
            }
          }
        }
      }

      if (!customer && !hotspotVoucher) {
        return res.json(buildReject('User not found'));
      }

      // For regular customers, check if they are active and not expired
      if (!isHotspotVoucher && customer) {
        if (customer.status !== 'ACTIVE') {
          return res.json(buildReject('Account inactive'));
        }

        if (customer.expiryDate && new Date() > customer.expiryDate) {
          return res.json(buildReject('Account expired'));
        }
      }

      // Ensure we have either a customer or voucher
      if (!customer && !hotspotVoucher) {
        return res.json(buildReject('Authentication failed'));
      }

      // Get package data from either customer or voucher
      const packageData = customer?.package || hotspotVoucher?.package;
      const organization = customer?.organization || hotspotVoucher?.organization;

      if (!packageData) {
        return res.json(buildReject('Package not found'));
      }

      // Determine connection type and build attributes
      const isPPPoE = customer ? customer.pppoeUsername === username : false;
      const flatAttributes: Record<string, string | number> = {};

      if (packageData) {
        // Speed limits in bits per second
        const downloadSpeed = packageData.downloadSpeed * 1000000; // Convert Mbps to bps
        const uploadSpeed = packageData.uploadSpeed * 1000000;
        
        if (isPPPoE) {
          // PPPoE attributes
          flatAttributes['reply:Framed-Protocol'] = 'PPP';
          flatAttributes['reply:Mikrotik-Rate-Limit'] = `${uploadSpeed}/${downloadSpeed}`;
          
          // Burst settings if available
          if (packageData.burstDownloadSpeed && packageData.burstUploadSpeed) {
            const burstDown = packageData.burstDownloadSpeed * 1000000;
            const burstUp = packageData.burstUploadSpeed * 1000000;
            const burstThresholdDown = packageData.burstThresholdDownload ? packageData.burstThresholdDownload * 1000000 : downloadSpeed * 0.8;
            const burstThresholdUp = packageData.burstThresholdUpload ? packageData.burstThresholdUpload * 1000000 : uploadSpeed * 0.8;
            const burstTime = packageData.burstDuration || 8;
            
            flatAttributes['reply:Mikrotik-Rate-Limit'] = `${uploadSpeed}/${downloadSpeed} ${burstUp}/${burstDown} ${burstThresholdUp}/${burstThresholdDown} ${burstTime}/${burstTime}`;
          }
          
          // Address pool for PPPoE
          if (packageData.addressPool) {
            flatAttributes['reply:Framed-Pool'] = packageData.addressPool;
          }
        } else {
          // Hotspot attributes
          flatAttributes['reply:Mikrotik-Rate-Limit'] = `${uploadSpeed}/${downloadSpeed}`;
          
          // Burst settings for hotspot
          if (packageData.burstDownloadSpeed && packageData.burstUploadSpeed) {
            const burstDown = packageData.burstDownloadSpeed * 1000000;
            const burstUp = packageData.burstUploadSpeed * 1000000;
            const burstThresholdDown = packageData.burstThresholdDownload ? packageData.burstThresholdDownload * 1000000 : downloadSpeed * 0.8;
            const burstThresholdUp = packageData.burstThresholdUpload ? packageData.burstThresholdUpload * 1000000 : uploadSpeed * 0.8;
            const burstTime = packageData.burstDuration || 8;
            
            flatAttributes['reply:Mikrotik-Rate-Limit'] = `${uploadSpeed}/${downloadSpeed} ${burstUp}/${burstDown} ${burstThresholdUp}/${burstThresholdDown} ${burstTime}/${burstTime}`;
          }
          
          // Hotspot specific attributes
          flatAttributes['reply:Mikrotik-Hotspot-Profile'] = 'default';
        }

        // Session timeout based on package duration
        const sessionTimeout = rlmController.calculateSessionTimeout(packageData);
        if (sessionTimeout > 0) {
          flatAttributes['reply:Session-Timeout'] = sessionTimeout;
        }

        // For hotspot vouchers, calculate remaining time if already used
        if (isHotspotVoucher && hotspotVoucher && hotspotVoucher.lastUsedAt && packageData) {
          const durationMs = rlmController.getDurationInMs(packageData.durationType);
          const totalDurationMs = durationMs * packageData.duration;
          const timeSinceFirstUse = new Date().getTime() - hotspotVoucher.lastUsedAt.getTime();
          const remainingMs = Math.max(0, totalDurationMs - timeSinceFirstUse);
          
          console.log(`Session timeout calculation for voucher ${username}:`, {
            lastUsedAt: hotspotVoucher.lastUsedAt.toISOString(),
            currentTime: new Date().toISOString(),
            timeSinceFirstUse: timeSinceFirstUse,
            totalDurationMs: totalDurationMs,
            remainingMs: remainingMs,
            remainingHours: Math.floor(remainingMs / (60 * 60 * 1000)),
            remainingMinutes: Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000))
          });
          
          if (remainingMs > 0) {
            const remainingSeconds = Math.floor(remainingMs / 1000);
            flatAttributes['reply:Session-Timeout'] = remainingSeconds;
            console.log(`Setting session timeout to ${remainingSeconds} seconds (${Math.floor(remainingSeconds/3600)}h ${Math.floor((remainingSeconds%3600)/60)}m) for voucher ${username}`);
          } else {
            // Duration has expired, reject the connection
            console.log(`Voucher ${username} duration expired, rejecting connection`);
            return res.json(buildReject('Voucher duration expired'));
          }
        }

        // Idle timeout
        flatAttributes['reply:Idle-Timeout'] = 1800; // 30 minutes default

        // Max device limit for hotspot
        if (!isPPPoE && packageData.maxDevices) {
          flatAttributes['reply:Mikrotik-Hotspot-Max-Sessions'] = packageData.maxDevices;
        }
      }

      // Provide Cleartext-Password for FreeRADIUS to validate (PAP/MS-CHAPv2)
      let cleartextPassword: string | undefined;
      if (isPPPoE && customer) {
        cleartextPassword = customer.pppoePassword || undefined;
      } else if (!isPPPoE && customer) {
        cleartextPassword = customer.hotspotPassword || undefined;
      } else if (isHotspotVoucher && hotspotVoucher) {
        // For vouchers, the code acts as the password
        cleartextPassword = hotspotVoucher.voucherCode;
      }

      if (cleartextPassword) {
        flatAttributes['control:Cleartext-Password'] = cleartextPassword;
      }

      // Add additional attributes for hotspot authentication
      if (isHotspotVoucher || (!isPPPoE && customer)) {
        // Set Auth-Type to PAP for hotspot
        flatAttributes['control:Auth-Type'] = 'PAP';
        
        // Add service type for hotspot
        flatAttributes['reply:Service-Type'] = 'Framed-User';
        
        // Add framed protocol for hotspot
        flatAttributes['reply:Framed-Protocol'] = 'PPP';
        
        // Add session timeout for hotspot
        if (packageData) {
          const sessionTimeout = rlmController.calculateSessionTimeout(packageData);
          if (sessionTimeout > 0) {
            flatAttributes['reply:Session-Timeout'] = sessionTimeout;
          }
        }
      }

      console.log('RADIUS Authorization response:', {
        username,
        attributes: Object.keys(flatAttributes),
        timestamp: new Date().toISOString()
      });
      
      return res.json(flatAttributes);

    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json(buildReject('Internal server error'));
    }
  },

  // Authentication endpoint
  async authenticate(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      console.log('RADIUS Authentication request:', {
        username,
        password: password ? '***' : 'none',
        timestamp: new Date().toISOString()
      });

      // First, try to find a regular customer
      let customer = await prisma.organizationCustomer.findFirst({
        where: {
          OR: [
            { 
              pppoeUsername: username,
              pppoePassword: password
            },
            {
              hotspotUsername: username,
              hotspotPassword: password
            }
          ]
        },
        include: {
          package: true
        }
      });

      let isHotspotVoucher = false;
      let hotspotVoucher = null;

      // If no regular customer found, check for hotspot voucher
      if (!customer) {
        hotspotVoucher = await prisma.hotspotVoucher.findUnique({
          where: {
            voucherCode: username
          },
          include: {
            package: true
          }
        });

        if (hotspotVoucher) {
          // For hotspot vouchers, the voucher code should match both username and password
          if (hotspotVoucher.voucherCode === password) {
            isHotspotVoucher = true;
            // Check if voucher is active and not expired
            if (hotspotVoucher.status !== 'ACTIVE') {
              return res.json(buildReject('Voucher not active'));
            }

            if (hotspotVoucher.expiresAt && new Date() > hotspotVoucher.expiresAt) {
              return res.json(buildReject('Voucher expired'));
            }
          } else {
            // Voucher exists but password doesn't match
            return res.json(buildReject('Invalid voucher code'));
          }
        }
      }

      if (!customer && !hotspotVoucher) {
        return res.json(buildReject('Invalid credentials'));
      }

      // For regular customers, check if they are active and not expired
      if (!isHotspotVoucher && customer) {
        if (customer.status !== 'ACTIVE') {
          return res.json(buildReject('Account inactive'));
        }

        if (customer.expiryDate && new Date() > customer.expiryDate) {
          return res.json(buildReject('Account expired'));
        }
      }

      console.log('RADIUS Authentication response:', {
        username,
        result: 'accept',
        timestamp: new Date().toISOString()
      });
      
      return res.json(buildAccept());

    } catch (error) {
      console.error('Authentication error:', error);
      return res.status(500).json(buildReject('Internal server error'));
    }
  },

  // Pre-accounting endpoint
  async preAccounting(req: Request, res: Response) {
    try {
      const { username, nas_ip_address } = req.body;

      // Verify user exists and is active
      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          OR: [
            { pppoeUsername: username },
            { hotspotUsername: username }
          ]
        }
      });

      if (!customer || customer.status !== 'ACTIVE') {
        return res.json(buildReject('User not found or inactive'));
      }

      return res.json(buildAccept());
    } catch (error) {
      console.error('Pre-accounting error:', error);
      return res.status(500).json(buildReject());
    }
  },

  // Accounting endpoint
  async accounting(req: Request, res: Response) {
    try {
      const { 
        username, 
        acct_status_type,
        acct_session_id,
        acct_input_octets,
        acct_output_octets,
        acct_input_packets,
        acct_output_packets,
        acct_input_gigawords,
        acct_output_gigawords,
        acct_session_time,
        nas_ip_address,
        nas_port,
        framed_ip_address,
        calling_station_id,
        called_station_id,
        acct_terminate_cause,
        acct_authentic,
        acct_delay_time,
        service_type,
        framed_protocol,
        framed_mtu,
        connect_info,
        user_agent
      } = req.body;

      // Find customer or hotspot voucher
      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          OR: [
            { pppoeUsername: username },
            { hotspotUsername: username }
          ]
        },
        include: {
          package: true,
          organization: true,
          connection: true
        }
      });

      // If no customer found, check for hotspot voucher
      let hotspotVoucher = null;
      if (!customer) {
        hotspotVoucher = await prisma.hotspotVoucher.findUnique({
          where: {
            voucherCode: username
          },
          include: {
            package: true,
            organization: true
          }
        });
      }

      if (!customer && !hotspotVoucher) {
        console.log(`Accounting: User ${username} not found`);
        return res.json(buildAccept());
      }

      // Determine connection type
      const connectionType = customer ? (customer.pppoeUsername === username ? 'PPPoE' : 'Hotspot') : 'Hotspot';

      // Handle different accounting status types
      switch (acct_status_type) {
        case 'Start':
          const displayName = customer ? customer.name : `Voucher ${username}`;
          console.log(`Session started for ${username} (${displayName}): ${acct_session_id}`);
          console.log(`IP: ${framed_ip_address}, NAS: ${nas_ip_address}`);
          
          // For hotspot vouchers, don't mark as used immediately
          // They should remain active until their duration expires
          if (hotspotVoucher) {
            // Set lastUsedAt only if it's the first time being used
            const updateData: any = {};
            if (!hotspotVoucher.lastUsedAt) {
              updateData.lastUsedAt = new Date();
              console.log(`Setting lastUsedAt for voucher ${username} to: ${updateData.lastUsedAt.toISOString()}`);
            } else {
              console.log(`Voucher ${username} already has lastUsedAt: ${hotspotVoucher.lastUsedAt.toISOString()}`);
            }
            
            if (Object.keys(updateData).length > 0) {
              await prisma.hotspotVoucher.update({
                where: { id: hotspotVoucher.id },
                data: updateData
              });
            }
            console.log(`Hotspot voucher ${username} session started`);
          }
          
          // Only create connection record for regular customers, not vouchers
          if (customer) {
            // Upsert connection record (create if doesn't exist, update if exists)
            await prisma.organizationCustomerConnection.upsert({
              where: { customerId: customer.id },
            create: {
              customerId: customer.id,
              currentSessionId: acct_session_id,
              nasIpAddress: nas_ip_address,
              nasPort: nas_port,
              framedIpAddress: framed_ip_address,
              callingStationId: calling_station_id,
              calledStationId: called_station_id,
              connectionType,
              sessionStatus: 'ONLINE',
              currentSessionStartTime: new Date(),
              lastUpdateTime: new Date(),
              acctAuthentic: acct_authentic,
              serviceType: service_type,
              framedProtocol: framed_protocol,
              framedMtu: framed_mtu ? parseInt(framed_mtu) : null,
              connectInfo: connect_info,
              userAgent: user_agent,
              currentInputOctets: BigInt(0),
              currentOutputOctets: BigInt(0),
              currentInputPackets: BigInt(0),
              currentOutputPackets: BigInt(0),
              currentInputGigawords: 0,
              currentOutputGigawords: 0,
              totalSessions: 1
            },
            update: {
              currentSessionId: acct_session_id,
              nasIpAddress: nas_ip_address,
              nasPort: nas_port,
              framedIpAddress: framed_ip_address,
              callingStationId: calling_station_id,
              calledStationId: called_station_id,
              connectionType,
              sessionStatus: 'ONLINE',
              currentSessionStartTime: new Date(),
              lastUpdateTime: new Date(),
              acctAuthentic: acct_authentic,
              serviceType: service_type,
              framedProtocol: framed_protocol,
              framedMtu: framed_mtu ? parseInt(framed_mtu) : null,
              connectInfo: connect_info,
              userAgent: user_agent,
              currentInputOctets: BigInt(0),
              currentOutputOctets: BigInt(0),
              currentInputPackets: BigInt(0),
              currentOutputPackets: BigInt(0),
              currentInputGigawords: 0,
              currentOutputGigawords: 0,
              totalSessions: { increment: 1 }
            }
          });

          // Update customer connection status to ONLINE
          await prisma.organizationCustomer.update({
            where: { id: customer.id },
            data: { connectionStatus: 'ONLINE' }
          });
          }
          break;
        
        case 'Stop':
          const stopDisplayName = customer ? customer.name : `Voucher ${username}`;
          console.log(`Session stopped for ${username} (${stopDisplayName}): ${acct_session_id}`);
          console.log(`Usage - Input: ${acct_input_octets} bytes, Output: ${acct_output_octets} bytes, Time: ${acct_session_time} seconds`);
          
          const inputOctets = acct_input_octets ? BigInt(acct_input_octets) : BigInt(0);
          const outputOctets = acct_output_octets ? BigInt(acct_output_octets) : BigInt(0);
          const inputPackets = acct_input_packets ? BigInt(acct_input_packets) : BigInt(0);
          const outputPackets = acct_output_packets ? BigInt(acct_output_packets) : BigInt(0);
          const sessionTime = acct_session_time ? parseInt(acct_session_time) : 0;
          
          // Calculate total usage
          const totalBytes = Number(inputOctets + outputOctets);
          const totalMB = Math.round(totalBytes / (1024 * 1024));
          const sessionMinutes = Math.round(sessionTime / 60);
          
          console.log(`Total usage: ${totalMB} MB, Session duration: ${sessionMinutes} minutes`);
          
          // Update connection record with final session data and accumulate totals (only for customers)
          if (customer && customer.connection) {
            await prisma.organizationCustomerConnection.update({
              where: { customerId: customer.id },
              data: {
                sessionStatus: 'OFFLINE',
                lastSessionStopTime: new Date(),
                lastSessionDuration: sessionTime,
                lastUpdateTime: new Date(),
                currentSessionDuration: sessionTime,
                currentInputOctets: inputOctets,
                currentOutputOctets: outputOctets,
                currentInputPackets: inputPackets,
                currentOutputPackets: outputPackets,
                currentInputGigawords: acct_input_gigawords ? parseInt(acct_input_gigawords) : 0,
                currentOutputGigawords: acct_output_gigawords ? parseInt(acct_output_gigawords) : 0,
                lastTerminateCause: acct_terminate_cause,
                // Accumulate lifetime totals
                totalInputOctets: { increment: inputOctets },
                totalOutputOctets: { increment: outputOctets },
                totalInputPackets: { increment: inputPackets },
                totalOutputPackets: { increment: outputPackets },
                totalSessionTime: { increment: sessionTime }
              }
            });
          }

          // Update customer connection status to OFFLINE (only for customers)
          if (customer) {
            await prisma.organizationCustomer.update({
              where: { id: customer.id },
              data: { connectionStatus: 'OFFLINE' }
            });
          }
          break;
        
        case 'Interim-Update':
          console.log(`Interim update for ${username}: ${acct_session_id}`);
          
          // Update current session data (only for customers)
          if (customer && customer.connection) {
            await prisma.organizationCustomerConnection.update({
              where: { customerId: customer.id },
              data: {
                lastUpdateTime: new Date(),
                currentSessionDuration: acct_session_time ? parseInt(acct_session_time) : null,
                currentInputOctets: acct_input_octets ? BigInt(acct_input_octets) : BigInt(0),
                currentOutputOctets: acct_output_octets ? BigInt(acct_output_octets) : BigInt(0),
                currentInputPackets: acct_input_packets ? BigInt(acct_input_packets) : BigInt(0),
                currentOutputPackets: acct_output_packets ? BigInt(acct_output_packets) : BigInt(0),
                currentInputGigawords: acct_input_gigawords ? parseInt(acct_input_gigawords) : 0,
                currentOutputGigawords: acct_output_gigawords ? parseInt(acct_output_gigawords) : 0
              }
            });
          }
          break;
      }

      return res.json(buildAccept());

    } catch (error) {
      console.error('Accounting error:', error);
      return res.status(500).json(buildAccept());
    }
  },

  // Check simultaneous sessions
  async checkSimultaneous(req: Request, res: Response) {
    try {
      const { username } = req.body;

      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          OR: [
            { pppoeUsername: username },
            { hotspotUsername: username }
          ]
        },
        include: {
          package: true,
          connection: true
        }
      });

      // If no customer found, check for hotspot voucher
      let hotspotVoucher = null;
      if (!customer) {
        hotspotVoucher = await prisma.hotspotVoucher.findUnique({
          where: {
            voucherCode: username
          },
          include: {
            package: true
          }
        });
      }

      if (!customer && !hotspotVoucher) {
        return res.json(buildReject('User not found'));
      }

      // For hotspot vouchers, only one session allowed (vouchers are single-use)
      if (hotspotVoucher) {
        if (hotspotVoucher.status === 'USED') {
          return res.json(buildReject('Voucher already used'));
        }
        return res.json(buildAccept());
      }

      // Check if customer already has an active session
      if (customer && customer.connection?.sessionStatus === 'ONLINE') {
        // For PPPoE, typically only one session allowed
        if (customer.pppoeUsername === username) {
          return res.json(buildReject('Session already active'));
        }
        
        // For hotspot, check max devices
        if (customer.hotspotUsername === username && customer.package?.maxDevices) {
          if (customer.package.maxDevices <= 1) {
            return res.json(buildReject('Maximum device limit reached'));
          }
        }
      }

      return res.json(buildAccept());

    } catch (error) {
      console.error('Check simultaneous error:', error);
      return res.status(500).json(buildReject());
    }
  },

  // Post-authentication endpoint
  async postAuth(req: Request, res: Response) {
    try {
      const { username, reply_message } = req.body;

      console.log(`Post-auth for ${username}: ${reply_message || 'Success'}`);

      return res.json(buildAccept());

    } catch (error) {
      console.error('Post-auth error:', error);
      return res.status(500).json(buildReject());
    }
  },

  // Helper method to calculate session timeout based on package duration
  calculateSessionTimeout(packageData: any): number {
    if (!packageData.duration || !packageData.durationType) {
      return 0; // No timeout
    }

    const duration = packageData.duration;
    
    switch (packageData.durationType) {
      case 'HOUR':
        return duration * 3600; // hours to seconds
      case 'DAY':
        return duration * 24 * 3600; // days to seconds
      case 'WEEK':
        return duration * 7 * 24 * 3600; // weeks to seconds
      case 'MONTH':
        return duration * 30 * 24 * 3600; // months to seconds (approximate)
      case 'YEAR':
        return duration * 365 * 24 * 3600; // years to seconds (approximate)
      case 'MINUTE':
        return duration * 60; // minutes to seconds
      default:
        return 0;
    }
  },

  // Helper method to convert duration to milliseconds
  getDurationInMs(durationType: string): number {
    switch (durationType) {
      case 'MINUTE':
        return 60 * 1000;
      case 'HOUR':
        return 60 * 60 * 1000;
      case 'DAY':
        return 24 * 60 * 60 * 1000;
      case 'WEEK':
        return 7 * 24 * 60 * 60 * 1000;
      case 'MONTH':
        return 30 * 24 * 60 * 60 * 1000;
      case 'YEAR':
        return 365 * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000; // Default to 1 hour
    }
  },

  // Helper method to get current time in user's timezone
  getCurrentTimeInUserTimezone(): Date {
    // For now, return current time - in production, you might want to
    // determine user's timezone from their location or settings
    return new Date();
  }
};

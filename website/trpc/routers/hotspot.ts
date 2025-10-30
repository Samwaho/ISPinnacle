import { createTRPCRouter, baseProcedure, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPackageType, PaymentGateway } from "@/lib/generated/prisma";
import { MpesaAPI } from "./mpesa";
import { KopoKopoAPI } from "./kopokopo";

// Helper function to convert duration to milliseconds
function getDurationInMs(durationType: string): number {
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
}


export const hotspotRouter = createTRPCRouter({
  // Public procedures (no authentication required)
  
  // Get organization details for hotspot portal
  getOrganization: baseProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      const organization = await prisma.organization.findUnique({
        where: { id: input.orgId },
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
          phone: true,
          email: true,
          website: true,
        }
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found"
        });
      }

      return { organization };
    }),

  // Get packages for organization
  getPackages: baseProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const packages = await prisma.organizationPackage.findMany({
        where: {
          organizationId: input.organizationId,
          isActive: true,
          type: OrganizationPackageType.HOTSPOT,
        },
        select: {
          id: true,
          name: true,
          description: true,
          downloadSpeed: true,
          uploadSpeed: true,
          duration: true,
          durationType: true,
          price: true,
          maxDevices: true,
          burstDownloadSpeed: true,
          burstUploadSpeed: true,
          burstThresholdDownload: true,
          burstThresholdUpload: true,
          burstDuration: true,
          addressPool: true,
          type: true,
        },
        orderBy: {
          price: 'asc',
        }
      });

      return { packages };
    }),

  // Purchase voucher
  purchaseVoucher: baseProcedure
    .input(z.object({
      organizationId: z.string(),
      packageId: z.string(),
      phoneNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { organizationId, packageId, phoneNumber } = input;

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, paymentGateway: true }
      });

      if (!organization) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found"
        });
      }

      // Verify package exists
      const packageData = await prisma.organizationPackage.findUnique({
        where: { id: packageId },
        select: { 
          id: true, 
          name: true, 
          price: true, 
          duration: true, 
          durationType: true 
        }
      });

      if (!packageData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found"
        });
      }

      // Generate unique voucher code
      const voucherCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Calculate expiry based on package duration
      const baseMs = getDurationInMs(packageData.durationType);
      const expiresAt = new Date(Date.now() + baseMs * packageData.duration);

      // Create voucher
      const voucher = await prisma.hotspotVoucher.create({
        data: {
          voucherCode,
          organizationId,
          packageId,
          phoneNumber,
          amount: packageData.price,
          status: 'PENDING',
          expiresAt,
          paymentReference: `pending_${Date.now()}`, // Temporary reference
        },
        include: {
          package: true,
          organization: true,
        }
      });

        // Determine and initiate payment based on organization configuration
        const [mpesaConfig, k2Config] = await Promise.all([
          prisma.mpesaConfiguration.findFirst({ where: { organizationId } }),
          prisma.kopokopoConfiguration.findFirst({ where: { organizationId } }),
        ]);

        const preferredGateway = organization.paymentGateway;

        if (preferredGateway === PaymentGateway.MPESA && !mpesaConfig) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "M-Pesa is selected but not configured for this organization.",
          });
        }

        if (preferredGateway === PaymentGateway.KOPOKOPO && !k2Config) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Kopo Kopo is selected but not configured for this organization.",
          });
        }

        const initiateMpesa = async (config: NonNullable<typeof mpesaConfig>) => {
          try {
            const mpesaAPI = new MpesaAPI({
              consumerKey: config.consumerKey,
              consumerSecret: config.consumerSecret,
              shortCode: config.shortCode,
              passKey: config.passKey,
              transactionType: config.transactionType,
            });

            const result = await mpesaAPI.initiateSTKPush(
              phoneNumber,
              packageData.price,
              voucher.voucherCode,
              `Hotspot ${packageData.name}`
            );

            const checkoutRequestId: string | undefined = result?.CheckoutRequestID;
            if (checkoutRequestId) {
              await prisma.hotspotVoucher.update({
                where: { id: voucher.id },
                data: { paymentReference: checkoutRequestId },
              });
            }

            return {
              voucherId: voucher.id,
              voucherCode: voucher.voucherCode,
              paymentMethod: 'mpesa' as const,
              paymentData: {
                shortCode: config.shortCode,
                transactionType: config.transactionType,
                checkoutRequestId: checkoutRequestId || '',
              },
              package: packageData,
              organization: organization,
            };
          } catch (err) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to initiate M-Pesa STK Push: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        };

        const initiateK2 = async (config: NonNullable<typeof k2Config>) => {
          try {
            const k2 = new KopoKopoAPI({
              clientId: config.clientId,
              clientSecret: config.clientSecret,
              apiKey: config.apiKey,
              tillNumber: config.tillNumber,
            });

            const reference = voucher.id;
            await prisma.hotspotVoucher.update({
              where: { id: voucher.id },
              data: { paymentReference: reference },
            });

            const result = await k2.initiateIncomingPayment({
              phoneNumber,
              amount: packageData.price,
              reference,
              description: `Hotspot ${packageData.name}`,
            });

            return {
              voucherId: voucher.id,
              voucherCode: voucher.voucherCode,
              paymentMethod: 'kopokopo' as const,
              paymentData: {
                tillNumber: config.tillNumber,
                location: result.location || '',
                reference,
              },
              package: packageData,
              organization: organization,
            };
          } catch (err) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Failed to initiate Kopo Kopo payment: ${err instanceof Error ? err.message : 'Unknown error'}`,
            });
          }
        };

        if (preferredGateway === PaymentGateway.KOPOKOPO && k2Config) {
          return initiateK2(k2Config);
        }

        if (preferredGateway === PaymentGateway.MPESA && mpesaConfig) {
          return initiateMpesa(mpesaConfig);
        }

        if (preferredGateway === PaymentGateway.OTHER) {
          if (mpesaConfig) {
            return initiateMpesa(mpesaConfig);
          }
          if (k2Config) {
            return initiateK2(k2Config);
          }
        }

        if (!preferredGateway) {
          if (k2Config && !mpesaConfig) {
            return initiateK2(k2Config);
          }
          if (mpesaConfig) {
            return initiateMpesa(mpesaConfig);
          }
          if (k2Config) {
            return initiateK2(k2Config);
          }
        }

        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No payment gateway configured for this organization",
        });
    }),

  // Check voucher status
  getVoucherStatus: baseProcedure
    .input(z.object({ voucherId: z.string() }))
    .query(async ({ input }) => {
      const voucher = await prisma.hotspotVoucher.findUnique({
        where: { id: input.voucherId },
        include: {
          package: true,
          organization: true,
        }
      });

      if (!voucher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voucher not found"
        });
      }

      return { voucher };
    }),

  // Connect with voucher (validate and get remaining time)
  connectVoucher: baseProcedure
    .input(z.object({ voucherCode: z.string() }))
    .mutation(async ({ input }) => {
      const { voucherCode } = input;

      const voucher = await prisma.hotspotVoucher.findUnique({
        where: { voucherCode },
        include: {
          package: true,
          organization: true,
        }
      });

      if (!voucher) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid voucher code"
        });
      }

      // Check if voucher is active
      if (voucher.status !== 'ACTIVE') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher is not active"
        });
      }

      // Check if voucher is expired
      if (voucher.expiresAt && new Date() > voucher.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Voucher has expired"
        });
      }

      // Remaining time is derived from expiresAt
      let remainingDuration = null as null | {
        milliseconds: number;
        hours: number;
        minutes: number;
        seconds: number;
      };

      if (voucher.expiresAt) {
        const remainingMs = voucher.expiresAt.getTime() - Date.now();
        if (remainingMs > 0) {
          remainingDuration = {
            milliseconds: remainingMs,
            hours: Math.floor(remainingMs / (60 * 60 * 1000)),
            minutes: Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)),
            seconds: Math.floor((remainingMs % (60 * 1000)) / 1000),
          };
        } else {
          await prisma.hotspotVoucher.update({
            where: { id: voucher.id },
            data: { status: 'EXPIRED' },
          });
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Voucher duration has expired',
          });
        }
      }

      return {
        voucher: {
          id: voucher.id,
          voucherCode: voucher.voucherCode,
          status: voucher.status,
          expiresAt: voucher.expiresAt,
          remainingDuration,
          package: voucher.package,
          organization: voucher.organization,
        }
      };
    }),


  // Protected procedures (require authentication)
  
  // Get all vouchers for an organization (admin only)
  getVouchers: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const vouchers = await prisma.hotspotVoucher.findMany({
        where: { organizationId: input.organizationId },
        include: {
          package: true,
          organization: true,
        },
        orderBy: {
          createdAt: 'desc',
        }
      });

      return { vouchers };
    }),

  // Create voucher manually (admin only)
  createVoucher: protectedProcedure
    .input(z.object({
      organizationId: z.string(),
      packageId: z.string(),
      phoneNumber: z.string(),
      amount: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { organizationId, packageId, phoneNumber, amount } = input;

      // Generate unique voucher code
      const voucherCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Calculate expiry based on package duration
      // Admin-created vouchers follow the same rule as purchased vouchers
      const pkg = await prisma.organizationPackage.findUnique({
        where: { id: packageId },
        select: { duration: true, durationType: true }
      });
      const baseMs2 = getDurationInMs(pkg?.durationType || 'HOUR');
      const expiresAt = new Date(Date.now() + baseMs2 * (pkg?.duration || 1));

      const voucher = await prisma.hotspotVoucher.create({
        data: {
          voucherCode,
          organizationId,
          packageId,
          phoneNumber,
          amount,
          status: 'ACTIVE', // Admin-created vouchers are immediately active
          expiresAt,
        },
        include: {
          package: true,
          organization: true,
        }
      });

      return {
        success: true,
        message: "Voucher created successfully",
        voucher,
      };
    }),

  // Update voucher status (admin only)
  updateVoucherStatus: protectedProcedure
    .input(z.object({
      voucherId: z.string(),
      status: z.enum(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED']),
    }))
    .mutation(async ({ input }) => {
      const { voucherId, status } = input;

      const voucher = await prisma.hotspotVoucher.update({
        where: { id: voucherId },
        data: { status },
        include: {
          package: true,
          organization: true,
        }
      });

      return {
        success: true,
        message: "Voucher status updated successfully",
        voucher,
      };
    }),
});

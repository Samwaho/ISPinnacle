'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, Clock, Download, Upload, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { ModeToggle } from '@/components/ModeToggle';
import { MissingOrgConfig } from '@/components/hotspot/missing-org-config';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  phone: string;
  email: string;
  website: string | null;
}

interface Voucher {
  id: string;
  voucherCode: string;
  status: string;
  remainingDuration?: {
    milliseconds: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null;
  package?: {
    name: string;
    downloadSpeed: number;
    uploadSpeed: number;
    duration: number;
    durationType: string;
  };
  organization?: Organization;
}

export default function HotspotStatusPage() {
  const searchParams = useSearchParams();
  const orgId = (searchParams.get('org') || '').trim();
  const hasOrgId = Boolean(orgId);
  const missingOrgMessage = 'Organization ID is required. Append ?org=... from MikroTik.';
  const voucherCode = searchParams.get('voucher') || searchParams.get('username') || '';
  const rawLinkLogout = searchParams.get('link-logout') || '';
  const linkLoginOnly = searchParams.get('link-login-only') || '';
  const clientMac = searchParams.get('mac') || '';
  const clientIp = searchParams.get('ip') || '';

  const effectiveLogoutUrl = useMemo(() => {
    let url = rawLinkLogout;
    if (!url && linkLoginOnly) {
      try {
        const u = new URL(linkLoginOnly);
        // Replace /login path with /logout
        u.pathname = u.pathname.replace(/login$/i, 'logout');
        u.search = '';
        url = u.toString();
      } catch {
        // Fallback: if simple string, try replace
        url = linkLoginOnly.replace(/login$/i, 'logout');
      }
    }
    if (url) {
      // Ensure cookie is erased to avoid auto-login persisting the session
      const hasQuery = url.includes('?');
      url += (hasQuery ? '&' : '?') + 'erase-cookie=yes';
    }
    return url;
  }, [rawLinkLogout, linkLoginOnly]);
  
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  const trpc = useTRPC();

  // Fetch organization details
  const organizationQuery = trpc.hotspot.getOrganization.queryOptions({ orgId });
  const { data: organizationData } = useQuery({
    ...organizationQuery,
    enabled: hasOrgId && (organizationQuery.enabled ?? true),
  });

  // Connect voucher mutation
  const { mutate: connectVoucher } = useMutation(
    trpc.hotspot.connectVoucher.mutationOptions({
      onSuccess: (result) => {
        if (result.voucher) {
          setVoucher(result.voucher);
          
          if (result.voucher.remainingDuration) {
            setRemainingTime({
              hours: result.voucher.remainingDuration.hours,
              minutes: result.voucher.remainingDuration.minutes,
              seconds: result.voucher.remainingDuration.seconds
            });
          }
        }
        setIsLoading(false);
      },
      onError: (error) => {
        console.error('Error checking voucher:', error);
        const msg = (() => {
          try {
            const e = error as { data?: { code?: string }; message?: string };
            if (e?.data?.code === 'NOT_FOUND') return 'Invalid voucher code. Please check and try again.';
            if (e?.message) return e.message;
          } catch {}
          return 'Could not verify voucher';
        })();
        toast.error(msg);
        setIsLoading(false);
      }
    })
  );


  // Format duration unit
  const formatDurationUnit = (unit: string, value: number): string => {
    if (value === 1) {
      const singularMap: Record<string, string> = {
        'hours': 'hour',
        'days': 'day',
        'weeks': 'week',
        'months': 'month',
      };
      return singularMap[unit] || unit;
    }
    return unit;
  };

  // Check voucher status
  const checkVoucherStatus = useCallback(async () => {
    if (!voucherCode) {
      setIsLoading(false);
      return;
    }

    if (!hasOrgId) {
      setIsLoading(false);
      toast.error(missingOrgMessage);
      return;
    }

    connectVoucher({ voucherCode });
  }, [voucherCode, connectVoucher, hasOrgId, missingOrgMessage]);

  // Update remaining time
  useEffect(() => {
    if (!remainingTime) return;

    const interval = setInterval(() => {
      setRemainingTime(prev => {
        if (!prev) return null;
        
        let { hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          // Time expired
          return null;
        }
        
        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime]);

  useEffect(() => {
    checkVoucherStatus();
  }, [voucherCode, checkVoucherStatus]);

  const organization = organizationData?.organization;

  // Helper – total duration in ms from package
  const getDurationInMs = (unit?: string): number => {
    switch (unit) {
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
        return 60 * 60 * 1000;
    }
  };

  const usage = useMemo(() => {
    if (!voucher?.package) return null;
    const totalMs = (voucher.package.duration || 0) * getDurationInMs(voucher.package.durationType);
    const remainingMs = voucher.remainingDuration?.milliseconds ?? totalMs;
    const usedMs = Math.max(0, totalMs - remainingMs);
    const pct = totalMs > 0 ? Math.min(100, Math.round((usedMs / totalMs) * 100)) : 0;
    return { totalMs, remainingMs, usedMs, pct };
  }, [voucher]);

  if (!hasOrgId) {
    return <MissingOrgConfig page="status" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking voucher status...</p>
        </div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {organization?.logo && (
                <Image 
                  src={organization.logo} 
                  alt={organization.name} 
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded"
                />
              )}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {organization?.name || 'ISPinnacle Hotspot'}
              </h1>
            </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">Invalid Voucher</CardTitle>
              <CardDescription className="text-center">
                The voucher code you provided is not valid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="space-y-3">
                {effectiveLogoutUrl ? (
                  <Button
                    variant="destructive"
                    onClick={() => (window.location.href = effectiveLogoutUrl)}
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect Now
                  </Button>
                ) : null}
                <Button 
                  onClick={() => (window.location.href = `/hotspot/login?org=${encodeURIComponent(orgId)}`)}
                  className="w-full"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Get New Voucher
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {organization?.logo && (
                <Image 
                  src={organization.logo} 
                  alt={organization.name} 
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded"
                />
              )}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {organization?.name || 'ISPinnacle Hotspot'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <ModeToggle />
              <Badge variant="secondary" className="flex items-center">
                <Wifi className="h-4 w-4 mr-1" />
                Connected
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Wifi className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;re Connected!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enjoy your internet access
          </p>
        </div>

        {/* Voucher Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">🎟️</span>
                Voucher Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Voucher Code</p>
                <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                  {voucher.voucherCode}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <Badge variant={voucher.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {voucher.status}
                </Badge>
              </div>
              {voucher.package && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Package</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {voucher.package.name}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Remaining Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {remainingTime ? (
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {remainingTime.hours.toString().padStart(2, '0')}:
                    {remainingTime.minutes.toString().padStart(2, '0')}:
                    {remainingTime.seconds.toString().padStart(2, '0')}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Hours : Minutes : Seconds
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    No time limit
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Unlimited access
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Connection & Usage */}
        {voucher && usage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Connection Details</CardTitle>
                <CardDescription>Device and session context</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {clientMac ? <div>MAC: <span className="font-mono">{clientMac}</span></div> : null}
                {clientIp ? <div>IP: <span className="font-mono">{clientIp}</span></div> : null}
                <div>Voucher: <span className="font-mono">{voucher.voucherCode}</span></div>
                <div>Status: <Badge variant="secondary">{voucher.status}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Usage</CardTitle>
                <CardDescription>Time-based usage of this voucher</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Used</span>
                  <span>{usage.pct}%</span>
                </div>
                <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className="h-3 bg-blue-600 dark:bg-blue-500" style={{ width: `${usage.pct}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 text-xs text-gray-500 dark:text-gray-400">
                  <div>
                    <div className="font-semibold text-gray-700 dark:text-gray-200">Remaining</div>
                    <div>{Math.max(0, Math.floor(usage.remainingMs / 3600000))}h</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-700 dark:text-gray-200">Used</div>
                    <div>{Math.floor(usage.usedMs / 3600000)}h</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-700 dark:text-gray-200">Total</div>
                    <div>{Math.floor(usage.totalMs / 3600000)}h</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Package Information */}
        {voucher.package && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">📦</span>
                Package Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Download Speed</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {voucher.package.downloadSpeed} Mbps
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Upload Speed</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {voucher.package.uploadSpeed} Mbps
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {voucher.package.duration} {formatDurationUnit(voucher.package.durationType, voucher.package.duration)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="text-center space-y-4">
          <Button 
            onClick={() => (window.location.href = `/hotspot/logout?org=${encodeURIComponent(orgId)}`)}
            variant="outline"
            className="mr-4"
          >
            Disconnect
          </Button>
          <Button 
            onClick={() => (window.location.href = `/hotspot/login?org=${encodeURIComponent(orgId)}`)}
          >
            <Wifi className="h-4 w-4 mr-2" />
            Get Another Voucher
          </Button>
        </div>

        {/* Contact Information */}
        {organization && (
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Contact Information
            </h3>
            <div className="flex justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              {organization.phone && (
                <div className="flex items-center">
                  <span className="mr-1">📞</span>
                  {organization.phone}
                </div>
              )}
              {organization.email && (
                <div className="flex items-center">
                  <span className="mr-1">✉️</span>
                  {organization.email}
                </div>
              )}
              {organization.website && (
                <div className="flex items-center">
                  <span className="mr-1">🌐</span>
                  {organization.website}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Powered by ISPinnacle Hotspot System
        </div>
      </main>
    </div>
  );
}

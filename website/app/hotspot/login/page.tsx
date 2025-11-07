'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';
import { ModeToggle } from '@/components/ModeToggle';
import { hotspotConfig } from '@/lib/hotspot-config';
import { MissingOrgConfig } from '@/components/hotspot/missing-org-config';

interface Package {
  id: string;
  name: string;
  description: string | null;
  downloadSpeed: number;
  uploadSpeed: number;
  duration: number;
  durationType: string;
  price: number;
}

export default function HotspotLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgId = (searchParams.get('org') || hotspotConfig.defaultOrgId || '').trim();
  const hasOrgId = Boolean(orgId);
  const missingOrgMessage = 'Organization ID is required. Append ?org=... from MikroTik or set NEXT_PUBLIC_DEFAULT_ORG_ID.';
  const linkLoginOnly = searchParams.get('link-login-only') || '';
  const linkOrig = searchParams.get('link-orig') || '';
  const chapId = searchParams.get('chap-id') || '';
  const chapChallenge = searchParams.get('chap-challenge') || '';
  const existingVoucherParam =
    searchParams.get('voucher') ||
    searchParams.get('username') ||
    undefined;
  
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [showVoucherEntry, setShowVoucherEntry] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [voucherResult, setVoucherResult] = useState<{
    voucherCode: string;
    status: string;
    message: string;
  } | null>(null);

  const trpc = useTRPC();

  const extractErrorMessage = (error: unknown, fallback = 'Unable to validate voucher'): string => {
    try {
      if (error && typeof error === 'object') {
        const err = error as { message?: unknown; data?: { code?: unknown; message?: unknown } };
        if (typeof err.message === 'string') return err.message;
        const code = typeof err.data?.code === 'string' ? err.data.code : undefined;
        const dataMsg = typeof err.data?.message === 'string' ? err.data.message : undefined;
        switch (code) {
          case 'NOT_FOUND':
            return 'Invalid voucher code. Please check and try again.';
          case 'BAD_REQUEST':
            return dataMsg || 'Voucher is not usable at the moment.';
          case 'PRECONDITION_FAILED':
            return 'Voucher prerequisites not met.';
        }
      }
    } catch {}
    return fallback;
  };

  // Fetch organization details
  const organizationQuery = trpc.hotspot.getOrganization.queryOptions({ orgId });
  const { data: organizationData } = useQuery({
    ...organizationQuery,
    enabled: hasOrgId && (organizationQuery.enabled ?? true),
  });

  // Fetch packages
  const packagesQuery = trpc.hotspot.getPackages.queryOptions({ organizationId: orgId });
  const { data: packagesData, isLoading: isLoadingPackages } = useQuery({
    ...packagesQuery,
    enabled: hasOrgId && (packagesQuery.enabled ?? true),
  });

  // Immediately redirect connected users to status page
  useEffect(() => {
    if (!existingVoucherParam || !hasOrgId) return;

    let isMounted = true;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `/api/hotspot/voucher-status/${encodeURIComponent(existingVoucherParam)}?mode=code`
        );
        if (!response.ok) return;
        const data = await response.json();
        const voucher = data?.voucher;

        if (
          isMounted &&
          voucher &&
          voucher.status === 'ACTIVE' &&
          voucher.remainingDuration &&
          voucher.remainingDuration.milliseconds > 0
        ) {
          const url = new URL(`/hotspot/status`, window.location.origin);
          url.searchParams.set('org', orgId);
          url.searchParams.set('voucher', voucher.voucherCode);
          if (linkLoginOnly) url.searchParams.set('link-login-only', linkLoginOnly);
          if (linkOrig) url.searchParams.set('link-orig', linkOrig);
          if (chapId) url.searchParams.set('chap-id', chapId);
          if (chapChallenge) url.searchParams.set('chap-challenge', chapChallenge);
          router.replace(url.pathname + url.search);
        }
      } catch (error) {
        console.log('Hotspot redirect check skipped:', error);
      }
    };

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, [existingVoucherParam, orgId, hasOrgId, linkLoginOnly, linkOrig, chapId, chapChallenge, router]);

  // Purchase voucher mutation
  const { mutate: purchaseVoucher, isPending: isPurchasing } = useMutation(
    trpc.hotspot.purchaseVoucher.mutationOptions({
      onSuccess: (result) => {
        // Do NOT reveal voucher code until payment confirmed
        setVoucherResult({
          voucherCode: 'Waiting for payment confirmation...',
          status: 'pending',
          message: 'Please check your phone to complete the payment'
        });
        setShowPaymentForm(false);

        // Start polling for payment status with server-provided code
        pollPaymentStatus(result.voucherId, result.voucherCode);
      },
      onError: (error) => {
        console.error('Purchase error:', error);
        toast.error('Network error. Please try again.');
      }
    })
  );

  // Connect voucher mutation
  const { mutateAsync: connectVoucherAsync, isPending: isConnecting } = useMutation(
    trpc.hotspot.connectVoucher.mutationOptions({
      onSuccess: (result) => {
        if (result.voucher && result.voucher.remainingDuration) {
          const remaining = result.voucher.remainingDuration;
          const hours = Math.floor(remaining.milliseconds / (60 * 60 * 1000));
          const minutes = Math.floor((remaining.milliseconds % (60 * 60 * 1000)) / (60 * 1000));
          toast.success(`Voucher valid! Remaining time: ${hours}h ${minutes}m`);
        } else {
          toast.success('Voucher is valid!');
        }
        
        // Auto-login to MikroTik if parameters are available
        // We avoid showing the voucher code; attempt seamless connection
        // Note: actual submission occurs in attemptAutoLogin on payment confirmation
        toast.success('Voucher validated. Connecting...');
      },
      onError: (error) => {
        console.error('Connection error:', error);
        toast.error(extractErrorMessage(error));
      }
    })
  );

  // Minimal MD5 implementation (for MikroTik CHAP). Public-domain style utility.
  function md5(input: string): string {
    function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
      a = (((a + q) | 0) + ((x + t) | 0)) | 0;
      return (((a << s) | (a >>> (32 - s))) + b) | 0;
    }
    function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
    function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }
    function toBlocks(str: string) {
      const n = str.length;
      const blocks = new Array(((n + 8) >>> 6 << 4) + 16).fill(0);
      for (let i = 0; i < n; i++) blocks[i >> 2] |= str.charCodeAt(i) << ((i % 4) << 3);
      blocks[n >> 2] |= 0x80 << ((n % 4) << 3);
      blocks[(((n + 8) >>> 6) << 4) + 14] = n << 3;
      return blocks;
    }
    function hex(x: number) {
      let s = "";
      for (let i = 0; i < 4; i++) s += ("0" + (((x >> (i * 8)) & 255) as number).toString(16)).slice(-2);
      return s;
    }
    const x = toBlocks(input);
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, x[i + 0], 7, -680876936); d = ff(d, a, b, c, x[i + 1], 12, -389564586); c = ff(c, d, a, b, x[i + 2], 17, 606105819); b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, x[i + 4], 7, -176418897); d = ff(d, a, b, c, x[i + 5], 12, 1200080426); c = ff(c, d, a, b, x[i + 6], 17, -1473231341); b = ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = ff(a, b, c, d, x[i + 8], 7, 1770035416); d = ff(d, a, b, c, x[i + 9], 12, -1958414417); c = ff(c, d, a, b, x[i + 10], 17, -42063); b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, x[i + 12], 7, 1804603682); d = ff(d, a, b, c, x[i + 13], 12, -40341101); c = ff(c, d, a, b, x[i + 14], 17, -1502002290); b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, x[i + 1], 5, -165796510); d = gg(d, a, b, c, x[i + 6], 9, -1069501632); c = gg(c, d, a, b, x[i + 11], 14, 643717713); b = gg(b, c, d, a, x[i + 0], 20, -373897302);
      a = gg(a, b, c, d, x[i + 5], 5, -701558691); d = gg(d, a, b, c, x[i + 10], 9, 38016083); c = gg(c, d, a, b, x[i + 15], 14, -660478335); b = gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = gg(a, b, c, d, x[i + 9], 5, 568446438); d = gg(d, a, b, c, x[i + 14], 9, -1019803690); c = gg(c, d, a, b, x[i + 3], 14, -187363961); b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, x[i + 13], 5, -1444681467); d = gg(d, a, b, c, x[i + 2], 9, -51403784); c = gg(c, d, a, b, x[i + 7], 14, 1735328473); b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, x[i + 5], 4, -378558); d = hh(d, a, b, c, x[i + 8], 11, -2022574463); c = hh(c, d, a, b, x[i + 11], 16, 1839030562); b = hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = hh(a, b, c, d, x[i + 1], 4, -1530992060); d = hh(d, a, b, c, x[i + 4], 11, 1272893353); c = hh(c, d, a, b, x[i + 7], 16, -155497632); b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = ii(a, b, c, d, x[i + 0], 6, 681279174); d = ii(d, a, b, c, x[i + 7], 10, -358537222); c = ii(c, d, a, b, x[i + 14], 15, -722521979); b = ii(b, c, d, a, x[i + 5], 21, 76029189);
      a = ii(a, b, c, d, x[i + 12], 6, -640364487); d = ii(d, a, b, c, x[i + 3], 10, -421815835); c = ii(c, d, a, b, x[i + 10], 15, 530742520); b = ii(b, c, d, a, x[i + 1], 21, -995338651);
      a = (a + oa) | 0; b = (b + ob) | 0; c = (c + oc) | 0; d = (d + od) | 0;
    }
    return hex(a) + hex(b) + hex(c) + hex(d);
  }

  const computeChapResponse = (password: string) => {
    if (!chapId || !chapChallenge) return null;
    // MikroTik: response = 00 + MD5(chap-id + password + chap-challenge)
    const hash = md5(chapId + password + chapChallenge);
    return '00' + hash;
  };

  const attemptAutoLogin = async (code: string, alreadyValidated: boolean = false) => {
    if (!hasOrgId) {
      toast.error(missingOrgMessage);
      return;
    }
    try {
      // Validate voucher on server (also returns remaining time) unless already validated
      if (!alreadyValidated) {
        await connectVoucherAsync({ voucherCode: code });
      }

      if (!linkLoginOnly) return; // Nothing to submit to if not on MikroTik flow

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = linkLoginOnly;

      const responseHash = computeChapResponse(code);
      const fields: Record<string, string> = {
        username: code,
        password: responseHash ? '' : code,
        response: responseHash || '',
        dst: linkOrig || '',
        popup: 'true',
      };
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();

      // After submitting to MikroTik, navigate to our status page with voucher param
      // Delay slightly to give MikroTik time to accept the login.
      setTimeout(() => {
        try {
          const url = `/hotspot/status?org=${encodeURIComponent(orgId)}&voucher=${encodeURIComponent(code)}`;
          window.location.href = url;
        } catch {}
      }, 1200);
    } catch (e) {
      console.error('Auto login failed:', e);
      toast.error('Connection failed. Use voucher code to connect manually.');
    }
  };

  // Normalize Kenyan phone numbers
  const normalizeKenyanPhoneNumber = (input: string): string | null => {
    if (!input) return null;
    let digits = input.replace(/[^0-9+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);

    if (digits.startsWith('254')) {
      if (digits.length === 12) return digits;
      if (digits.length > 12 && /^(2547|2541)\d{8}/.test(digits.slice(0, 12))) {
        return digits.slice(0, 12);
      }
      return null;
    }

    if (digits.startsWith('0') && digits.length === 10 && (/^07\d{8}$/.test(digits) || /^01\d{8}$/.test(digits))) {
      return '254' + digits.slice(1);
    }

    if (digits.length === 9 && (/^7\d{8}$/.test(digits) || /^1\d{8}$/.test(digits))) {
      return '254' + digits;
    }

    return null;
  };

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


  // Purchase voucher
  const handlePurchaseVoucher = async () => {
    if (!hasOrgId) {
      toast.error(missingOrgMessage);
      return;
    }
    if (!selectedPackageId) {
      toast.error('Please select a package first');
      return;
    }

    const normalizedPhone = normalizeKenyanPhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      toast.error('Invalid phone number. Use 07XXXXXXXX, 01XXXXXXXX or 2547XXXXXXXX');
      return;
    }

    purchaseVoucher({
      organizationId: orgId,
      packageId: selectedPackageId,
      phoneNumber: normalizedPhone
    });
  };

  // Poll payment status
  const pollPaymentStatus = async (voucherId: string, voucherCode: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/hotspot/voucher-status/${voucherId}`);
        const data = await response.json();

        if (data.voucher && data.voucher.status === 'ACTIVE') {
          setVoucherResult({
            voucherCode: voucherCode,
            status: 'active',
            message: 'Payment successful! You can now connect.'
          });
          // Attempt auto-login to MikroTik if context is available
          attemptAutoLogin(voucherCode);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000);
        } else {
          setVoucherResult({
            voucherCode: voucherCode,
            status: 'timeout',
            message: 'Payment confirmation timeout. Please check your phone for the voucher code.'
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
        setVoucherResult({
          voucherCode: voucherCode,
          status: 'error',
          message: 'Error checking payment status. Please use the voucher code below to connect manually.'
        });
      }
    };

    poll();
  };

  // Connect with voucher
  const handleConnectVoucher = async () => {
    if (!hasOrgId) {
      toast.error(missingOrgMessage);
      return;
    }
    if (!voucherCode) {
      toast.error('Please enter the voucher code');
      return;
    }
    try {
      await connectVoucherAsync({ voucherCode });
      // After successful validation, attempt auto-login to MikroTik
      await attemptAutoLogin(voucherCode, true);
    } catch (e) {
      console.error('Connection error:', e);
      toast.error(extractErrorMessage(e));
    }
  };

  const organization = organizationData?.organization;
  const packages = packagesData?.packages || [];

  if (!hasOrgId) {
    return <MissingOrgConfig page="login" />;
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
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">Theme</span>
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Wifi className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to {organization?.name || 'ISPinnacle'} Hotspot
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {organization?.description || 'High-speed internet access'}
          </p>
        </div>

        {/* Package Selection */}
        {!showVoucherEntry && !showPaymentForm && !voucherResult && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Select an Internet Package
              </h3>
            </div>

            {isLoadingPackages ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading packages...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg: Package) => (
                  <Card 
                    key={pkg.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      setShowPaymentForm(true);
                    }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {pkg.name}
                        <Badge variant="secondary">KES {pkg.price}</Badge>
                      </CardTitle>
                      {pkg.description && (
                        <CardDescription>{pkg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Wifi className="h-4 w-4 mr-2" />
                          {pkg.downloadSpeed} Mbps
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2" />
                          {pkg.duration} {formatDurationUnit(pkg.durationType, pkg.duration)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => setShowVoucherEntry(true)}
                className="inline-flex items-center"
              >
                <span className="mr-2">🎟️</span>
                I already have a voucher
              </Button>
            </div>
          </div>
        )}

        {/* Payment Form */}
        {showPaymentForm && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>
                Enter your phone number to receive payment instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="e.g. 07XXXXXXXX or 2547XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  maxLength={13}
                />
              </div>
              <Button 
                onClick={handlePurchaseVoucher} 
                disabled={isPurchasing}
                className="w-full"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 mr-2" />
                    Pay & Get Voucher
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowPaymentForm(false)}
                className="w-full"
              >
                Back to Packages
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Voucher Entry */}
        {showVoucherEntry && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Enter Your Voucher</CardTitle>
              <CardDescription>
                Enter your voucher code to connect to the internet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Voucher Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter voucher code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleConnectVoucher} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowVoucherEntry(false)}
                className="w-full"
              >
                Back to Packages
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Voucher Result */}
        {voucherResult && (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Your Voucher</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Voucher Code</p>
                  <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                    {voucherResult.voucherCode}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {voucherResult.message}
                </p>
              </div>
              {voucherResult.status === 'active' && (
                <Button 
                  onClick={() => {
                    setVoucherCode(voucherResult.voucherCode);
                    setShowVoucherEntry(true);
                    setVoucherResult(null);
                  }}
                  className="w-full"
                >
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect Now
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => {
                  setVoucherResult(null);
                  setShowPaymentForm(false);
                  setShowVoucherEntry(false);
                }}
                className="w-full"
              >
                Back to Packages
              </Button>
            </CardContent>
          </Card>
        )}

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

'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wifi, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import Image from 'next/image';

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
  const orgId = searchParams.get('org') || 'cmfc3c2fa0001kwyk82la4cw7';
  
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

  // Fetch organization details
  const { data: organizationData } = useQuery(
    trpc.hotspot.getOrganization.queryOptions({ orgId })
  );

  // Fetch packages
  const { data: packagesData, isLoading: isLoadingPackages } = useQuery(
    trpc.hotspot.getPackages.queryOptions({ organizationId: orgId })
  );

  // Purchase voucher mutation
  const { mutate: purchaseVoucher, isPending: isPurchasing } = useMutation(
    trpc.hotspot.purchaseVoucher.mutationOptions({
      onSuccess: (result) => {
        setVoucherResult({
          voucherCode: result.voucherCode || 'Waiting for payment confirmation...',
          status: 'pending',
          message: 'Please check your phone to complete the payment'
        });
        setShowPaymentForm(false);
        
        // Start polling for payment status
        pollPaymentStatus(result.voucherId, result.voucherCode);
      },
      onError: (error) => {
        console.error('Purchase error:', error);
        toast.error('Network error. Please try again.');
      }
    })
  );

  // Connect voucher mutation
  const { mutate: connectVoucher, isPending: isConnecting } = useMutation(
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
        
        // Redirect to MikroTik login (this would be handled by your router)
        // For now, we'll just show success
        toast.success('Please use this voucher code to connect to the hotspot');
      },
      onError: (error) => {
        console.error('Connection error:', error);
        toast.error('Network error. Please try again.');
      }
    })
  );

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
    if (!voucherCode) {
      toast.error('Please enter the voucher code');
      return;
    }

    connectVoucher({ voucherCode });
  };

  const organization = organizationData?.organization;
  const packages = packagesData?.packages || [];

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
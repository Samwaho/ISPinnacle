'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wifi, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useTRPC } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';


export default function HotspotLogoutPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('org') || 'cmfc3c2fa0001kwyk82la4cw7';
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  const trpc = useTRPC();

  // Fetch organization details
  const { data: organizationData } = useQuery(
    trpc.hotspot.getOrganization.queryOptions({ orgId })
  );

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      // Simulate logout process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsLoggedOut(true);
      toast.success('Successfully disconnected from hotspot');
      
      // Redirect to login page after 3 seconds
      setTimeout(() => {
        window.location.href = `/hotspot/login?org=${orgId}`;
      }, 3000);
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error disconnecting. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const organization = organizationData?.organization;

  if (isLoggedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
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
              <CardTitle className="text-center text-green-600 dark:text-green-400">
                Successfully Disconnected
              </CardTitle>
              <CardDescription className="text-center">
                You have been disconnected from the hotspot network.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <LogOut className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Redirecting to login page in 3 seconds...
              </p>
              <Button 
                onClick={() => window.location.href = `/hotspot/login?org=${orgId}`}
                className="w-full"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
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
            Disconnect from Hotspot
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {organization?.description || 'High-speed internet access'}
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-center">Confirm Logout</CardTitle>
            <CardDescription className="text-center">
              Are you sure you want to disconnect from the hotspot network?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                You will lose internet access after disconnecting.
              </p>
            </div>
            
            <Button 
              onClick={handleLogout} 
              disabled={isLoggingOut}
              variant="destructive"
              className="w-full"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.location.href = `/hotspot/status?org=${orgId}`}
              className="w-full"
              disabled={isLoggingOut}
            >
              <Wifi className="h-4 w-4 mr-2" />
              Stay Connected
            </Button>
          </CardContent>
        </Card>

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
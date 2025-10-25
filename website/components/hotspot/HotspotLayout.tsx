'use client';

import { ReactNode } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Organization {
  id: string;
  name: string;
  description?: string;
  business?: {
    logo?: string;
    banner?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

interface HotspotLayoutProps {
  children: ReactNode;
  organization?: Organization | null;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  showContactInfo?: boolean;
}

export function HotspotLayout({ 
  children, 
  organization, 
  title, 
  subtitle, 
  icon,
  showContactInfo = true 
}: HotspotLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {organization?.business?.logo && (
                <Image 
                  src={organization.business.logo} 
                  alt={organization?.name || 'Organization logo'} 
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded object-cover"
                  priority
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
              {icon}
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>

        {children}

        {/* Contact Information */}
        {showContactInfo && organization?.contact && (
          <Card className="mt-12">
            <CardHeader>
              <CardTitle>About {organization.name}</CardTitle>
              {organization.description && (
                <CardDescription>{organization.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {organization.business?.banner && (
                <div className="mb-4 relative w-full h-32">
                  <Image 
                    src={organization.business.banner} 
                    alt={`${organization?.name || 'Organization'} banner`}
                    fill
                    className="rounded-lg object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 50vw"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {organization.contact.phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="mr-2">📞</span>
                    {organization.contact.phone}
                  </div>
                )}
                {organization.contact.email && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="mr-2">✉️</span>
                    {organization.contact.email}
                  </div>
                )}
                {organization.contact.website && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <span className="mr-2">🌐</span>
                    {organization.contact.website}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Powered by ISPinnacle Hotspot System
        </div>
      </main>
    </div>
  );
}

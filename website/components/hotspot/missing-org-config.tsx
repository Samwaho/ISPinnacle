'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MissingOrgConfigProps {
  page: string;
}

export function MissingOrgConfig({ page }: MissingOrgConfigProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Hotspot Not Configured
          </CardTitle>
          <CardDescription>
            We couldn&apos;t determine the organization ID required for the {page} experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <p>
            Ensure the MikroTik portal appends an <code>?org=YOUR_ORG_ID</code> parameter when redirecting here, or
            set the build-time environment variable <code>NEXT_PUBLIC_DEFAULT_ORG_ID</code>.
          </p>
          <p>
            Each MikroTik device can define its own organization ID inside <code>hotspot/config.js</code> so the
            shared Next.js site remains tenancy-agnostic.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

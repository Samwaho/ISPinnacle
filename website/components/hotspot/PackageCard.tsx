'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, Clock, Smartphone, DollarSign } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  description?: string;
  downloadSpeed: number;
  uploadSpeed: number;
  duration: number;
  durationType: string;
  dataLimit?: number;
  dataLimitUnit?: string;
  price: number;
}

interface PackageCardProps {
  package: Package;
  onSelect: (packageId: string) => void;
}

// Format duration unit (singular/plural)
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

// Format data size with appropriate units
const formatDataSize = (value: number, unit: string): string => {
  if (unit === 'MB' && value >= 1000) {
    return `${(value / 1000).toFixed(1)} GB`;
  }
  return `${value} ${unit}`;
};

export function PackageCard({ package: pkg, onSelect }: PackageCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onSelect(pkg.id)}
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
          {pkg.dataLimit && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Smartphone className="h-4 w-4 mr-2" />
              {formatDataSize(pkg.dataLimit, pkg.dataLimitUnit || 'MB')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

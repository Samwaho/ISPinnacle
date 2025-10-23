'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface VoucherInfo {
  voucherCode: string;
  status: string;
  remainingDuration?: {
    milliseconds: number;
  };
}

interface VoucherStatusProps {
  voucherInfo: VoucherInfo;
  onConnect?: () => void;
  onBack?: () => void;
}

// Format remaining duration for display
const formatRemainingDuration = (remainingMs: number): string => {
  if (!remainingMs || remainingMs <= 0) {
    return 'Expired';
  }
  
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((remainingMs % (60 * 1000)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

export function VoucherStatus({ voucherInfo, onConnect, onBack }: VoucherStatusProps) {
  const getStatusIcon = () => {
    switch (voucherInfo.status) {
      case 'ACTIVE':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'EXPIRED':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'PENDING':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    switch (voucherInfo.status) {
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900';
      case 'EXPIRED':
        return 'bg-red-100 dark:bg-red-900';
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900';
      default:
        return 'bg-gray-100 dark:bg-gray-900';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {getStatusIcon()}
          <span className="ml-2">Voucher Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className={`${getStatusColor()} rounded-lg p-4 mb-4`}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Voucher Code</p>
            <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
              {voucherInfo.voucherCode}
            </p>
          </div>
          
          <div className="flex justify-center mb-4">
            <Badge variant={voucherInfo.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {voucherInfo.status}
            </Badge>
          </div>

          {voucherInfo.remainingDuration && (
            <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400 mb-4">
              <Clock className="h-4 w-4 mr-2" />
              <span className="font-medium">Remaining Time:</span>
              <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">
                {formatRemainingDuration(voucherInfo.remainingDuration.milliseconds)}
              </span>
            </div>
          )}
        </div>

        {voucherInfo.status === 'ACTIVE' && onConnect && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your voucher is active and ready to use!
            </p>
          </div>
        )}

        {voucherInfo.status === 'PENDING' && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Payment is being processed. Please wait for confirmation.
            </p>
          </div>
        )}

        {voucherInfo.status === 'EXPIRED' && (
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This voucher has expired and can no longer be used.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

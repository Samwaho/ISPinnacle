'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, Download, Upload, Clock, LogOut } from 'lucide-react';

interface ConnectionInfo {
  ip?: string;
  uptime?: string;
  bytesIn?: string;
  bytesOut?: string;
  sessionTimeLeft?: string;
}

interface VoucherInfo {
  voucherCode: string;
  status: string;
  remainingDuration?: {
    milliseconds: number;
  };
}

interface ConnectionStatusProps {
  connectionInfo: ConnectionInfo;
  voucherInfo?: VoucherInfo;
  onRefresh?: () => void;
  onLogout?: () => void;
  isRefreshing?: boolean;
}

// Format bytes
const formatBytes = (bytes: string): string => {
  const numBytes = parseFloat(bytes.replace(/[^\d.]/g, ''));
  if (isNaN(numBytes)) return bytes;
  
  if (numBytes >= 1024 * 1024 * 1024) {
    return `${(numBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (numBytes >= 1024 * 1024) {
    return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (numBytes >= 1024) {
    return `${(numBytes / 1024).toFixed(2)} KB`;
  }
  return `${numBytes.toFixed(2)} B`;
};

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

export function ConnectionStatus({ 
  connectionInfo, 
  voucherInfo, 
  onRefresh, 
  onLogout, 
  isRefreshing = false 
}: ConnectionStatusProps) {
  return (
    <div className="space-y-6">
      {/* Connection Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wifi className="h-5 w-5 mr-2" />
            Connection Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">IP Address</span>
                <span className="text-sm font-mono text-gray-900 dark:text-white">
                  {connectionInfo.ip || 'Not available'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected Time</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {connectionInfo.uptime || 'Not available'}
                </span>
              </div>

              {connectionInfo.sessionTimeLeft && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Session Time Left</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {connectionInfo.sessionTimeLeft}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Download className="h-4 w-4 mr-1" />
                  Data Downloaded
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatBytes(connectionInfo.bytesIn || '0')}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
                  <Upload className="h-4 w-4 mr-1" />
                  Data Uploaded
                </span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatBytes(connectionInfo.bytesOut || '0')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voucher Information */}
      {voucherInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Voucher Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Voucher Code</span>
                  <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {voucherInfo.voucherCode}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</span>
                  <Badge variant={voucherInfo.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {voucherInfo.status}
                  </Badge>
                </div>
              </div>

              {voucherInfo.remainingDuration && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Remaining Time</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formatRemainingDuration(voucherInfo.remainingDuration.milliseconds)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isRefreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </button>
        )}
        
        {onLogout && (
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

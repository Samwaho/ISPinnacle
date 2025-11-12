// Hotspot Configuration
export const hotspotConfig = {
  // API base URL
  apiUrl: 'https://ispinnacle.co.ke',
  
  // Payment polling configuration
  paymentPolling: {
    maxAttempts: 30, // 5 minutes total (10 seconds * 30)
    interval: 10000, // 10 seconds
  },
  
  // Session timeout configuration
  sessionTimeout: {
    defaultIdleTimeout: 1800, // 30 minutes in seconds
  },
  
  // Phone number validation
  phoneValidation: {
    // Kenyan phone number patterns
    patterns: [
      /^2547\d{8}$/, // 2547XXXXXXXX
      /^2541\d{8}$/, // 2541XXXXXXXX
      /^07\d{8}$/,   // 07XXXXXXXX
      /^01\d{8}$/,   // 01XXXXXXXX
      /^7\d{8}$/,    // 7XXXXXXXX
      /^1\d{8}$/,    // 1XXXXXXXX
    ],
  },
  
  // Voucher configuration
  voucher: {
    codeLength: 8,
    expiryDays: 30, // Vouchers expire after 30 days if not used
  },
  
  // UI configuration
  ui: {
    theme: {
      default: 'light',
      allowToggle: true,
    },
    animations: {
      enabled: true,
      duration: 300,
    },
  },
  
  // MikroTik integration
  mikrotik: {
    // CHAP authentication support
    chapEnabled: true,
    // Default hotspot profile
    defaultProfile: 'default',
  },
  
  // Error messages
  messages: {
    networkError: 'Network error. Please try again.',
    invalidVoucher: 'Invalid voucher code. Please check and try again.',
    voucherExpired: 'Voucher has expired.',
    voucherInactive: 'Voucher is not active.',
    paymentTimeout: 'Payment confirmation timeout. Please check your phone for the voucher code.',
    invalidPhone: 'Invalid phone number. Use 07XXXXXXXX, 01XXXXXXXX or 2547XXXXXXXX.',
    packageNotFound: 'Package not found.',
    organizationNotFound: 'Organization not found.',
  },
};

// Helper functions for hotspot functionality
export const hotspotUtils = {
  // Normalize Kenyan phone numbers
  normalizePhoneNumber: (input: string): string | null => {
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
  },

  // Format duration unit (singular/plural)
  formatDurationUnit: (unit: string, value: number): string => {
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
  },

  // Format data size with appropriate units
  formatDataSize: (value: number, unit: string): string => {
    if (unit === 'MB' && value >= 1000) {
      return `${(value / 1000).toFixed(1)} GB`;
    }
    return `${value} ${unit}`;
  },

  // Format remaining duration for display
  formatRemainingDuration: (remainingMs: number): string => {
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
  },

  // Format bytes
  formatBytes: (bytes: string): string => {
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
  },

  // Generate voucher code
  generateVoucherCode: (): string => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  },

  // Calculate voucher expiry date
  calculateVoucherExpiry: (days: number = hotspotConfig.voucher.expiryDays): Date => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    return expiry;
  },

  // Validate voucher code format
  validateVoucherCode: (code: string): boolean => {
    return /^[A-Z0-9]{8}$/.test(code);
  },

  // Get organization ID from URL (required for hotspot pages)
  getOrganizationId: (searchParams: URLSearchParams): string => {
    return searchParams.get('org') || '';
  },
};

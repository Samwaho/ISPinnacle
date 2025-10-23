import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Helper function to convert duration to milliseconds
function getDurationInMs(durationType: string): number {
  switch (durationType) {
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
      return 60 * 60 * 1000; // Default to 1 hour
  }
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Origin, Referer, Pragma, If-Modified-Since, If-None-Match',
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voucherCode } = body;

    console.log('Connect endpoint called with voucherCode:', voucherCode);
    console.log('VoucherCode type:', typeof voucherCode);
    console.log('VoucherCode length:', voucherCode?.length);
    console.log('VoucherCode trimmed:', voucherCode?.trim());

    if (!voucherCode) {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Find voucher by code (trim whitespace)
    const trimmedVoucherCode = voucherCode.trim();
    console.log('Searching for voucher with code:', trimmedVoucherCode);
    
    let voucher = await prisma.hotspotVoucher.findUnique({
      where: { voucherCode: trimmedVoucherCode },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            duration: true,
            durationType: true,
            downloadSpeed: true,
            uploadSpeed: true,
            maxDevices: true,
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!voucher) {
      console.log('Voucher not found for code:', trimmedVoucherCode);
      // Try case-insensitive search as fallback
      console.log('Trying case-insensitive search...');
      voucher = await prisma.hotspotVoucher.findFirst({
        where: { 
          voucherCode: {
            equals: trimmedVoucherCode,
            mode: 'insensitive'
          }
        },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              duration: true,
              durationType: true,
              downloadSpeed: true,
              uploadSpeed: true,
              maxDevices: true,
            }
          },
          organization: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });
      
      if (!voucher) {
        console.log('Voucher still not found after case-insensitive search');
        return NextResponse.json(
          { error: 'Invalid voucher code' },
          { status: 404, headers: CORS_HEADERS }
        );
      }
    }

    console.log('Voucher found:', {
      id: voucher.id,
      voucherCode: voucher.voucherCode,
      status: voucher.status,
      expiresAt: voucher.expiresAt
    });

    // Check voucher status
    if (voucher.status === 'USED') {
      return NextResponse.json(
        { error: 'Voucher has already been used' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (voucher.status === 'EXPIRED' || voucher.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Voucher is no longer valid' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (voucher.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Payment is still pending. Please wait for payment confirmation.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Check if voucher has expired
    const now = new Date();
    if (voucher.expiresAt < now) {
      await prisma.hotspotVoucher.update({
        where: { id: voucher.id },
        data: { status: 'EXPIRED' }
      });

      return NextResponse.json(
        { error: 'Voucher has expired' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Note: We don't mark the voucher as used here because the RADIUS controller
    // will handle the authentication and mark it as used when the customer actually connects.
    // This allows the voucher to be used for the actual RADIUS authentication.

    // Calculate remaining duration if voucher has been used
    let remainingDuration = null;
    if (voucher.lastUsedAt && voucher.package) {
      const durationMs = getDurationInMs(voucher.package.durationType);
      const totalDurationMs = durationMs * voucher.package.duration;
      const timeSinceFirstUse = new Date().getTime() - voucher.lastUsedAt.getTime();
      const remainingMs = Math.max(0, totalDurationMs - timeSinceFirstUse);
      
      if (remainingMs > 0) {
        remainingDuration = {
          milliseconds: remainingMs,
          hours: Math.floor(remainingMs / (60 * 60 * 1000)),
          minutes: Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)),
          seconds: Math.floor((remainingMs % (60 * 1000)) / 1000)
        };
      }
    }

    // Transform package data to match expected format
    const packageData = {
      id: voucher.package.id,
      name: voucher.package.name,
      description: voucher.package.description,
      price: voucher.package.price,
      duration: voucher.package.duration,
      durationUnit: voucher.package.durationType.toLowerCase() + (voucher.package.duration > 1 ? 's' : ''),
      downloadSpeed: voucher.package.downloadSpeed,
      uploadSpeed: voucher.package.uploadSpeed,
      maxDevices: voucher.package.maxDevices,
    };

    return NextResponse.json({
      success: true,
      message: 'Voucher validated successfully. You can now connect using this voucher code.',
      voucher: {
        id: voucher.id,
        voucherCode: voucher.voucherCode,
        status: voucher.status,
        package: packageData,
        organization: voucher.organization,
        remainingDuration: remainingDuration,
        lastUsedAt: voucher.lastUsedAt,
      }
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error connecting with voucher:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}


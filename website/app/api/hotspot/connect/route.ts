import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

    if (!voucherCode) {
      return NextResponse.json(
        { error: 'Voucher code is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Find voucher by code
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { voucherCode },
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
      return NextResponse.json(
        { error: 'Invalid voucher code' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

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


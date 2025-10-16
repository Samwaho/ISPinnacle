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


export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voucherId } = await context.params;

    if (!voucherId) {
      return NextResponse.json(
        { error: 'Voucher ID is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Fetch voucher details
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id: voucherId },
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
        { error: 'Voucher not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Check if voucher has expired
    const now = new Date();
    if (voucher.expiresAt < now && voucher.status === 'PENDING') {
      await prisma.hotspotVoucher.update({
        where: { id: voucherId },
        data: { status: 'EXPIRED' }
      });
      voucher.status = 'EXPIRED';
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
      voucher: {
        id: voucher.id,
        voucherCode: voucher.voucherCode,
        phoneNumber: voucher.phoneNumber,
        amount: voucher.amount,
        status: voucher.status,
        expiresAt: voucher.expiresAt,
        usedAt: voucher.usedAt,
        paymentGateway: voucher.paymentGateway,
        createdAt: voucher.createdAt,
        package: packageData,
        organization: voucher.organization,
      }
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error fetching voucher status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

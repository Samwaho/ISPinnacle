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


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organization_id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Fetch hotspot packages for the organization
    const packages = await prisma.organizationPackage.findMany({
      where: {
        organizationId: organizationId,
        type: 'HOTSPOT',
        isActive: true,
      },
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
      },
      orderBy: {
        price: 'asc',
      }
    });

    // Transform packages to match the expected format
    const transformedPackages = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      duration: pkg.duration,
      durationUnit: pkg.durationType.toLowerCase() + (pkg.duration > 1 ? 's' : ''),
      downloadSpeed: pkg.downloadSpeed,
      uploadSpeed: pkg.uploadSpeed,
      maxDevices: pkg.maxDevices,
    }));

    return NextResponse.json({
      packages: transformedPackages
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

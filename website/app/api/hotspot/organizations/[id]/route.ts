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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Fetch organization details with related data
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        logo: true,
        description: true,
        website: true,
        paymentGateway: true,
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Transform the data to match the expected format
    const response = {
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        logo: organization.logo,
        description: organization.description,
        website: organization.website,
        paymentGateway: organization.paymentGateway,
        business: {
          logo: organization.logo,
          banner: null,
          name: organization.name,
          description: organization.description,
        },
        contact: {
          phone: organization.phone,
          email: organization.email,
          website: organization.website,
        }
      }
    };

    return NextResponse.json(response, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error fetching organization details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

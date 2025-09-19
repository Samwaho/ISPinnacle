import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MpesaAPI } from '@/trpc/routers/mpesa';
import { KopoKopoAPI } from '@/trpc/routers/kopokopo';
import { PaymentGateway } from '@/lib/generated/prisma';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, X-Requested-With, Accept, Origin, Referer, Pragma, If-Modified-Since, If-None-Match',
  'Access-Control-Max-Age': '86400',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}



// Generate a unique voucher code
function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, packageId, phoneNumber } = body;

    // Validate required fields
    if (!organizationId || !packageId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Organization ID, package ID, and phone number are required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Fetch organization and package details
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        mpesaConfiguration: true,
        kopokopoConfiguration: true,
      }
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const packageData = await prisma.organizationPackage.findUnique({
      where: { id: packageId }
    });

    if (!packageData) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Determine payment gateway
    const paymentGateway = organization.paymentGateway;
    if (!paymentGateway) {
      return NextResponse.json(
        { error: 'No payment gateway configured for this organization' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Generate voucher code
    let voucherCode: string;
    let isUnique = false;
    let attempts = 0;

    do {
      voucherCode = generateVoucherCode();
      const existingVoucher = await prisma.hotspotVoucher.findUnique({
        where: { voucherCode }
      });
      isUnique = !existingVoucher;
      attempts++;
    } while (!isUnique && attempts < 10);

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique voucher code' },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create voucher record
    const voucher = await prisma.hotspotVoucher.create({
      data: {
        organizationId,
        packageId,
        voucherCode,
        phoneNumber,
        amount: packageData.price,
        status: 'PENDING',
        expiresAt,
        paymentGateway,
      }
    });

    let paymentResult: {
      checkoutRequestId?: string;
      merchantRequestId?: string;
      location?: string;
    } = {};
    let paymentReference: string | undefined = undefined;

    try {
      // Initiate payment based on gateway
      if (paymentGateway === PaymentGateway.MPESA) {
        if (!organization.mpesaConfiguration) {
          throw new Error('M-Pesa configuration not found');
        }

        const mpesaAPI = new MpesaAPI({
          consumerKey: organization.mpesaConfiguration.consumerKey,
          consumerSecret: organization.mpesaConfiguration.consumerSecret,
          shortCode: organization.mpesaConfiguration.shortCode,
          passKey: organization.mpesaConfiguration.passKey,
          transactionType: organization.mpesaConfiguration.transactionType,
        });

        // Use the original callback URL - the callback handler will check for hotspot vouchers
        const result = await mpesaAPI.initiateSTKPush(
          phoneNumber,
          packageData.price,
          voucherCode,
          `Hotspot voucher for ${packageData.name}`
        );

        paymentResult = {
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID,
        };
        paymentReference = result.CheckoutRequestID;

      } else if (paymentGateway === PaymentGateway.KOPOKOPO) {
        if (!organization.kopokopoConfiguration) {
          throw new Error('KopoKopo configuration not found');
        }

        const k2API = new KopoKopoAPI({
          clientId: organization.kopokopoConfiguration.clientId,
          clientSecret: organization.kopokopoConfiguration.clientSecret,
          apiKey: organization.kopokopoConfiguration.apiKey,
          tillNumber: organization.kopokopoConfiguration.tillNumber,
        });

        // For KopoKopo, we need to modify the callback URL
        // We'll need to update the KopoKopoAPI to accept custom callback URL
        const result = await k2API.initiateIncomingPayment({
          phoneNumber,
          amount: packageData.price,
          reference: voucherCode,
          description: `Hotspot voucher for ${packageData.name}`,
        });

        paymentResult = {
          location: result.location || undefined,
        };
        paymentReference = result.location || undefined;
      }

      // Update voucher with payment reference
      await prisma.hotspotVoucher.update({
        where: { id: voucher.id },
        data: { paymentReference }
      });

    } catch (paymentError) {
      console.error('Payment initiation failed:', paymentError);

      // Update voucher status to cancelled
      await prisma.hotspotVoucher.update({
        where: { id: voucher.id },
        data: { status: 'CANCELLED' }
      });

      return NextResponse.json(
        {
          error: 'Payment initiation failed',
          detail: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      voucherId: voucher.id,
      voucherCode: voucherCode,
      paymentMethod: paymentGateway.toLowerCase(),
      paymentResult,
      message: 'Payment initiated successfully. Please check your phone to complete the payment.',
    }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('Error purchasing voucher:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

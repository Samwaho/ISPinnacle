import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { VoucherStatus } from '@/lib/generated/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the callback for debugging
    console.log('Hotspot KopoKopo Callback received:', JSON.stringify(body, null, 2));

    // Extract the callback data
    const {
      event_type,
      resource,
    } = body;

    // Validate required fields
    if (!event_type || !resource) {
      console.error("Missing required fields in KopoKopo callback");
      return NextResponse.json(
        { success: false, message: "Missing required fields in callback" },
        { status: 400 }
      );
    }

    // Handle incoming payment events
    if (event_type === 'incoming_payment.completed') {
      const {
        id,
        reference,
        amount,
        currency,
        status,
        created_at,
        updated_at,
      } = resource;

      if (!reference) {
        console.error("Missing reference in KopoKopo callback");
        return NextResponse.json(
          { success: false, message: "Missing reference in callback" },
          { status: 400 }
        );
      }

      // Find voucher by payment reference
      const voucher = await prisma.hotspotVoucher.findFirst({
        where: { paymentReference: reference },
        include: {
          package: true,
          organization: true,
        }
      });

      if (!voucher) {
        console.error("Voucher not found for reference:", reference);
        return NextResponse.json(
          { success: false, message: "Voucher not found" },
          { status: 404 }
        );
      }

      // Update voucher status based on payment status
      if (status === 'Success') {
        await prisma.hotspotVoucher.update({
          where: { id: voucher.id },
          data: { 
            status: VoucherStatus.ACTIVE,
            paymentReference: id, // Update with actual payment ID
          }
        });

        console.log(`Hotspot voucher activated via KopoKopo. Voucher ID: ${voucher.id}, Payment ID: ${id}`);
      } else {
        await prisma.hotspotVoucher.update({
          where: { id: voucher.id },
          data: { status: VoucherStatus.CANCELLED }
        });

        console.log(`Hotspot voucher payment failed via KopoKopo. Voucher ID: ${voucher.id}, Status: ${status}`);
      }

      return NextResponse.json({
        success: true,
        message: 'Hotspot voucher callback processed successfully',
        voucherId: voucher.id,
        paymentId: id,
        status: status
      });
    }

    // Handle other event types if needed
    console.log(`Unhandled KopoKopo event type: ${event_type}`);
    return NextResponse.json({
      success: true,
      message: `Event type ${event_type} received but not processed`,
    });

  } catch (error) {
    console.error('Error processing hotspot KopoKopo callback:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'Hotspot KopoKopo callback endpoint is working',
    timestamp: new Date().toISOString(),
  });
}

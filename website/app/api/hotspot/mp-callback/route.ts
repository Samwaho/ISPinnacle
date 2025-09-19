import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the callback for debugging
    console.log('Hotspot M-Pesa STK Callback received:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.Body || !body.Body.stkCallback) {
      console.error("Invalid callback structure:", body);
      return NextResponse.json(
        { success: false, message: "Invalid callback structure" },
        { status: 400 }
      );
    }

    // Extract the callback data
    const {
      Body: {
        stkCallback: {
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata,
        },
      },
    } = body;

    // Validate required fields
    if (!CheckoutRequestID || ResultCode === undefined) {
      console.error("Missing required fields in callback");
      return NextResponse.json(
        { success: false, message: "Missing required fields in callback" },
        { status: 400 }
      );
    }

    // Find voucher by payment reference (CheckoutRequestID)
    const voucher = await prisma.hotspotVoucher.findFirst({
      where: { paymentReference: CheckoutRequestID },
      include: {
        package: true,
        organization: true,
      }
    });

    if (!voucher) {
      console.error("Voucher not found for CheckoutRequestID:", CheckoutRequestID);
      return NextResponse.json(
        { success: false, message: "Voucher not found" },
        { status: 404 }
      );
    }

    // Extract payment details from callback metadata
    let mpesaReceiptNumber = '';

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
        }
      }
    }

    // Process based on result code
    // ResultCode 0 means success
    if (ResultCode === 0) {
        // Update voucher status to active
        await prisma.hotspotVoucher.update({
          where: { id: voucher.id },
          data: { 
            status: 'ACTIVE',
            paymentReference: mpesaReceiptNumber, // Update with actual receipt number
          }
        });

      console.log(`Hotspot voucher activated. Voucher ID: ${voucher.id}, Receipt: ${mpesaReceiptNumber}`);
    } else {
        // Update voucher status to cancelled
        await prisma.hotspotVoucher.update({
          where: { id: voucher.id },
          data: { status: 'CANCELLED' }
        });

      console.log(`Hotspot voucher payment failed. Voucher ID: ${voucher.id}, Result: ${ResultDesc}`);
    }

    // Return success response to M-Pesa
    return NextResponse.json({
      success: true,
      message: 'Hotspot voucher callback processed successfully',
      voucherId: voucher.id,
      resultCode: ResultCode,
      resultDesc: ResultDesc
    });

  } catch (error) {
    console.error('Error processing hotspot M-Pesa callback:', error);
    
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
    message: 'Hotspot M-Pesa callback endpoint is working',
    timestamp: new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the C2B validation for debugging
    console.log('C2B Validation received:', JSON.stringify(body, null, 2));

    // Extract the C2B validation data
    const {
      TransAmount,
      BusinessShortCode,
      BillReferenceNumber,
      MSISDN,
    } = body;

    // Validate the payment details
    // You can add custom validation logic here
    const isValidPayment = await validateC2BPayment({
      billReferenceNumber: BillReferenceNumber,
      amount: TransAmount,
      phoneNumber: MSISDN,
      businessShortCode: BusinessShortCode,
    });

    if (!isValidPayment.valid) {
      console.log('C2B payment validation failed:', isValidPayment.reason);
      return NextResponse.json({
        success: false,
        message: isValidPayment.reason,
      });
    }

    console.log(`C2B Payment validation successful for bill reference: ${BillReferenceNumber}`);

    // Return success response to M-Pesa
    return NextResponse.json({
      success: true,
      message: 'C2B validation successful',
    });

  } catch (error) {
    console.error('Error processing C2B validation:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation function for C2B payments
async function validateC2BPayment(data: {
  billReferenceNumber: string;
  amount: number;
  phoneNumber: string;
  businessShortCode: string;
}) {
  try {
    // Check if the bill reference number exists in your system
    const payment = await prisma.organizationCustomerPayment.findFirst({
      where: {
        customerId: data.billReferenceNumber,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!payment) {
      return {
        valid: false,
        reason: 'Invalid bill reference number',
      };
    }

    // Check if the amount matches
    if (payment.amount !== data.amount) {
      return {
        valid: false,
        reason: 'Amount mismatch',
      };
    }

    // Check if the phone number format is valid
    if (!data.phoneNumber.match(/^254\d{9}$/)) {
      return {
        valid: false,
        reason: 'Invalid phone number format',
      };
    }

    // Add more validation rules as needed
    // For example, check if the customer is active, if the package is valid, etc.

    return {
      valid: true,
      reason: 'Payment validation successful',
    };
  } catch (error) {
    console.error('Error validating C2B payment:', error);
    return {
      valid: false,
      reason: 'Validation error',
    };
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'C2B validation endpoint is working',
    timestamp: new Date().toISOString(),
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  processCustomerPayment,
  storeMpesaTransaction,
} from "@/lib/server-hooks";
import { MpesaTransactionType } from "@/lib/generated/prisma";
import { SmsService } from '@/lib/sms';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the callback for debugging
    console.log('M-Pesa STK Callback received:', JSON.stringify(body, null, 2));

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

    // Extract payment details from callback metadata
    let mpesaReceiptNumber = '';
    let transactionDate = '';
    let amount = 0;
    let phoneNumber = '';

    if (CallbackMetadata && CallbackMetadata.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case 'MpesaReceiptNumber':
            mpesaReceiptNumber = item.Value;
            break;
          case 'TransactionDate':
            transactionDate = item.Value;
            break;
          case 'Amount':
            amount = typeof item.Value === 'string' ? parseFloat(item.Value) : item.Value;
            break;
          case 'PhoneNumber':
            phoneNumber = item.Value;
            break;
        }
      }
    }

    // Validate extracted data
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      console.error("Invalid amount in callback:", amount);
      return NextResponse.json(
        { success: false, message: "Invalid transaction amount" },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      console.error("Missing phone number in callback");
      return NextResponse.json(
        { success: false, message: "Missing phone number" },
        { status: 400 }
      );
    }

    // Parse transaction date from M-Pesa format (YYYYMMDDHHMMSS) to Date
    const parseMpesaDateTime = (transTime: string | number): Date => {
      try {
        // Format: YYYYMMDDHHMMSS
        const t = typeof transTime === 'number' ? transTime.toString() : transTime;
        const year = parseInt(t.substring(0, 4));
        const month = parseInt(t.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(t.substring(6, 8));
        const hour = parseInt(t.substring(8, 10));
        const minute = parseInt(t.substring(10, 12));
        const second = parseInt(t.substring(12, 14));
        
        return new Date(year, month, day, hour, minute, second);
      } catch (error) {
        console.error("Error parsing transaction date:", transTime, error);
        // Fallback to current date if parsing fails
        return new Date();
      }
    };
    
    const transactionDateTime = transactionDate ? parseMpesaDateTime(transactionDate) : new Date();

    // First check if this is a hotspot voucher payment
    const hotspotVoucher = await prisma.hotspotVoucher.findFirst({
      where: {
        paymentReference: CheckoutRequestID,
      },
      include: {
        package: true,
        organization: {
          select: {
            mpesaConfiguration: {
              select: {
                shortCode: true,
                transactionType: true,
              },
            },
          },
        },
      },
    });

    // If it's a hotspot voucher, handle it differently
    if (hotspotVoucher) {
      if (ResultCode === 0) {
        // Store M-Pesa transaction for hotspot voucher
        try {
          await storeMpesaTransaction(
            mpesaReceiptNumber || CheckoutRequestID,
            amount,
            hotspotVoucher.organization.mpesaConfiguration?.transactionType || MpesaTransactionType.PAYBILL,
            transactionDateTime,
            hotspotVoucher.organization.mpesaConfiguration?.shortCode || '',
            phoneNumber,
            phoneNumber,
            hotspotVoucher.voucherCode, // Use voucher code as account reference
            mpesaReceiptNumber || CheckoutRequestID,
            0 // No org account balance for STK push
          );
          console.log("Hotspot voucher M-Pesa transaction stored successfully");
        } catch (error) {
          console.error("Error storing hotspot voucher M-Pesa transaction:", error);
          // Continue processing even if transaction storage fails
        }

        // Update voucher status to active
        const updated = await prisma.hotspotVoucher.update({
          where: { id: hotspotVoucher.id },
          data: { 
            status: 'ACTIVE',
            paymentReference: mpesaReceiptNumber, // Update with actual receipt number
          }
        });

        console.log(`Hotspot voucher activated. Voucher ID: ${hotspotVoucher.id}, Receipt: ${mpesaReceiptNumber}`);

        // Attempt to send voucher SMS to the purchaser
        try {
          const org = await prisma.organization.findUnique({
            where: { id: updated.organizationId },
            select: { name: true }
          });

          const pkg = await prisma.organizationPackage.findUnique({
            where: { id: updated.packageId },
            select: { name: true, price: true, duration: true, durationType: true }
          });

          // Calculate actual usage expiry (when voucher duration expires after first use)
          const usageExpiry = updated.lastUsedAt ? 
            new Date(updated.lastUsedAt.getTime() + (getDurationInMs(pkg?.durationType || 'HOUR') * (pkg?.duration || 1))) :
            new Date(updated.expiresAt || new Date());
          
          const expiry = usageExpiry.toLocaleString();
          console.log('Hotspot: attempting to send voucher SMS', {
            organizationId: updated.organizationId,
            phoneNumber: updated.phoneNumber,
            voucherCode: updated.voucherCode,
            packageName: pkg?.name,
            amount: pkg?.price,
            expiryDate: expiry,
            usageExpiry: usageExpiry.toISOString()
          });

          const smsResult = await SmsService.sendTemplateSms({
            organizationId: updated.organizationId,
            templateName: 'hotspot_voucher',
            phoneNumber: updated.phoneNumber,
            variables: {
              voucherCode: updated.voucherCode,
              packageName: pkg?.name || 'Hotspot Package',
              amount: String(pkg?.price ?? ''),
              expiryDate: expiry,
              organizationName: org?.name || 'ISPinnacle',
            }
          });
          console.log('Hotspot: voucher SMS send result', smsResult);
        } catch (smsError) {
          console.error('Failed to send hotspot voucher SMS:', smsError);
        }
      } else {
        // Update voucher status to cancelled
        await prisma.hotspotVoucher.update({
          where: { id: hotspotVoucher.id },
          data: { status: 'CANCELLED' }
        });

        console.log(`Hotspot voucher payment failed. Voucher ID: ${hotspotVoucher.id}, Result: ${ResultDesc}`);
      }

      // Return success response to M-Pesa
      return NextResponse.json({
        success: true,
        message: 'Hotspot voucher callback processed successfully',
        voucherId: hotspotVoucher.id,
        resultCode: ResultCode,
        resultDesc: ResultDesc
      });
    }

    // Handle regular payment links
    const paymentLink = await prisma.mpesaPaymentLink.findFirst({
      where: {
        checkoutRequestId: CheckoutRequestID,
      },
      include: {
        customer: {
          select: {
            id: true,
            pppoeUsername: true,
            hotspotUsername: true,
          },
        },
        organization: {
          select: {
            mpesaConfiguration: {
              select: {
                shortCode: true,
                transactionType: true,
              },
            },
          },
        },
      },
    });

    // Derive account reference from customer and business short code from organization
    const AccountReference = paymentLink
      ? paymentLink.customer.pppoeUsername ||
        paymentLink.customer.hotspotUsername ||
        CheckoutRequestID
      : CheckoutRequestID;
    const businessShortCode = paymentLink?.organization?.mpesaConfiguration?.shortCode || '';
    const transactionType = paymentLink?.organization?.mpesaConfiguration?.transactionType || MpesaTransactionType.PAYBILL;

    console.log("Processing STK callback:", {
      CheckoutRequestID,
      AccountReference,
      ResultCode,
      ResultDesc,
      amount,
      phoneNumber,
      mpesaReceiptNumber,
      businessShortCode,
      transactionType,
      transactionDateTime: transactionDateTime.toISOString()
    });

    // Process based on result code
    // ResultCode 0 means success
    if (ResultCode === 0) {
      // Store M-Pesa transaction
      try {
        await storeMpesaTransaction(
          mpesaReceiptNumber,
          amount,
          transactionType,
          transactionDateTime,
          businessShortCode,
          String(phoneNumber), // Use phone number as name for STK push
          String(phoneNumber),
          AccountReference, // Use CheckoutRequestID as bill reference
          mpesaReceiptNumber,
          0 // No org account balance for STK push
        );
        console.log("M-Pesa STK transaction stored successfully");
      } catch (error) {
        console.error("Error storing M-Pesa STK transaction:", error);
        return NextResponse.json(
          { 
            success: false, 
            message: "Failed to store transaction",
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        );
      }

      // Process customer payment using CheckoutRequestID as reference
      // Note: For STK push, we might need to store the customer reference in the CheckoutRequestID
      // or have a separate mapping table. For now, we'll try to process it.
      try {
        await processCustomerPayment(AccountReference, amount);
        console.log("Customer payment processed successfully for STK push");
      } catch (error) {
        console.error("Error processing customer payment for STK push:", error);
        // Don't fail the callback if customer payment processing fails
        // Just log the error and continue
        console.log("Continuing despite customer payment processing error");
      }

      console.log(`STK Payment successful. Transaction ID: ${CheckoutRequestID}, Amount: ${amount}, Receipt: ${mpesaReceiptNumber}`);
    } else {
      console.log(`STK Payment failed. Transaction ID: ${CheckoutRequestID}, Result: ${ResultDesc}`);
      
      // Store failed transaction for audit purposes
      try {
        await storeMpesaTransaction(
          CheckoutRequestID,
          amount,
          transactionType,
          transactionDateTime,
          businessShortCode,
          String(phoneNumber),
          phoneNumber,
          AccountReference,
          mpesaReceiptNumber,
          0
        );
        console.log("Failed STK transaction stored for audit");
      } catch (error) {
        console.error("Error storing failed STK transaction:", error);
      }
    }

    // Return success response to M-Pesa
    return NextResponse.json({
      success: true,
      message: 'STK callback processed successfully',
      transactionId: CheckoutRequestID,
      resultCode: ResultCode,
      resultDesc: ResultDesc
    });

  } catch (error) {
    console.error('Error processing M-Pesa STK callback:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

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
    message: 'M-Pesa STK callback endpoint is working',
    timestamp: new Date().toISOString(),
  });
}

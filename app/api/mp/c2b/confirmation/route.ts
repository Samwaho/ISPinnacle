import { NextRequest, NextResponse } from "next/server";
import {
  processCustomerPayment,
  storeMpesaTransaction,
} from "@/lib/server-hooks";
import { MpesaTransactionType } from "@/lib/generated/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log the C2B confirmation for debugging
    console.log("C2B Confirmation received:", JSON.stringify(body, null, 2));

    // Validate required fields
    const requiredFields = [
      'TransID',
      'TransTime',
      'TransAmount',
      'BusinessShortCode',
      'BillRefNumber',
      'MSISDN'
    ];

    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      console.error("Missing required fields:", missingFields);
      return NextResponse.json(
        { 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Extract the C2B confirmation data
    const {
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      InvoiceNumber,
      OrgAccountBalance,
      MSISDN,
      FirstName = '',
      MiddleName = '',
      LastName = '',
    } = body;

    // Convert TransAmount to number if it's a string
    const amount = typeof TransAmount === 'string' ? parseFloat(TransAmount) : TransAmount;
    
    // Convert OrgAccountBalance to number if it's a string
    const orgAccountBalance = typeof OrgAccountBalance === 'string' ? parseFloat(OrgAccountBalance) : OrgAccountBalance;
    
    // Parse TransTime from M-Pesa format (YYYYMMDDHHMMSS) to Date
    const parseMpesaDateTime = (transTime: string): Date => {
      try {
        // Format: YYYYMMDDHHMMSS
        const year = parseInt(transTime.substring(0, 4));
        const month = parseInt(transTime.substring(4, 6)) - 1; // Month is 0-indexed
        const day = parseInt(transTime.substring(6, 8));
        const hour = parseInt(transTime.substring(8, 10));
        const minute = parseInt(transTime.substring(10, 12));
        const second = parseInt(transTime.substring(12, 14));
        
        return new Date(year, month, day, hour, minute, second);
      } catch (error) {
        console.error("Error parsing TransTime:", transTime, error);
        // Fallback to current date if parsing fails
        return new Date();
      }
    };
    
    const transactionDateTime = parseMpesaDateTime(TransTime);
    
    // Validate data types
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      console.error("Invalid TransAmount:", TransAmount, "Parsed amount:", amount);
      return NextResponse.json(
        { success: false, message: "Invalid transaction amount" },
        { status: 400 }
      );
    }

    if (!TransID || typeof TransID !== 'string') {
      console.error("Invalid TransID:", TransID);
      return NextResponse.json(
        { success: false, message: "Invalid transaction ID" },
        { status: 400 }
      );
    }

    const name = `${FirstName} ${MiddleName} ${LastName}`.trim() || 'Unknown';

    console.log("Processing transaction:", {
      TransID,
      TransAmount,
      amount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      name,
      transactionDateTime: transactionDateTime.toISOString()
    });

    // Store M-Pesa transaction
    try {
      await storeMpesaTransaction(
        TransID,
        amount,
        MpesaTransactionType.PAYBILL,
        transactionDateTime,
        BusinessShortCode,
        name,
        MSISDN,
        BillRefNumber,
        InvoiceNumber || '',
        orgAccountBalance || 0
      );
      console.log("M-Pesa transaction stored successfully");
    } catch (error) {
      console.error("Error storing M-Pesa transaction:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to store transaction",
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Process customer payment
    try {
      await processCustomerPayment(BillRefNumber, amount);
      console.log("Customer payment processed successfully");
    } catch (error) {
      console.error("Error processing customer payment:", error);
      return NextResponse.json(
        { 
          success: false, 
          message: "Failed to process customer payment",
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log(
      `C2B Payment confirmed successfully. Transaction ID: ${TransID}, Amount: ${amount}`
    );

    // Return success response to M-Pesa
    return NextResponse.json({
      success: true,
      message: "C2B confirmation processed successfully",
      transactionId: TransID,
      amount: amount
    });
  } catch (error) {
    console.error("Error processing C2B confirmation:", error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: "C2B confirmation endpoint is working",
    timestamp: new Date().toISOString(),
  });
}

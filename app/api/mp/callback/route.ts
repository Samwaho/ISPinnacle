import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
    
//     // Log the callback for debugging
//     console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

//     // Extract the callback data
//     const {
//       Body: {
//         stkCallback: {
//           CheckoutRequestID,
//           ResultCode,
//           ResultDesc,
//           CallbackMetadata,
//         },
//       },
//     } = body;


//     // Extract payment details from callback metadata
//     let mpesaReceiptNumber = '';
//     let transactionDate = '';
//     let amount = 0;
//     let phoneNumber = '';

//     if (CallbackMetadata && CallbackMetadata.Item) {
//       for (const item of CallbackMetadata.Item) {
//         switch (item.Name) {
//           case 'MpesaReceiptNumber':
//             mpesaReceiptNumber = item.Value;
//             break;
//           case 'TransactionDate':
//             transactionDate = item.Value;
//             break;
//           case 'Amount':
//             amount = item.Value;
//             break;
//           case 'PhoneNumber':
//             phoneNumber = item.Value;
//             break;
//         }
//       }
//     }

//     // Update payment status based on result code
//     // ResultCode 0 means success
//     if (ResultCode === 0) {
//       await prisma.mpesaTransaction.create({
//         data: {
//           organizationId: organizationId,
//           transactionId: CheckoutRequestID,
//           phoneNumber: phoneNumber,
//           amount: amount,
//         },
//       });

//       console.log(`Payment ${payment.id} marked as paid. M-Pesa Receipt: ${mpesaReceiptNumber}`);
//     } else {
//       console.log(`Payment ${payment.id} failed. Result: ${ResultDesc}`);
//     }

//     // Return success response to M-Pesa
//     return NextResponse.json({
//       success: true,
//       message: 'Callback processed successfully',
//     });

//   } catch (error) {
//     console.error('Error processing M-Pesa callback:', error);
//     return NextResponse.json(
//       { success: false, message: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({
    message: 'M-Pesa callback endpoint is working',
    timestamp: new Date().toISOString(),
  });
}

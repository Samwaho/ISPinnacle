# M-Pesa Integration Guide

This guide explains how to use the M-Pesa integration in your ISP management system.

## Overview

The M-Pesa integration allows you to accept payments from customers using Safaricom's M-Pesa STK Push service. The integration includes:

- **tRPC Router**: Backend API endpoints for M-Pesa operations
- **React Hooks**: Custom hooks for easy frontend integration
- **UI Components**: Ready-to-use payment forms and configuration forms
- **Webhook Handler**: Callback endpoint for payment status updates

## Features

- ✅ STK Push payment initiation (B2C)
- ✅ C2B payment handling (Customer to Business)
- ✅ Payment status checking
- ✅ Webhook callbacks for real-time updates
- ✅ Payment history tracking
- ✅ Secure credential management
- ✅ Sandbox and production environment support
- ✅ Role-based access control
- ✅ C2B URL registration and validation
- ✅ C2B payment simulation for testing

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```env
# M-Pesa Configuration
NEXTAUTH_URL=http://localhost:3000  # Your app URL for callbacks
```

### 2. Database Migration

The M-Pesa configuration is stored in the `MpesaConfiguration` table. Make sure your database is up to date:

```bash
npx prisma db push
```

### 3. Configure M-Pesa Credentials

You'll need to obtain M-Pesa API credentials from Safaricom:

- **Consumer Key**: Your M-Pesa app consumer key
- **Consumer Secret**: Your M-Pesa app consumer secret
- **Short Code**: Your business short code
- **Pass Key**: Your M-Pesa pass key
- **Transaction Type**: Either "PAYBILL" or "BUYGOODS"

### 4. Sandbox Testing

For testing, use Safaricom's sandbox environment:

- **Sandbox URL**: `https://sandbox.safaricom.co.ke`
- **Test Short Code**: `174379`
- **Test Phone Numbers**: Any valid Kenyan phone number format

## Usage

### Backend (tRPC)

The M-Pesa router provides the following endpoints:

```typescript
// Configure M-Pesa settings
api.mpesa.configureMpesa.mutate({
  organizationId: "org_id",
  consumerKey: "your_consumer_key",
  consumerSecret: "your_consumer_secret",
  shortCode: "174379",
  passKey: "your_pass_key",
  transactionType: "PAYBILL"
});

// Get M-Pesa configuration
api.mpesa.getMpesaConfiguration.query({
  organizationId: "org_id"
});

// Initiate payment
api.mpesa.initiatePayment.mutate({
  organizationId: "org_id",
  phoneNumber: "254712345678",
  amount: 1000,
  reference: "customer_id",
  description: "Internet package payment"
});

// Check payment status
api.mpesa.checkPaymentStatus.query({
  organizationId: "org_id",
  checkoutRequestId: "checkout_request_id"
});

// Get payment history
api.mpesa.getPaymentHistory.query({
  organizationId: "org_id",
  limit: 20,
  offset: 0
});

// C2B URL Registration
api.mpesa.registerC2BUrls.mutate({
  organizationId: "org_id",
  shortCode: "optional_short_code" // Uses organization's short code if not provided
});

// C2B Payment Simulation (for testing)
api.mpesa.simulateC2BPayment.mutate({
  organizationId: "org_id",
  phoneNumber: "254712345678",
  amount: 1000,
  billReferenceNumber: "CUSTOMER_123",
  commandId: "CustomerPayBillOnline"
});
```

### Frontend (React Hooks)

Use the custom hooks for easy integration:

```typescript
import { useMpesa, usePaymentStatus } from '@/hooks/use-mpesa';

function PaymentComponent({ organizationId }) {
  const {
    configureMpesa,
    initiatePayment,
    checkPaymentStatus,
    mpesaConfig,
    isConfigured,
  } = useMpesa(organizationId);

  const handlePayment = async () => {
    const result = await initiatePayment({
      phoneNumber: "254712345678",
      amount: 1000,
      reference: "customer_123",
      description: "Monthly internet package"
    });
    
    console.log('Payment initiated:', result.checkoutRequestId);
  };

  return (
    <div>
      {isConfigured ? (
        <button onClick={handlePayment}>Pay with M-Pesa</button>
      ) : (
        <p>M-Pesa not configured</p>
      )}
    </div>
  );
}
```

### UI Components

Use the provided components for a complete payment experience:

```typescript
import { MpesaPaymentForm } from '@/components/mpesa/MpesaPaymentForm';
import { MpesaConfigurationForm } from '@/components/mpesa/MpesaConfigurationForm';

// Payment form
<MpesaPaymentForm
  organizationId="org_id"
  customerId="customer_123"
  amount={1000}
  onPaymentComplete={(paymentId) => {
    console.log('Payment completed:', paymentId);
  }}
/>

// Configuration form
<MpesaConfigurationForm organizationId="org_id" />

// C2B Configuration form
<C2BConfigurationForm organizationId="org_id" />
```

## Payment Flows

### STK Push (B2C) Flow
1. **Initiate Payment**: Call `initiatePayment` with customer details
2. **STK Push**: Customer receives M-Pesa prompt on their phone
3. **Customer Action**: Customer enters PIN and confirms payment
4. **Webhook Callback**: M-Pesa sends status update to your callback URL
5. **Status Update**: Payment record is updated in database
6. **Real-time Updates**: Frontend polls for status updates

### C2B (Customer to Business) Flow
1. **URL Registration**: Register confirmation and validation URLs with M-Pesa
2. **Customer Payment**: Customer initiates payment from their M-Pesa app
3. **Validation**: M-Pesa calls your validation URL to verify payment details
4. **Confirmation**: If valid, M-Pesa processes payment and calls confirmation URL
5. **Status Update**: Payment record is updated in database
6. **Real-time Updates**: Frontend can poll for status updates

## Webhook Callbacks

### STK Push Callback
The callback endpoint (`/api/mpesa/callback`) handles STK Push payment status updates:

- **ResultCode 0**: Payment successful
- **ResultCode 1032**: Payment pending
- **Other codes**: Payment failed

### C2B Callbacks
Two callback endpoints handle C2B payments:

1. **Validation URL** (`/api/mpesa/c2b/validation`): Validates payment details before processing
2. **Confirmation URL** (`/api/mpesa/c2b/confirmation`): Confirms successful payment processing

C2B callback data includes:
- `TransID`: M-Pesa transaction ID
- `TransTime`: Transaction timestamp
- `TransAmount`: Payment amount
- `BillReferenceNumber`: Your bill reference
- `MSISDN`: Customer phone number
- `FirstName`, `MiddleName`, `LastName`: Customer details

## Security Considerations

1. **Credential Storage**: M-Pesa credentials are encrypted in the database
2. **Access Control**: Only users with `MANAGE_SETTINGS` permission can configure M-Pesa
3. **Input Validation**: All inputs are validated using Zod schemas
4. **Error Handling**: Comprehensive error handling for API failures

## Testing

### Sandbox Environment

1. Use sandbox credentials from Safaricom
2. Test with any valid Kenyan phone number
3. Use test short code `174379`
4. Monitor logs for API responses

### Production Environment

1. Obtain production credentials from Safaricom
2. Ensure callback URL is publicly accessible
3. Test with real M-Pesa accounts
4. Monitor payment statuses carefully

## Error Handling

Common error scenarios and solutions:

- **Invalid Credentials**: Check consumer key and secret
- **Invalid Short Code**: Verify short code format and permissions
- **Callback URL Unreachable**: Ensure URL is publicly accessible
- **Phone Number Format**: Use format `254XXXXXXXXX`
- **Insufficient Balance**: Customer needs sufficient M-Pesa balance

## Troubleshooting

### Payment Not Initiated
- Check M-Pesa configuration
- Verify network connectivity
- Check API credentials

### Payment Pending
- Customer may not have confirmed on phone
- Check M-Pesa balance
- Verify phone number format

### Callback Not Received
- Check callback URL accessibility
- Verify webhook endpoint is working
- Check server logs for errors

## Support

For M-Pesa API issues, contact Safaricom Developer Support:
- Email: developer@safaricom.co.ke
- Documentation: https://developer.safaricom.co.ke/

For integration issues, check the application logs and ensure all configurations are correct.

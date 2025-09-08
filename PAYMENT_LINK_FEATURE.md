# Payment Link Feature

This document explains the payment link feature that allows organizations to create shareable payment links for their customers.

## Overview

The payment link feature enables organizations to:
1. Create unique payment links for specific customers
2. Share these links with customers via email, SMS, or other communication channels
3. Allow customers to pay using M-Pesa STK push without needing to log into the system
4. Track payment status and mark links as used once payment is initiated

## How It Works

### 1. Creating Payment Links

**For Organization Admins:**
- Navigate to the Customers page in your organization dashboard
- Click the three-dot menu (⋮) next to any customer
- Select "Create Payment Link"
- Enter the payment amount and description
- Click "Create Payment Link"
- Copy the generated link or share it directly

**API Endpoint:**
```typescript
POST /api/trpc/customer.createPaymentLink
{
  organizationId: string,
  customerId: string,
  amount: number,
  description: string
}
```

### 2. Customer Payment Flow

**For Customers:**
1. Click on the payment link (e.g., `https://yourdomain.com/payment/[token]`)
2. Review payment details (organization, customer, amount, description)
3. Enter M-Pesa registered phone number in format `254XXXXXXXXX`
4. Click "Pay with M-Pesa"
5. Receive STK push notification on phone
6. Enter M-Pesa PIN to complete payment
7. Get redirected to success page

### 3. Payment Processing

- Payment links are single-use (marked as used after first payment attempt)
- M-Pesa STK push is initiated using the organization's configured M-Pesa settings
- Payment status is tracked via M-Pesa callback
- Successful payments are recorded in the system

## Database Schema

### MpesaPaymentLink Model
```prisma
model MpesaPaymentLink {
  id String @id @default(cuid())
  token String @unique
  isUsed Boolean @default(false)
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  customerId String
  customer OrganizationCustomer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  amount Float
  description String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([token])
  @@index([organizationId])
  @@index([customerId])
}
```

## API Endpoints

### 1. Create Payment Link
```typescript
// Protected endpoint - requires MANAGE_CUSTOMERS permission
POST /api/trpc/customer.createPaymentLink
{
  organizationId: string,
  customerId: string,
  amount: number,
  description: string
}
```

### 2. Get Payment Link Details
```typescript
// Public endpoint - no authentication required
GET /api/trpc/customer.getPaymentLink
{
  token: string
}
```

### 3. Process Payment Link
```typescript
// Public endpoint - no authentication required
POST /api/trpc/customer.processPaymentLink
{
  token: string,
  phoneNumber: string // Format: 254XXXXXXXXX
}
```

## Frontend Components

### 1. PaymentLinkForm Component
- Dialog-based form for creating payment links
- Shows payment link details after creation
- Includes copy and open functionality

### 2. Payment Link Page (`/payment/[token]`)
- Public page for customers to complete payments
- Shows payment details and phone number input
- Handles M-Pesa STK push initiation

### 3. Payment Success Page (`/payment/success`)
- Confirmation page after payment initiation
- Shows payment reference and status

## Security Considerations

1. **Token Security**: Payment link tokens are cryptographically secure (32-byte random hex)
2. **Single Use**: Links are marked as used after first payment attempt
3. **Permission Checks**: Creating payment links requires MANAGE_CUSTOMERS permission
4. **Phone Validation**: Phone numbers must be in correct M-Pesa format (254XXXXXXXXX)
5. **Organization Isolation**: Payment links are scoped to specific organizations

## Integration with M-Pesa

The payment link feature integrates with the existing M-Pesa configuration:
- Uses organization's M-Pesa settings (consumer key, secret, short code, pass key)
- Supports both PAYBILL and BUYGOODS transaction types
- Handles STK push initiation and callback processing
- Records transactions in MpesaTransaction table

## Usage Examples

### Creating a Payment Link
```typescript
// In customer management interface
const handleCreatePaymentLink = (customer) => {
  setPaymentLinkCustomer(customer);
};

// PaymentLinkForm component handles the rest
<PaymentLinkForm
  organizationId={organizationId}
  customerId={customer.id}
  customerName={customer.name}
  open={!!paymentLinkCustomer}
  onOpenChange={(open) => {
    if (!open) setPaymentLinkCustomer(null);
  }}
/>
```

### Sharing Payment Link
```typescript
// Generated payment link format
const paymentUrl = `${window.location.origin}/payment/${token}`;

// Example: https://yourdomain.com/payment/a1b2c3d4e5f6...
```

## Error Handling

The system handles various error scenarios:
- Invalid or expired payment links
- Already used payment links
- Missing M-Pesa configuration
- Invalid phone number format
- M-Pesa API errors
- Network connectivity issues

## Future Enhancements

Potential improvements for the payment link feature:
1. **Bulk Payment Links**: Create multiple payment links at once
2. **Payment Link Templates**: Predefined descriptions and amounts
3. **Expiration Dates**: Set time limits on payment links
4. **Payment Link Analytics**: Track usage and conversion rates
5. **SMS Integration**: Automatically send payment links via SMS
6. **QR Code Generation**: Generate QR codes for payment links
7. **Payment Reminders**: Automated reminders for unpaid links

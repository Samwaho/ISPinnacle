# SMS Service Usage Guide

This document explains how to use the new SMS service for sending SMS messages in the ISPinnacle application.

## Overview

The SMS service provides a unified interface for sending SMS messages through different providers (TextSMS, ZetaTel) with automatic provider detection and configuration management.

## Basic Usage

### 1. Send SMS using organization's configured provider

```typescript
import { SmsService } from "@/lib/sms";

// Send SMS using the organization's configured SMS provider
const result = await SmsService.sendSms({
  organizationId: "org_123",
  phoneNumber: "254712345678",
  message: "Hello from ISPinnacle!"
});

if (result.success) {
  console.log("SMS sent successfully:", result.response);
} else {
  console.error("Failed to send SMS:", result.message);
}
```

### 2. Send SMS (uses organization's configured provider)

```typescript
import { SmsService } from "@/lib/sms";

// Uses the organization's configured SMS provider automatically
const result = await SmsService.sendSms({
  organizationId: "org_123",
  phoneNumber: "254712345678",
  message: "Hello from ISPinnacle!"
});
```

### 3. Send bulk SMS to multiple recipients

```typescript
const recipients = [
  { phoneNumber: "254712345678", message: "Hello John!" },
  { phoneNumber: "254723456789", message: "Hello Jane!" },
  { phoneNumber: "254734567890", message: "Hello Bob!" }
];

const results = await SmsService.sendBulkSms(
  "org_123",
  recipients
);

console.log(`Sent ${results.filter(r => r.success).length} out of ${results.length} SMS messages`);
```

## Using the tRPC API

### 1. Send single SMS

```typescript
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

const t = useTRPC();

const sendSmsMutation = useMutation(
  t.sms.sendSms.mutationOptions({
    onSuccess: (data) => {
      console.log("SMS sent:", data);
    },
    onError: (error) => {
      console.error("Failed to send SMS:", error.message);
    },
  })
);

// Send SMS
sendSmsMutation.mutate({
  organizationId: "org_123",
  phoneNumber: "254712345678",
  message: "Hello from ISPinnacle!"
});
```

### 2. Send bulk SMS

```typescript
const sendBulkSmsMutation = useMutation(
  t.sms.sendBulkSms.mutationOptions({
    onSuccess: (data) => {
      console.log(`Bulk SMS completed: ${data.summary.successful}/${data.summary.total} sent`);
    },
  })
);

sendBulkSmsMutation.mutate({
  organizationId: "org_123",
  recipients: [
    { phoneNumber: "254712345678", message: "Hello John!" },
    { phoneNumber: "254723456789", message: "Hello Jane!" }
  ]
});
```

### 3. Test SMS configuration

```typescript
const testSmsMutation = useMutation(
  t.sms.testSmsConfiguration.mutationOptions({
    onSuccess: () => {
      console.log("Test SMS sent successfully");
    },
  })
);

testSmsMutation.mutate({
  organizationId: "org_123",
  phoneNumber: "254712345678",
  message: "Test message" // optional
});
```

### 4. Get delivery status

```typescript
const { data: deliveryStatus } = useQuery(
  t.sms.getDeliveryStatus.queryOptions({
    organizationId: "org_123",
    messageId: "msg_123"
  })
);
```

### 5. Get account balance

```typescript
const { data: balance } = useQuery(
  t.sms.getAccountBalance.queryOptions({
    organizationId: "org_123"
  })
);
```

## Service Features

### Automatic Provider Detection
- The service automatically uses the organization's configured SMS provider
- No need to specify provider - it's retrieved from organization settings

### Configuration Validation
- Automatically validates required fields based on the selected provider
- TextSMS requires: API Key, Sender ID, Partner ID
- ZetaTel requires: User ID, Password (API Key is optional - can use either API Key OR User ID + Password)
- Sender ID is optional for ZetaTel (defaults to "SENDER" if not provided)

### Error Handling
- Comprehensive error handling with specific error codes
- Detailed error messages for troubleshooting
- Graceful fallback for unsupported operations

### Provider Support
- **TextSMS**: Fully implemented with all features
- **ZetaTel**: Fully implemented with all features

## Error Codes

| Code | Description |
|------|-------------|
| `NO_PROVIDER_CONFIGURED` | Organization has no SMS provider configured |
| `NO_CONFIGURATION` | SMS configuration not found |
| `PROVIDER_NOT_IMPLEMENTED` | Provider not yet implemented |
| `INCOMPLETE_CONFIGURATION` | Missing required configuration fields |
| `API_REQUEST_FAILED` | HTTP request to provider API failed |
| `SMS_SEND_FAILED` | Provider API returned error |
| `SERVICE_ERROR` | Internal service error |

## Best Practices

1. **Always check the result**: The service returns a `SmsResponse` object with success status
2. **Handle errors gracefully**: Use the error codes to provide appropriate user feedback
3. **Use bulk SMS for multiple recipients**: More efficient than individual calls
4. **Test configuration first**: Use the test endpoint to verify setup
5. **Monitor delivery status**: Check delivery status for important messages
6. **Check account balance**: Monitor balance to avoid service interruptions

## Integration Examples

### Customer Notification
```typescript
// Send payment reminder to customer
const result = await SmsService.sendSms({
  organizationId: customer.organizationId,
  phoneNumber: customer.phone,
  message: `Hi ${customer.name}, your payment of KES ${amount} is due. Please pay to continue service.`
});
```

### System Alerts
```typescript
// Send system alert to admin
const result = await SmsService.sendSms({
  organizationId: organizationId,
  phoneNumber: adminPhone,
  message: "System Alert: High server load detected. Please check system status."
});
```

### Marketing Campaigns
```typescript
// Send promotional message to all customers
const customers = await getActiveCustomers(organizationId);
const recipients = customers.map(customer => ({
  phoneNumber: customer.phone,
  message: `Special offer: 20% off your next payment! Use code SAVE20. Valid until month-end.`
}));

const results = await SmsService.sendBulkSms(organizationId, recipients);
```

This service provides a robust, scalable solution for SMS communication within the ISPinnacle application.

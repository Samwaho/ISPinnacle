# SMS Integration Implementation

This document describes the SMS provider integration that has been implemented in the ISPinnacle application.

## Features Implemented

### 1. SMS Provider Selection
- Support for multiple SMS providers (TextSMS, ZetaTel)
- Provider-specific configuration forms
- Dynamic form fields based on selected provider

### 2. SMS Configuration
- **TextSMS Provider**:
  - Required fields: API Key, Sender ID, Partner ID
  - Optional fields: User ID, Password
- **ZetaTel Provider**:
  - Required fields: API Key, User ID, Password
  - Optional fields: Sender ID

### 3. SMS Testing
- Test SMS functionality to verify configuration
- Real-time SMS sending using provider APIs
- Error handling and user feedback

### 4. Permissions System
- `VIEW_SMS_CONFIGURATION` - View SMS settings
- `MANAGE_SMS_CONFIGURATION` - Configure and test SMS
- Integrated with organization role-based permissions

## Database Changes Required

### 1. Update Prisma Schema
The following permissions have been added to the `OrganizationPermission` enum:
```prisma
enum OrganizationPermission {
  // ... existing permissions
  VIEW_SMS_CONFIGURATION
  MANAGE_SMS_CONFIGURATION
}
```

### 2. Run Database Migration
After updating the schema, run:
```bash
npx prisma db push
npx prisma generate
```

## API Endpoints

### SMS Router (`/api/trpc/sms.*`)

1. **updateSmsProvider** - Update organization's SMS provider
2. **getSmsConfiguration** - Get current SMS configuration
3. **updateSmsConfiguration** - Update SMS credentials
4. **deleteSmsConfiguration** - Remove SMS configuration
5. **testSmsConfiguration** - Send test SMS

## UI Components

### SMS Configuration Component
- Provider selection dropdown
- Dynamic configuration forms
- Test SMS functionality
- Configuration status indicators

### Organization Page Integration
- New "SMS Provider" tab
- Permission-based access control
- Integrated with existing organization management

## TextSMS Integration

Based on the TextSMS API documentation (https://textsms.co.ke/bulk-sms-api/), the implementation includes:

### API Endpoints Used
- **Send SMS**: `https://sms.textsms.co.ke/api/services/sendsms/`
- **Bulk SMS**: `https://sms.textsms.co.ke/api/services/sendbulk/`
- **Delivery Reports**: `https://sms.textsms.co.ke/api/services/getdlr/`
- **Account Balance**: `https://sms.textsms.co.ke/api/services/getbalance/`

### Required Parameters
- `apikey`: Valid API Key
- `partnerID`: Valid Partner ID
- `message`: URL Encoded Text Message
- `shortcode`: Valid Sender ID
- `mobile`: Valid Mobile Number

### Response Format
```json
{
  "responses": [
    {
      "respose-code": 200,
      "response-description": "Success",
      "mobile": "254712345678",
      "messageid": 8290842,
      "networkid": "1"
    }
  ]
}
```

## Usage

1. **Select SMS Provider**: Choose between TextSMS and ZetaTel
2. **Configure Credentials**: Enter provider-specific credentials
3. **Test Configuration**: Send a test SMS to verify setup
4. **Monitor Status**: View configuration status and provider info

## Security Considerations

- SMS credentials are stored securely in the database
- Permission-based access control
- API keys are not exposed in client-side code
- Test SMS functionality includes rate limiting

## Future Enhancements

1. **Additional Providers**: Support for more SMS providers
2. **SMS Templates**: Predefined message templates
3. **Bulk SMS**: Send SMS to multiple recipients
4. **Delivery Reports**: Track SMS delivery status
5. **SMS Analytics**: Usage statistics and reporting
6. **Scheduled SMS**: Send SMS at specific times
7. **SMS History**: Log of sent messages

## Error Handling

The implementation includes comprehensive error handling for:
- Invalid credentials
- Network connectivity issues
- Provider API errors
- Permission violations
- Configuration validation

## Testing

To test the SMS integration:

1. Configure an SMS provider in the organization settings
2. Use the test SMS functionality
3. Verify SMS delivery
4. Check error handling with invalid credentials

## Dependencies

- Prisma for database operations
- tRPC for API layer
- React Query for data fetching
- Zod for schema validation
- TextSMS API for SMS delivery

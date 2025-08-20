# OAuth Error Handling

This document explains how the application handles OAuth authentication errors, specifically the `OAuthAccountNotLinked` error.

## Problem

When a user tries to sign in with Google but there's already an account with the same email address that was created using a different authentication method (like email/password), NextAuth throws an `OAuthAccountNotLinked` error.

## Solution

The application now provides comprehensive error handling and user-friendly solutions:

### 1. Enhanced Error Page (`/auth/error`)

The error page now displays specific information based on the error type:

- **OAuthAccountNotLinked**: Shows helpful message and provides multiple solutions
- **AccessDenied**: Shows access denied message
- **Verification**: Shows email verification required message
- **Default**: Shows generic error message

### 2. Account Linking Feature (`/auth/link-account`)

Users can link their existing email/password account with their OAuth provider:

1. User enters their existing email and password
2. System verifies credentials
3. If valid, redirects to OAuth provider for linking
4. After successful linking, user is redirected to success page

### 3. Enhanced Login Form

The login form now shows a warning message when the `OAuthAccountNotLinked` error is present in the URL parameters.

### 4. Success Page (`/auth/link-success`)

Confirms successful account linking and provides navigation to the dashboard.

## User Flow

1. **User tries to sign in with Google**
2. **If account exists with different method**: 
   - Automatically redirected to account linking page
   - OR shown error page with helpful message and solution options
3. **User enters credentials on account linking page**:
   - System verifies existing account
   - Redirects to OAuth provider for linking
   - Successfully links accounts
   - Redirected to success page
4. **User can now sign in with either method**

## Automatic Redirection

The system now automatically redirects users to the account linking page when an `OAuthAccountNotLinked` error occurs, providing a seamless experience:

- **Server-side redirect**: If email is available in the error URL, users are immediately redirected to `/auth/link-account`
- **Fallback error page**: If email is not available, users see the error page with a countdown timer and manual redirect options
- **Skip option**: Users can skip the countdown and go directly to account linking

## Error Messages

### OAuthAccountNotLinked
- **Title**: "Account Already Exists"
- **Description**: "An account with this email already exists using a different sign-in method."
- **Solutions**:
  - Sign in with password
  - Link accounts
  - Reset password

## Technical Implementation

### Files Modified/Created

1. `components/auth/error-card.tsx` - Enhanced error handling with countdown and auto-redirect
2. `components/auth/login-form.tsx` - Added OAuth error display
3. `components/auth/account-link-form.tsx` - New account linking form
4. `components/auth/social.tsx` - Enhanced OAuth error handling
5. `app/auth/error/page.tsx` - Automatic redirect for OAuth errors
6. `app/auth/link-account/page.tsx` - Account linking page
7. `app/auth/link-success/page.tsx` - Success page
8. `app/test-oauth/page.tsx` - Test page for OAuth error handling
9. `auth.ts` - Updated auth configuration

### Key Features

- **Responsive design** with proper error states
- **Clear user guidance** with multiple solution options
- **Seamless account linking** process
- **Consistent UI/UX** across all auth pages
- **Proper error handling** for all OAuth scenarios

## Testing

To test the OAuth error handling:

1. **Visit the test page**: Go to `/test-oauth` to see all test scenarios
2. **Test automatic redirect**: Click "Test OAuthAccountNotLinked Error" to see automatic redirect
3. **Test manual flow**: Create an account using email/password, then try to sign in with Google using the same email
4. **Verify error handling**: Check that users are automatically redirected to account linking
5. **Test account linking**: Complete the account linking flow
6. **Verify success**: Confirm that linked accounts work correctly

### Test Page

Visit `/test-oauth` to test all OAuth error scenarios without needing to create actual accounts.

## Future Enhancements

- Add support for multiple OAuth providers
- Implement account unlinking functionality
- Add email notifications for account linking
- Provide more detailed error logging

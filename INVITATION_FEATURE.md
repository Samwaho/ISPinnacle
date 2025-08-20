# Organization Member Invitation Feature

This document describes the member invitation functionality implemented for the organization system.

## Overview

The invitation system allows organization administrators to invite new members to their organizations via email. Invited users can accept or reject invitations through a secure link.

## Features

### 1. Send Invitations
- Organization members with `MANAGE_MEMBERS` permission can invite new members
- Invitations include role assignment
- Email notifications are sent with secure invitation links
- Invitations expire after 7 days

### 2. Invitation Management
- View all pending, accepted, and rejected invitations
- Resend expired invitations
- Cancel pending invitations
- Track invitation status and expiration dates

### 3. Invitation Acceptance/Rejection
- Users can accept or reject invitations via email links
- Secure token-based verification
- Automatic role assignment upon acceptance
- User-friendly acceptance/rejection interface

## Database Schema

### OrganizationInvitation Model
```prisma
model OrganizationInvitation {
  id String @id @default(cuid())
  email String
  token String
  organizationId String
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  roleId String
  role OrganizationRole? @relation(fields: [roleId], references: [id], onDelete: Cascade)
  expires DateTime
  status OrganizationInvitationStatus @default(PENDING)

  @@unique([email, organizationId, token])
  @@index([email, organizationId, token])
}
```

### OrganizationInvitationStatus Enum
```prisma
enum OrganizationInvitationStatus {
  PENDING
  ACCEPTED
  REJECTED
}
```

## API Endpoints

### Organization Router
- `POST /api/trpc/organization.inviteMember` - Send invitation
- `GET /api/trpc/organization.getOrganizationInvitations` - Get invitations
- `POST /api/trpc/organization.resendInvitation` - Resend invitation
- `POST /api/trpc/organization.cancelInvitation` - Cancel invitation

### User Router
- `POST /api/trpc/user.acceptInvitation` - Accept invitation
- `POST /api/trpc/user.rejectInvitation` - Reject invitation

## Components

### InvitationForm
- Modal dialog for sending invitations
- Email and role selection
- Form validation and error handling

### Invitation Columns
- Data table columns for displaying invitations
- Status badges and action buttons
- Expiration date display

### Invitation Page
- Public page for accepting/rejecting invitations
- Token and email validation
- User-friendly interface

## Email Templates

### Organization Invitation Email
- Professional HTML email template
- Organization and role information
- Secure invitation link
- Expiration notice

## Security Features

1. **Token-based Verification**: Each invitation has a unique, secure token
2. **Expiration**: Invitations automatically expire after 7 days
3. **Permission Checks**: Only users with appropriate permissions can manage invitations
4. **Duplicate Prevention**: Prevents multiple invitations to the same email
5. **Status Tracking**: Tracks invitation status (pending, accepted, rejected)

## Usage

### Sending an Invitation
1. Navigate to organization details page
2. Go to "Invitations" tab
3. Click "Invite Member" button
4. Enter email address and select role
5. Click "Send Invitation"

### Accepting an Invitation
1. User receives email with invitation link
2. Click link to navigate to invitation page
3. Click "Accept Invitation" to join organization
4. User is automatically added with assigned role

### Managing Invitations
1. View all invitations in the "Invitations" tab
2. Resend expired invitations using the "Resend" action
3. Cancel pending invitations using the "Cancel" action
4. Monitor invitation status and expiration dates

## Environment Variables

Ensure the following environment variables are set:
- `NEXT_PUBLIC_APP_URL` - Base URL for invitation links
- `RESEND_API_KEY` - Email service API key
- `RESEND_FROM_EMAIL` - Sender email address

## Dependencies

- `date-fns` - Date formatting for invitation display
- `resend` - Email service for sending invitations
- `uuid` - Token generation for invitation links

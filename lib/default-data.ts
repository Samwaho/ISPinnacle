import { OrganizationPermission } from "@/lib/generated/prisma";

export const defaultOrganizationRoles = [
  {
    name: "Owner",
    description: "Owner role with all permissions",
    permissions: Object.values(OrganizationPermission),
    isDefault: true,
  },
  {
    name: "Admin",
    description: "Admin role with all permissions",
    permissions: [
      OrganizationPermission.VIEW_ORGANIZATION_DETAILS,
      OrganizationPermission.MANAGE_ORGANIZATION_DETAILS,
      OrganizationPermission.MANAGE_MEMBERS,
      OrganizationPermission.MANAGE_SETTINGS,
      OrganizationPermission.MANAGE_ROLES,
      OrganizationPermission.VIEW_SMS_CONFIGURATION,
      OrganizationPermission.MANAGE_SMS_CONFIGURATION,
    ],
    isDefault: true,
  },
  {
    name: "Member",
    description: "Member role with limited permissions",
    permissions: [
      OrganizationPermission.VIEW_ORGANIZATION_DETAILS,
    ],
    isDefault: true,
  },
];

export const defaultSmsTemplates = [
  {
    name: "welcome_message",
    message: "Welcome to {{organizationName}}! Your internet service has been activated. Your account details: Username: {{username}}, Password: {{password}}. For support, contact us at {{supportNumber}}. Thank you for choosing us!",
    variables: ["organizationName", "username", "password", "supportNumber"],
    isActive: true,
    isDefault: true,
  },
  {
    name: "customer_expiry_reminder",
    message: "Dear {{customerName}}, your internet package expires on {{expiryDate}}. Please renew to avoid service interruption. Contact {{supportNumber}} for assistance. - {{organizationName}}",
    variables: ["customerName", "expiryDate", "supportNumber", "organizationName"],
    isActive: true,
    isDefault: true,
  },
  {
    name: "payment_confirmation",
    message: "Payment received! Amount: KES {{amount}} for {{packageName}}. Your service is active until {{expiryDate}}. Thank you! - {{organizationName}}",
    variables: ["amount", "packageName", "expiryDate", "organizationName"],
    isActive: true,
    isDefault: true,
  },
  {
    name: "service_suspension",
    message: "Dear {{customerName}}, your internet service has been suspended due to non-payment. Please contact {{supportNumber}} to restore service. - {{organizationName}}",
    variables: ["customerName", "supportNumber", "organizationName"],
    isActive: true,
    isDefault: true,
  },
  {
    name: "service_restoration",
    message: "Great news {{customerName}}! Your internet service has been restored. You can now enjoy uninterrupted connectivity. For any issues, contact {{supportNumber}}. - {{organizationName}}",
    variables: ["customerName", "supportNumber", "organizationName"],
    isActive: true,
    isDefault: true,
  },
  {
    name: "maintenance_notice",
    message: "Scheduled maintenance on {{maintenanceDate}} from {{startTime}} to {{endTime}}. Brief service interruption expected. We apologize for any inconvenience. - {{organizationName}}",
    variables: ["maintenanceDate", "startTime", "endTime", "organizationName"],
    isActive: true,
    isDefault: true,
  },
];
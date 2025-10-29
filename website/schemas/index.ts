import { OrganizationPermission } from "@/lib/generated/prisma";
import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    twoFactorToken: z.string().optional(),
});

export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
    invitationToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const resetSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const newPasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    token: z.string().min(1, "Token is required"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const organizationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    logo: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
});

export const updateOrganizationSchema = organizationSchema.extend({
    id: z.string().min(1, "Organization ID is required"),
});

export const memberSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.string().min(1, "Role is required"),
});

export const roleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    permissions: z.array(z.nativeEnum(OrganizationPermission)).optional(),
    memberCount: z.number().optional(),
});

export const createRoleSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    permissions: z.array(z.nativeEnum(OrganizationPermission)),
});

export const updateRoleSchema = z.object({
    id: z.string().min(1, "Role ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    permissions: z.array(z.nativeEnum(OrganizationPermission)),
});

export const deleteRoleSchema = z.object({
    id: z.string().min(1, "Role ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const inviteMemberSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    email: z.string().email("Invalid email address"),
    roleId: z.string().min(1, "Role is required"),
});

export const acceptInvitationSchema = z.object({
    token: z.string().min(1, "Token is required"),
    email: z.string().email("Invalid email address"),
});

export const rejectInvitationSchema = z.object({
    token: z.string().min(1, "Token is required"),
    email: z.string().email("Invalid email address"),
});

export const resendInvitationSchema = z.object({
    invitationId: z.string().min(1, "Invitation ID is required"),
});

export const cancelInvitationSchema = z.object({
    invitationId: z.string().min(1, "Invitation ID is required"),
});

export const updateMemberRoleSchema = z.object({
    memberId: z.string().min(1, "Member ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
    roleId: z.string().optional(), // Optional to allow removing role
});

export const removeMemberSchema = z.object({
    memberId: z.string().min(1, "Member ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

// Station schemas
export const stationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    location: z.string().optional(),
    type: z.enum(["APARTMENT", "HOUSE", "OFFICE", "OTHER"]).default("APARTMENT"),
});

export const createStationSchema = stationSchema.extend({
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateStationSchema = stationSchema.extend({
    id: z.string().min(1, "Station ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const deleteStationSchema = z.object({
    id: z.string().min(1, "Station ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

// Package schemas
export const packageSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.number().positive("Price must be positive"),
    duration: z.number().positive("Duration must be positive"),
    durationType: z.enum(["MONTH", "YEAR", "WEEK", "DAY", "HOUR", "MINUTE"]).default("MONTH"),
    type: z.enum(["PPPOE", "HOTSPOT"]).default("PPPOE"),
    addressPool: z.string().min(1, "Address pool is required"),
    maxDevices: z.number().positive("Max devices must be positive").optional(),
    downloadSpeed: z.number().positive("Download speed must be positive"),
    uploadSpeed: z.number().positive("Upload speed must be positive"),
    burstDownloadSpeed: z.number().positive("Burst download speed must be positive").optional(),
    burstUploadSpeed: z.number().positive("Burst upload speed must be positive").optional(),
    burstThresholdDownload: z.number().positive("Burst threshold download must be positive").optional(),
    burstThresholdUpload: z.number().positive("Burst threshold upload must be positive").optional(),
    burstDuration: z.number().positive("Burst duration must be positive").optional(),
    isActive: z.boolean().default(true),
});

export const createPackageSchema = packageSchema.extend({
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const updatePackageSchema = packageSchema.extend({
    id: z.string().min(1, "Package ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const deletePackageSchema = z.object({
    id: z.string().min(1, "Package ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

// Customer schemas
export const customerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.union([
        z.string().email("Invalid email address"),
        z.literal("")
    ]).optional(),
    phone: z.string().min(1, "Phone is required"),
    address: z.string().optional(),
    expiryDate: z.date().optional(),
    pppoeUsername: z.string().optional(),
    pppoePassword: z.string().optional(),
    hotspotUsername: z.string().optional(),
    hotspotPassword: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).default("ACTIVE"),
    stationId: z.string().optional(),
    packageId: z.string().optional(),
});

export const createCustomerSchema = customerSchema.extend({
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateCustomerSchema = customerSchema.extend({
    id: z.string().min(1, "Customer ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const deleteCustomerSchema = z.object({
    id: z.string().min(1, "Customer ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const mpesaConfigurationSchema = z.object({
    organizationId: z.string(),
    consumerKey: z.string().min(1, "Consumer key is required"),
    consumerSecret: z.string().min(1, "Consumer secret is required"),
    shortCode: z.string().min(1, "Short code is required"),
    passKey: z.string().min(1, "Pass key is required"),
    transactionType: z.enum(["PAYBILL", "BUYGOODS"]).default("PAYBILL"),
  });

// Kopo Kopo configuration
export const kopokopoConfigurationSchema = z.object({
  organizationId: z.string(),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client Secret is required"),
  apiKey: z.string().min(1, "API Key is required"),
  tillNumber: z.string().min(1, "Till number is required"),
});


  export const stkPushSchema = z.object({
    organizationId: z.string(),
    phoneNumber: z.string().regex(/^254\d{9}$/, "Phone number must be in format 254XXXXXXXXX"),
    amount: z.number().positive("Amount must be positive"),
    reference: z.string().min(1, "Reference is required"),
    description: z.string().optional(),
  });

  export const paymentStatusSchema = z.object({
    organizationId: z.string(),
    checkoutRequestId: z.string().min(1, "Checkout request ID is required"),
  });

  export const c2bRegisterSchema = z.object({
    organizationId: z.string(),
    shortCode: z.string().optional(), // Use organization's short code if not provided
  });

  export const c2bSimulateSchema = z.object({
    organizationId: z.string(),
    phoneNumber: z.string().regex(/^254\d{9}$/, "Phone number must be in format 254XXXXXXXXX"),
    amount: z.number().positive("Amount must be positive"),
    billReferenceNumber: z.string().min(1, "Bill reference number is required"),
    commandId: z.enum(["CustomerPayBillOnline", "CustomerBuyGoodsOnline"]).default("CustomerPayBillOnline"),
  });

// Payment Gateway Configuration Schemas
export const paymentGatewaySelectionSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    paymentGateway: z.enum(["MPESA", "KOPOKOPO"]),
});

export const getPaymentGatewayConfigurationSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
});

// Payment Link schemas
export const createPaymentLinkSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    customerId: z.string().min(1, "Customer ID is required"),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().min(1, "Description is required"),
});

export const getPaymentLinkSchema = z.object({
    token: z.string().min(1, "Token is required"),
});

export const processPaymentLinkSchema = z.object({
    token: z.string().min(1, "Token is required"),
    phoneNumber: z.string().regex(/^254\d{9}$/, "Phone number must be in format 254XXXXXXXXX"),
});

// SMS Provider Configuration Schemas
export const smsProviderSelectionSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    smsProvider: z.enum(["TEXT_SMS", "ZETATEL"]),
});

export const smsConfigurationSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    apiKey: z.string().optional(),
    senderId: z.string().optional(),
    partnerId: z.string().optional(),
    userId: z.string().optional(),
    password: z.string().optional(),
});

// SMS Template schemas
export const smsTemplateSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    message: z.string().min(1, "Message is required"),
    variables: z.array(z.string()).default([]),
    isActive: z.boolean().default(true),
});

export const createSmsTemplateSchema = smsTemplateSchema.extend({
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateSmsTemplateSchema = smsTemplateSchema.extend({
    id: z.string().min(1, "Template ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const deleteSmsTemplateSchema = z.object({
    id: z.string().min(1, "Template ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const sendTemplateSmsSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    templateName: z.string().min(1, "Template name is required"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    variables: z.record(z.string(), z.string()).default({}), // Key-value pairs for template variables
});

// Expense schemas
export const expenseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    amount: z.number().positive("Amount must be positive"),
    date: z.date(),
    isRecurring: z.boolean().default(false),
    recurringInterval: z.number().positive("Recurring interval must be positive").optional(),
    recurringIntervalType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
    recurringStartDate: z.date().optional(),
    recurringEndDate: z.date().optional(),
    isPaid: z.boolean().default(false),
    paidAt: z.date().optional(),
});

export const createExpenseSchema = expenseSchema.extend({
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateExpenseSchema = expenseSchema.extend({
    id: z.string().min(1, "Expense ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const deleteExpenseSchema = z.object({
    id: z.string().min(1, "Expense ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

const recurringExpenseTemplateBaseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    amount: z.number().positive("Amount must be positive"),
    interval: z.number().int().positive("Interval must be at least 1"),
    intervalType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
    startDate: z.date(),
    nextRunDate: z.date().optional(),
    endDate: z.date().optional(),
    autoMarkAsPaid: z.boolean().default(false),
    isActive: z.boolean().optional(),
});

export const createRecurringExpenseTemplateSchema = recurringExpenseTemplateBaseSchema.extend({
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const updateRecurringExpenseTemplateSchema = recurringExpenseTemplateBaseSchema.extend({
    id: z.string().min(1, "Recurring template ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const toggleRecurringExpenseTemplateSchema = z.object({
    id: z.string().min(1, "Recurring template ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
    isActive: z.boolean(),
});

export const deleteRecurringExpenseTemplateSchema = z.object({
    id: z.string().min(1, "Recurring template ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});

export const processRecurringExpenseTemplatesSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    templateIds: z.array(z.string()).optional(),
});

// Hotspot voucher schemas (admin-managed)
export const createVoucherSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  packageId: z.string().min(1, "Package is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  amount: z.number().positive("Amount must be positive"),
});

// UI form-only schema (organizationId injected separately)
export const voucherFormSchema = z.object({
  packageId: z.string().min(1, "Package is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
});

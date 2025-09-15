import { createTRPCRouter, protectedProcedure } from "../init";
import { 
  smsProviderSelectionSchema, 
  smsConfigurationSchema,
  createSmsTemplateSchema,
  updateSmsTemplateSchema,
  deleteSmsTemplateSchema,
  sendTemplateSmsSchema
} from "@/schemas";
import { prisma } from "@/lib/db";
import { SmsService } from "@/lib/sms";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { SMSProvider } from "@/lib/generated/prisma";
import { hasPermissions } from "@/lib/server-hooks";
import { OrganizationPermission } from "@/lib/generated/prisma";

export const smsRouter = createTRPCRouter({
  updateSmsProvider: protectedProcedure
    .input(smsProviderSelectionSchema)
    .mutation(async ({ input }) => {
      const { organizationId, smsProvider } = input;
      const canManageSettings = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSettings) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to update SMS provider settings" 
        });
      }

      const organization = await prisma.organization.update({
        where: { id: organizationId },
        data: { smsProvider },
      });

      return {
        success: true,
        message: "SMS provider updated successfully",
        organization: {
          id: organization.id,
          smsProvider: organization.smsProvider,
        },
      };
    }),

  getSmsConfiguration: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view SMS configuration" 
        });
      }

      const configuration = await prisma.sMSConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      return configuration;
    }),

  updateSmsConfiguration: protectedProcedure
    .input(smsConfigurationSchema)
    .mutation(async ({ input }) => {
      const { organizationId, ...configData } = input;
      const canManageSms = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to update SMS configuration" 
        });
      }

      // Get organization to check SMS provider
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { smsProvider: true },
      });

      if (!organization?.smsProvider) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Please select an SMS provider first" 
        });
      }

      // Validate required fields based on provider
      if (organization.smsProvider === SMSProvider.TEXT_SMS) {
        if (!configData.apiKey || !configData.senderId || !configData.partnerId) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "API Key, Sender ID, and Partner ID are required for TextSMS" 
          });
        }
      }

      const configuration = await prisma.sMSConfiguration.upsert({
        where: { organizationId },
        update: configData,
        create: {
          organizationId,
          ...configData,
        },
      });

      return {
        success: true,
        message: "SMS configuration updated successfully",
        configuration,
      };
    }),

  deleteSmsConfiguration: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to delete SMS configuration" 
        });
      }

      await prisma.sMSConfiguration.delete({
        where: { organizationId: input.organizationId },
      });

      return {
        success: true,
        message: "SMS configuration deleted successfully",
      };
    }),

  testSmsConfiguration: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      phoneNumber: z.string(),
      message: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to test SMS configuration" 
        });
      }

      const testMessage = input.message || "Test message from ISPinnacle";
      
      const result = await SmsService.sendSms({
        organizationId: input.organizationId,
        phoneNumber: input.phoneNumber,
        message: testMessage,
      });

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Test SMS sent successfully",
        response: result.response,
      };
    }),

  sendSms: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      phoneNumber: z.string(),
      message: z.string()
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to send SMS" 
        });
      }

      const result = await SmsService.sendSms({
        organizationId: input.organizationId,
        phoneNumber: input.phoneNumber,
        message: input.message,
      });

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "SMS sent successfully",
        response: result.response,
      };
    }),

  sendBulkSms: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      recipients: z.array(z.object({
        phoneNumber: z.string(),
        message: z.string(),
      }))
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to send bulk SMS" 
        });
      }

      const results = await SmsService.sendBulkSms(
        input.organizationId,
        input.recipients
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: failureCount === 0,
        message: `Bulk SMS completed: ${successCount} sent, ${failureCount} failed`,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
      };
    }),

  getDeliveryStatus: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      messageId: z.string()
    }))
    .query(async ({ input }) => {
      const canViewSms = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canViewSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view SMS delivery status" 
        });
      }

      const result = await SmsService.getDeliveryStatus(
        input.organizationId,
        input.messageId
      );

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Delivery status retrieved successfully",
        response: result.response,
      };
    }),

  getAccountBalance: protectedProcedure
    .input(z.object({ 
      organizationId: z.string()
    }))
    .query(async ({ input }) => {
      const canViewSms = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canViewSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view SMS account balance" 
        });
      }

      const result = await SmsService.getAccountBalance(
        input.organizationId
      );

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Account balance retrieved successfully",
        response: result.response,
      };
    }),

  // SMS Template procedures
  createSmsTemplate: protectedProcedure
    .input(createSmsTemplateSchema)
    .mutation(async ({ input }) => {
      const { organizationId, ...templateData } = input;
      const canManageSms = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_SMS_CONFIGURATION]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to create SMS templates" 
        });
      }

      const template = await prisma.sMSTemplate.create({
        data: {
          organizationId,
          ...templateData,
        },
      });

      return {
        success: true,
        message: "SMS template created successfully",
        template,
      };
    }),

  getSmsTemplates: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const canViewSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canViewSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view SMS templates" 
        });
      }

      const templates = await prisma.sMSTemplate.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });

      return templates;
    }),

  updateSmsTemplate: protectedProcedure
    .input(updateSmsTemplateSchema)
    .mutation(async ({ input }) => {
      const { id, organizationId, ...templateData } = input;
      const canManageSms = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_SMS_CONFIGURATION]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to update SMS templates" 
        });
      }

      const template = await prisma.sMSTemplate.update({
        where: { id },
        data: templateData,
      });

      return {
        success: true,
        message: "SMS template updated successfully",
        template,
      };
    }),

  deleteSmsTemplate: protectedProcedure
    .input(deleteSmsTemplateSchema)
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SMS_CONFIGURATION]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to delete SMS templates" 
        });
      }

      await prisma.sMSTemplate.delete({
        where: { id: input.id },
      });

      return {
        success: true,
        message: "SMS template deleted successfully",
      };
    }),

  sendTemplateSms: protectedProcedure
    .input(sendTemplateSmsSchema)
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to send template SMS" 
        });
      }

      const result = await SmsService.sendTemplateSms(input);

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Template SMS sent successfully",
        response: result.response,
      };
    }),

  sendBulkTemplateSms: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      templateName: z.string(),
      recipients: z.array(z.object({
        phoneNumber: z.string(),
        variables: z.record(z.string(), z.string()),
      }))
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to send bulk template SMS" 
        });
      }

      const results = await SmsService.sendBulkTemplateSms(
        input.organizationId,
        input.templateName,
        input.recipients
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: failureCount === 0,
        message: `Bulk template SMS completed: ${successCount} sent, ${failureCount} failed`,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
        },
      };
    }),

  createDefaultTemplates: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      organizationName: z.string(),
      supportNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SMS_CONFIGURATION]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to create default SMS templates" 
        });
      }

      const result = await SmsService.createDefaultTemplates(input);

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Default SMS templates created successfully",
        response: result.response,
      };
    }),

  sendWelcomeMessage: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      phoneNumber: z.string(),
      customerName: z.string(),
      username: z.string(),
      password: z.string(),
      organizationName: z.string(),
      supportNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to send welcome messages" 
        });
      }

      const result = await SmsService.sendWelcomeMessage(
        input.organizationId,
        input.phoneNumber,
        input.customerName,
        input.username,
        input.password,
        input.organizationName,
        input.supportNumber
      );

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Welcome message sent successfully",
        response: result.response,
      };
    }),

  sendExpiryReminder: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      phoneNumber: z.string(),
      customerName: z.string(),
      expiryDate: z.string(),
      organizationName: z.string(),
      supportNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      const canManageSms = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManageSms) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to send expiry reminders" 
        });
      }

      const result = await SmsService.sendExpiryReminder(
        input.organizationId,
        input.phoneNumber,
        input.customerName,
        input.expiryDate,
        input.organizationName,
        input.supportNumber
      );

      if (!result.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: result.message 
        });
      }

      return {
        success: true,
        message: "Expiry reminder sent successfully",
        response: result.response,
      };
    }),
});

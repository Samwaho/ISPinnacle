import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { hasPermissions } from "@/lib/server-hooks";
import crypto from "crypto";
import { mpesaConfigurationSchema, stkPushSchema, paymentStatusSchema, c2bRegisterSchema, c2bSimulateSchema } from "@/schemas";

// M-Pesa API schemas


// M-Pesa API helper functions
class MpesaAPI {
  private consumerKey: string;
  private consumerSecret: string;
  private shortCode: string;
  private passKey: string;
  private transactionType: "PAYBILL" | "BUYGOODS";
  private baseUrl: string;

  constructor(config: {
    consumerKey: string;
    consumerSecret: string;
    shortCode: string;
    passKey: string;
    transactionType: "PAYBILL" | "BUYGOODS";
  }) {
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.shortCode = config.shortCode;
    this.passKey = config.passKey;
    this.transactionType = config.transactionType;
    this.baseUrl = process.env.NODE_ENV === "production" 
      ? "https://api.safaricom.co.ke" 
      : "https://sandbox.safaricom.co.ke";
  }

  private async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    
    const response = await fetch(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generatePassword(): string {
    const timestamp = this.generateTimestamp();
    const password = `${this.shortCode}${this.passKey}${timestamp}`;
    return Buffer.from(password).toString('base64');
  }

  async initiateSTKPush(phoneNumber: string, amount: number, reference: string, description?: string) {
    const accessToken = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword();

    const payload = {
      BusinessShortCode: this.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: this.transactionType === "PAYBILL" ? "CustomerPayBillOnline" : "CustomerBuyGoodsOnline",
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: this.shortCode,
      PhoneNumber: phoneNumber,
      CallBackURL: `${process.env.CALLBACK_URL}/api/mpesa/callback`,
      AccountReference: reference,
      TransactionDesc: description || "Payment",
    };

    const response = await fetch(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`STK Push failed: ${errorData.errorMessage || response.statusText}`);
    }

    return await response.json();
  }

  async checkPaymentStatus(checkoutRequestId: string) {
    const accessToken = await this.getAccessToken();
    const timestamp = this.generateTimestamp();
    const password = this.generatePassword();

    const payload = {
      BusinessShortCode: this.shortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await fetch(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Payment status check failed: ${errorData.errorMessage || response.statusText}`);
    }

    return await response.json();
  }

  // C2B API methods
  async registerC2BUrls(confirmationUrl: string, validationUrl: string, shortCode?: string) {
    const accessToken = await this.getAccessToken();
    const businessShortCode = shortCode || this.shortCode;
    console.log("Access token:", accessToken);
    console.log("Business short code:", businessShortCode);
    console.log("Confirmation URL:", confirmationUrl);
    console.log("Validation URL:", validationUrl);
    const payload = {
      ShortCode: businessShortCode,
      ResponseType: "Completed",
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    };

    const response = await fetch(`${this.baseUrl}/mpesa/c2b/v1/registerurl`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log("C2B URL registration response:", response);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`C2B URL registration failed: ${errorData.errorMessage || response.statusText}`);
    }

    return await response.json();
  }

  async simulateC2BPayment(phoneNumber: string, amount: number, billReferenceNumber: string, commandId: string) {
    const accessToken = await this.getAccessToken();

    const payload = {
      ShortCode: this.shortCode,
      CommandID: commandId,
      Amount: Math.round(amount),
      Msisdn: phoneNumber,
      BillReferenceNumber: billReferenceNumber,
    };

    const response = await fetch(`${this.baseUrl}/mpesa/c2b/v1/simulate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`C2B simulation failed: ${errorData.errorMessage || response.statusText}`);
    }

    return await response.json();
  }
}

export const mpesaRouter = createTRPCRouter({
  // Configure M-Pesa settings for an organization
  configureMpesa: protectedProcedure
    .input(mpesaConfigurationSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManage) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to configure M-Pesa settings" 
        });
      }

      const configuration = await prisma.mpesaConfiguration.upsert({
        where: { organizationId: input.organizationId },
        update: {
          consumerKey: input.consumerKey,
          consumerSecret: input.consumerSecret,
          shortCode: input.shortCode,
          passKey: input.passKey,
          transactionType: input.transactionType,
        },
        create: {
          organizationId: input.organizationId,
          consumerKey: input.consumerKey,
          consumerSecret: input.consumerSecret,
          shortCode: input.shortCode,
          passKey: input.passKey,
          transactionType: input.transactionType,
        },
      });

      return {
        success: true,
        message: "M-Pesa configuration updated successfully",
        configuration: {
          id: configuration.id,
          shortCode: configuration.shortCode,
          transactionType: configuration.transactionType,
          createdAt: configuration.createdAt,
          updatedAt: configuration.updatedAt,
        },
      };
    }),

  // Get M-Pesa configuration for an organization
  getMpesaConfiguration: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view M-Pesa settings" 
        });
      }

      const configuration = await prisma.mpesaConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        return {
          success: true,
          configuration: null,
        };
      }

      return {
        success: true,
        configuration: {
          id: configuration.id,
          consumerKey: configuration.consumerKey,
          consumerSecret: configuration.consumerSecret,
          shortCode: configuration.shortCode,
          passKey: configuration.passKey,
          transactionType: configuration.transactionType,
          createdAt: configuration.createdAt,
          updatedAt: configuration.updatedAt,
        },
      };
    }),

  // Initiate STK Push payment
  initiatePayment: protectedProcedure
    .input(stkPushSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_CUSTOMERS]);
      if (!canManage) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to initiate payments" 
        });
      }

      // Get M-Pesa configuration
      const configuration = await prisma.mpesaConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "M-Pesa configuration not found. Please configure M-Pesa settings first." 
        });
      }

      try {
        const mpesaAPI = new MpesaAPI({
          consumerKey: configuration.consumerKey,
          consumerSecret: configuration.consumerSecret,
          shortCode: configuration.shortCode,
          passKey: configuration.passKey,
          transactionType: configuration.transactionType,
        });

        const result = await mpesaAPI.initiateSTKPush(
          input.phoneNumber,
          input.amount,
          input.reference,
          input.description
        );


        return {
          success: true,
          message: "Payment initiated successfully",
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID,
        };
      } catch (error) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: `Failed to initiate payment: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),

  // Check payment status
  checkPaymentStatus: protectedProcedure
    .input(paymentStatusSchema)
    .query(async ({ input, ctx }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_CUSTOMERS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to check payment status" 
        });
      }

      // Get M-Pesa configuration
      const configuration = await prisma.mpesaConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "M-Pesa configuration not found" 
        });
      }

      try {
        const mpesaAPI = new MpesaAPI({
          consumerKey: configuration.consumerKey,
          consumerSecret: configuration.consumerSecret,
          shortCode: configuration.shortCode,
          passKey: configuration.passKey,
          transactionType: configuration.transactionType,
        });

        const result = await mpesaAPI.checkPaymentStatus(input.checkoutRequestId);

        return {
          success: true,
          status: result.ResultCode,
          statusMessage: result.ResultDesc,
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID,
        };
      } catch (error) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: `Failed to check payment status: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),

  // Get payment history for an organization
  getPaymentHistory: protectedProcedure
    .input(z.object({ 
      organizationId: z.string(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_CUSTOMERS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view payment history" 
        });
      }

      const payments = await prisma.organizationCustomerPayment.findMany({
        where: { organizationId: input.organizationId },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });

      const total = await prisma.organizationCustomerPayment.count({
        where: { organizationId: input.organizationId },
      });

      return {
        success: true,
        payments,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  // C2B URL Registration
  registerC2BUrls: protectedProcedure
    .input(c2bRegisterSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManage) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to configure C2B settings" 
        });
      }

      // Get M-Pesa configuration
      const configuration = await prisma.mpesaConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "M-Pesa configuration not found. Please configure M-Pesa settings first." 
        });
      }

      try {
        const mpesaAPI = new MpesaAPI({
          consumerKey: configuration.consumerKey,
          consumerSecret: configuration.consumerSecret,
          shortCode: configuration.shortCode,
          passKey: configuration.passKey,
          transactionType: configuration.transactionType,
        });

        const result = await mpesaAPI.registerC2BUrls(
          `${process.env.CALLBACK_URL}/api/mp/c2b/confirmation`,
          `${process.env.CALLBACK_URL}/api/mp/c2b/validation`,
          input.shortCode
        );

        return {
          success: true,
          message: "C2B URLs registered successfully",
          result,
        };
      } catch (error) {
        console.error("Error registering C2B URLs:", error);
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: `Failed to register C2B URLs: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),

  // C2B Payment Simulation (for testing)
  simulateC2BPayment: protectedProcedure
    .input(c2bSimulateSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_CUSTOMERS]);
      if (!canManage) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to simulate C2B payments" 
        });
      }

      // Get M-Pesa configuration
      const configuration = await prisma.mpesaConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "M-Pesa configuration not found" 
        });
      }

      try {
        const mpesaAPI = new MpesaAPI({
          consumerKey: configuration.consumerKey,
          consumerSecret: configuration.consumerSecret,
          shortCode: configuration.shortCode,
          passKey: configuration.passKey,
          transactionType: configuration.transactionType,
        });

        const result = await mpesaAPI.simulateC2BPayment(
          input.phoneNumber,
          input.amount,
          input.billReferenceNumber,
          input.commandId
        );



        return {
          success: true,
          message: "C2B payment simulation initiated successfully",
          result,
        };
      } catch (error) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: `Failed to simulate C2B payment: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }),
});


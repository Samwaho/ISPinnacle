import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { hasPermissions } from "@/lib/server-hooks";
import { kopokopoConfigurationSchema, stkPushSchema } from "@/schemas";

export class KopoKopoAPI {
  private clientId: string;
  private clientSecret: string;
  private apiKey: string;
  private tillNumber: string;
  private baseUrl: string;

  constructor(config: { clientId: string; clientSecret: string; apiKey: string; tillNumber: string }) {
    this.clientId = config.clientId.trim();
    this.clientSecret = config.clientSecret.trim();
    this.apiKey = config.apiKey.trim();
    this.tillNumber = config.tillNumber.trim();
    const configuredBaseUrl = process.env.KOPOKOPO_BASE_URL?.trim();
    this.baseUrl =
      configuredBaseUrl && configuredBaseUrl.length > 0
        ? configuredBaseUrl
        : process.env.NODE_ENV === "production"
        ? "https://api.kopokopo.com"
        : "https://sandbox.kopokopo.com";
  }

  private mask(value: string) {
    if (!value) return "";
    if (value.length <= 4) return "*".repeat(value.length);
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  }

  private async getAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
    });

    console.debug("[K2] Requesting access token", {
      baseUrl: this.baseUrl,
      clientIdMasked: this.mask(this.clientId),
      clientIdLength: this.clientId.length,
      clientSecretPresent: Boolean(this.clientSecret),
    });

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "ispinnacle/1.0",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[K2] Token request failed", {
        status: res.status,
        statusText: res.statusText,
        baseUrl: res.url,
        clientIdMasked: this.mask(this.clientId),
        responseSnippet: text.slice(0, 500),
      });
      throw new Error(`K2 token error: ${res.status} ${text}`);
    }

    const data = await res.json();
    console.debug("[K2] Token request succeeded", {
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      baseUrl: this.baseUrl,
    });
    return data.access_token as string;
  }

  async initiateIncomingPayment(params: { phoneNumber: string; amount: number; reference: string; description?: string }) {
    const accessToken = await this.getAccessToken();

    const customerPhone = params.phoneNumber.startsWith("+") ? params.phoneNumber : `+${params.phoneNumber}`;

    const payload: {
      payment_channel: string;
      till_number: string;
      subscriber: {
        phone_number: string;
      };
      amount: {
        currency: string;
        value: string;
      };
      metadata: {
        reference: string;
        notes?: string;
      };
      _links: {
        callback_url: string;
      };
    } = {
      payment_channel: "M-PESA STK Push",
      till_number: this.tillNumber,
      subscriber: {
        phone_number: customerPhone,
      },
      metadata: {
        reference: params.reference,
        ...(params.description ? { notes: params.description } : {}),
      },
      amount: {
        currency: "KES",
        value: Number(params.amount).toFixed(2),
      },
      _links: {
        callback_url: `${process.env.CALLBACK_URL}/api/k2/callback`,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/v1/incoming_payments`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "ispinnacle/1.0",
        "Idempotency-Key": `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.status !== 201) {
      const text = await res.text();
      console.error("K2 incoming_payments error:", {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        headers: Object.fromEntries(res.headers.entries()),
        body: text?.slice(0, 2000),
        payload: {
          ...payload,
          subscriber: { phone_number: "***masked***" },
        },
      });
      throw new Error(`Incoming payment failed: ${res.status} ${text}`);
    }

    const location = res.headers.get("Location") || res.headers.get("location");
    return { location };
  }
}

export const kopokopoRouter = createTRPCRouter({
  // Configure Kopo Kopo settings for an organization
  configureKopokopo: protectedProcedure
    .input(kopokopoConfigurationSchema)
    .mutation(async ({ input }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to configure Kopo Kopo settings",
        });
      }

      const configuration = await prisma.kopokopoConfiguration.upsert({
        where: { organizationId: input.organizationId },
        update: {
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          apiKey: input.apiKey,
          tillNumber: input.tillNumber,
        },
        create: {
          organizationId: input.organizationId,
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          apiKey: input.apiKey,
          tillNumber: input.tillNumber,
        },
      });

      return {
        success: true,
        message: "Kopo Kopo configuration updated successfully",
        configuration: {
          id: configuration.id,
          tillNumber: configuration.tillNumber,
          createdAt: configuration.createdAt,
          updatedAt: configuration.updatedAt,
        },
      };
    }),

  // Get Kopo Kopo configuration for an organization
  getKopokopoConfiguration: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_SETTINGS]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view Kopo Kopo settings",
        });
      }

      const configuration = await prisma.kopokopoConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        return { success: true, configuration: null };
      }

      return {
        success: true,
        configuration: {
          id: configuration.id,
          clientId: configuration.clientId,
          clientSecret: configuration.clientSecret,
          apiKey: configuration.apiKey,
          tillNumber: configuration.tillNumber,
          createdAt: configuration.createdAt,
          updatedAt: configuration.updatedAt,
        },
      };
    }),

  // Initiate Kopo Kopo STK payment (Incoming Payment)
  initiatePayment: baseProcedure
    .input(stkPushSchema)
    .mutation(async ({ input }) => {
      const configuration = await prisma.kopokopoConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      if (!configuration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Kopo Kopo configuration not found. Please configure Kopo Kopo first.",
        });
      }

      try {
        const k2 = new KopoKopoAPI({
          clientId: configuration.clientId,
          clientSecret: configuration.clientSecret,
          apiKey: configuration.apiKey,
          tillNumber: configuration.tillNumber,
        });

        const result = await k2.initiateIncomingPayment({
          phoneNumber: input.phoneNumber,
          amount: input.amount,
          reference: input.reference,
          description: input.description,
        });

        return {
          success: true,
          message: "Payment initiated successfully",
          location: result.location,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to initiate Kopo Kopo payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});

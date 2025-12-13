import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { jengaConfigurationSchema } from "@/schemas";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { hasPermissions } from "@/lib/server-hooks";
import crypto from "crypto";
import { hotspotUtils } from "@/lib/hotspot-config";

type JengaConfig = {
  merchantCode: string;
  apiKey: string;
  apiSecret: string;
  baseUrl?: string | null;
};

type PaymentLinkParams = {
  amount: number;
  description: string;
  reference: string;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  redirectUrl?: string;
};

export class JengaAPI {
  private merchantCode: string;
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private callbackUrl?: string;

  constructor(config: JengaConfig) {
    this.merchantCode = config.merchantCode;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.callbackUrl = process.env.CALLBACK_URL?.replace(/\/$/, "");
    this.baseUrl =
      config.baseUrl ||
      process.env.JENGA_BASE_URL ||
      "https://uat.finserve.africa";
  }

  private getDefaultRedirectUrl() {
    return (
      this.callbackUrl ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://v3.jengahq.io"
    );
  }

  private async getAccessToken(): Promise<string> {
    const manualToken = process.env.JENGA_ACCESS_TOKEN;
    if (manualToken) return manualToken;

    const tokenEndpoint =
      process.env.JENGA_AUTH_URL ||
      `${this.baseUrl}/v3-apis/oauth2/token`;

    const body = "grant_type=client_credentials";
    const auth = Buffer.from(
      `${this.apiKey}:${this.apiSecret}`,
      "utf8"
    ).toString("base64");

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Failed to obtain Jenga access token (${res.status}): ${text}`
      );
    }

    const data = await res.json();
    const token: string | undefined =
      data.access_token || data.accessToken || data.token;
    if (!token) {
      throw new Error("Jenga token response missing access token");
    }
    return token;
  }

  private buildSignature(args: {
    expiryDate: string;
    amount: number;
    currency: string;
    amountOption: string;
    externalRef: string;
  }) {
    const raw = `${args.expiryDate}+${args.amount}+${args.currency}+${args.amountOption}+${args.externalRef}`;
    return crypto
      .createHmac("sha256", this.apiSecret)
      .update(raw)
      .digest("hex");
  }

  async createPaymentLink(params: PaymentLinkParams) {
    const token = await this.getAccessToken();
    const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const saleDate = new Date().toISOString().slice(0, 10);
    const amountOption = "RESTRICTED";
    const currency = "KES";
    const externalRef = params.reference;
    const redirectUrl = params.redirectUrl || this.getDefaultRedirectUrl();

    const signature = this.buildSignature({
      expiryDate,
      amount: params.amount,
      currency,
      amountOption,
      externalRef,
    });

    const [firstName, ...rest] = (params.customer.name || "Customer").split(
      " "
    );
    const lastName = rest.join(" ").trim() || "Payment";

    const normalizedPhone = params.customer.phone
      ? hotspotUtils.normalizePhoneNumber(params.customer.phone)
      : undefined;

    const body = {
      customers: [
        {
          firstName,
          lastName,
          email: params.customer.email || undefined,
          phoneNumber: normalizedPhone,
          firstAddress: "",
          countryCode: "KE",
          postalOrZipCode: "00100",
          customerExternalRef: externalRef,
        },
      ],
      paymentLink: {
        expiryDate,
        saleDate,
        paymentLinkType: "SINGLE",
        saleType: "SERVICE",
        name: params.description,
        description: params.description,
        externalRef,
        paymentLinkRef: "",
        redirectURL: redirectUrl,
        amountOption,
        amount: params.amount,
        currency,
      },
      notifications: ["SMS", "EMAIL"],
    };

    const res = await fetch(
      `${this.baseUrl}/v3-apis/payment-api/v3.0/payment-link/create`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Signature: signature,
          "X-Merchant-Code": this.merchantCode,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Jenga payment link failed (${res.status}): ${text || res.statusText}`
      );
    }

    const data = await res.json();
    const paymentLinkRef: string | undefined =
      data?.data?.paymentLinkRef || data?.paymentLinkRef;

    return {
      raw: data,
      paymentLinkRef,
      externalRef,
      redirectUrl,
    };
  }
}

export const jengaRouter = createTRPCRouter({
  configureJenga: protectedProcedure
    .input(jengaConfigurationSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [
        OrganizationPermission.MANAGE_SETTINGS,
      ]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to configure Jenga settings",
        });
      }

      const configuration = await prisma.jengaConfiguration.upsert({
        where: { organizationId: input.organizationId },
        update: {
          merchantCode: input.merchantCode,
          apiKey: input.apiKey,
          apiSecret: input.apiSecret,
          baseUrl: input.baseUrl,
        },
        create: {
          organizationId: input.organizationId,
          merchantCode: input.merchantCode,
          apiKey: input.apiKey,
          apiSecret: input.apiSecret,
          baseUrl: input.baseUrl,
        },
      });

      return {
        success: true,
        message: "Jenga configuration saved",
        configuration,
      };
    }),

  getJengaConfiguration: protectedProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.MANAGE_SETTINGS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view Jenga settings",
        });
      }

      const configuration = await prisma.jengaConfiguration.findUnique({
        where: { organizationId: input.organizationId },
      });

      return { success: true, configuration };
    }),
});

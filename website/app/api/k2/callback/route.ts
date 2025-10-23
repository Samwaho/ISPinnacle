import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { processCustomerPayment, storeKopoKopoTransaction } from "@/lib/server-hooks";
import { SmsService } from '@/lib/sms';

// Helper function to convert duration to milliseconds
function getDurationInMs(durationType: string): number {
  switch (durationType) {
    case 'MINUTE':
      return 60 * 1000;
    case 'HOUR':
      return 60 * 60 * 1000;
    case 'DAY':
      return 24 * 60 * 60 * 1000;
    case 'WEEK':
      return 7 * 24 * 60 * 60 * 1000;
    case 'MONTH':
      return 30 * 24 * 60 * 60 * 1000;
    case 'YEAR':
      return 365 * 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000; // Default to 1 hour
  }
}

function hmacSha256Hex(key: string, data: string) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function pick<T = unknown>(obj: unknown, path: string[]): T | undefined {
  try {
    return path.reduce((acc: unknown, k: string) => {
      if (acc && typeof acc === 'object' && acc !== null && k in acc) {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, obj) as T | undefined;
  } catch {
    return undefined;
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();

    console.log("K2 webhook received:", raw);

    const signature = request.headers.get("x-kopokopo-signature") || request.headers.get("X-KopoKopo-Signature");
    if (!signature) {
      return NextResponse.json({ success: false, message: "Missing signature" }, { status: 401 });
    }

    const body = JSON.parse(raw);

    // Try to identify the till number to fetch the organization + apiKey
    const tillNumber =
      pick<string>(body, ["event", "resource", "till_number"]) ||
      pick<string>(body, ["data", "attributes", "till_number"]) ||
      pick<string>(body, ["event", "resource", "tillNumber"]) ||
      pick<string>(body, ["data", "attributes", "resource", "till_number"]) ||
      pick<string>(body, ["data", "attributes", "event", "resource", "till_number"]) ||
      "";

    if (!tillNumber) {
      return NextResponse.json(
        { success: false, message: "Unable to determine till number from payload" },
        { status: 400 }
      );
    }

    // Get K2 configuration by till number
    const k2Config = await prisma.kopokopoConfiguration.findFirst({ where: { tillNumber } });
    if (!k2Config) {
      return NextResponse.json(
        { success: false, message: `No Kopo Kopo configuration for till ${tillNumber}` },
        { status: 404 }
      );
    }

    // Verify HMAC signature with apiKey
    const computed = hmacSha256Hex(k2Config.apiKey, raw);
    if (computed !== signature) {
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }

    // Normalized accessors
    const resource =
      pick<Record<string, unknown>>(body, ["event", "resource"]) ||
      pick<Record<string, unknown>>(body, ["data", "attributes", "event", "resource"]) ||
      pick<Record<string, unknown>>(body, ["data", "attributes", "resource"]) ||
      pick<Record<string, unknown>>(body, ["data", "attributes"]) ||
      {};

    const topic: string | undefined = body?.topic || body?.data?.type || undefined;
    const status: string = (resource?.status || body?.data?.attributes?.status || "").toString();
    const amountStr: string | number = resource?.amount ?? body?.data?.attributes?.amount ?? 0;
    const amount = typeof amountStr === "string" ? parseFloat(amountStr) : Number(amountStr);

    const phone: string =
      (resource?.sender_phone_number as string) ||
      (resource?.msisdn as string) ||
      ((resource?.customer as Record<string, unknown>)?.phone_number as string) ||
      "";

    const transactionId: string = (resource?.reference as string) || (body?.data?.attributes?.reference as string) || (resource?.id as string) || (body?.id as string) || (body?.data?.id as string) || "";

    // metadata reference we set during initiation
    const metadataRef: string | undefined =
      ((resource?.metadata as Record<string, unknown>)?.reference as string) ||
      (body?.metadata?.reference as string) ||
      ((body?.data?.attributes?.metadata as Record<string, unknown>)?.reference as string) ||
      undefined;

    const mpesaRef: string | undefined = (resource?.reference as string) || (body?.data?.attributes?.reference as string) || undefined;

    const accountReference = metadataRef || mpesaRef || transactionId;

    const originationTime = resource?.origination_time
      ? new Date(resource.origination_time as string | number | Date)
      : new Date();

    // Log received webhook
    console.log("Kopo Kopo webhook received:", JSON.stringify({ topic, status, amount, phone, tillNumber, accountReference, transactionId }, null, 2));

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, message: "Invalid amount" }, { status: 400 });
    }

    if (!phone) {
      // Not fatal for storage, but warn - we'll still store
      console.warn("K2 webhook: missing phone number in payload");
    }

    // Treat statuses: Received/Success -> successful payment
    const isSuccess = /received|success/i.test(status);

    // Persist transaction for audit (store under BUYGOODS type)
    try {
      await storeKopoKopoTransaction(
        transactionId || mpesaRef || accountReference,
        amount,
        originationTime,
        tillNumber,
        phone || "",
        phone || "",
        accountReference,
        mpesaRef || transactionId || "",
        0
      );
    } catch (err) {
      console.error("Failed to store Kopo Kopo transaction:", err);
      // Continue - don't fail webhook
    }

    if (isSuccess && accountReference) {
      // First check if this is a hotspot voucher payment
      const hotspotVoucher = await prisma.hotspotVoucher.findFirst({
        where: {
          paymentReference: accountReference,
        },
        include: {
          package: true,
          organization: true,
        },
      });

      if (hotspotVoucher) {
        // Update voucher status to active
        const updated = await prisma.hotspotVoucher.update({
          where: { id: hotspotVoucher.id },
          data: { 
            status: 'ACTIVE',
            paymentReference: transactionId, // Update with actual payment ID
          }
        });

        console.log(`Hotspot voucher activated via KopoKopo. Voucher ID: ${hotspotVoucher.id}, Payment ID: ${transactionId}`);

        // Attempt to send voucher SMS to the purchaser
        try {
          const org = await prisma.organization.findUnique({
            where: { id: updated.organizationId },
            select: { name: true }
          });

          const pkg = await prisma.organizationPackage.findUnique({
            where: { id: updated.packageId },
            select: { name: true, price: true, duration: true, durationType: true }
          });

          // Calculate actual usage expiry (when voucher duration expires after first use)
          const usageExpiry = updated.lastUsedAt ? 
            new Date(updated.lastUsedAt.getTime() + (getDurationInMs(pkg?.durationType || 'HOUR') * (pkg?.duration || 1))) :
            new Date(updated.expiresAt || new Date());
          
          const expiry = usageExpiry.toLocaleString();
          console.log('Hotspot: attempting to send voucher SMS (KopoKopo)', {
            organizationId: updated.organizationId,
            phoneNumber: updated.phoneNumber,
            voucherCode: updated.voucherCode,
            packageName: pkg?.name,
            amount: pkg?.price ?? amount,
            expiryDate: expiry,
            usageExpiry: usageExpiry.toISOString()
          });

          const smsResult = await SmsService.sendTemplateSms({
            organizationId: updated.organizationId,
            templateName: 'hotspot_voucher',
            phoneNumber: updated.phoneNumber,
            variables: {
              voucherCode: updated.voucherCode,
              packageName: pkg?.name || 'Hotspot Package',
              amount: String(pkg?.price ?? amount ?? ''),
              expiryDate: expiry,
              organizationName: org?.name || 'ISPinnacle',
            }
          });
          console.log('Hotspot: voucher SMS send result (KopoKopo)', smsResult);
        } catch (smsError) {
          console.error('Failed to send hotspot voucher SMS (KopoKopo):', smsError);
        }
      } else {
        // Handle regular customer payment
        try {
          await processCustomerPayment(accountReference, amount);
          console.log("Customer payment processed for:", accountReference);
        } catch (err) {
          console.error("Failed to process customer payment:", err);
          // Continue - respond success so K2 doesn't retry unnecessarily
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (error) {
    console.error("Error processing Kopo Kopo webhook:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "Kopo Kopo callback endpoint is working", timestamp: new Date().toISOString() });
}


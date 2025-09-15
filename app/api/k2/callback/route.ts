import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { processCustomerPayment, storeKopoKopoTransaction } from "@/lib/server-hooks";

function hmacSha256Hex(key: string, data: string) {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function pick<T = any>(obj: any, path: string[]): T | undefined {
  try {
    return path.reduce((acc: any, k: string) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
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
      pick<any>(body, ["event", "resource"]) ||
      pick<any>(body, ["data", "attributes", "event", "resource"]) ||
      pick<any>(body, ["data", "attributes", "resource"]) ||
      pick<any>(body, ["data", "attributes"]) ||
      {};

    const topic: string | undefined = body?.topic || body?.data?.type || undefined;
    const status: string = (resource?.status || body?.data?.attributes?.status || "").toString();
    const amountStr: string | number = resource?.amount ?? body?.data?.attributes?.amount ?? 0;
    const amount = typeof amountStr === "string" ? parseFloat(amountStr) : Number(amountStr);

    const phone: string =
      resource?.sender_phone_number ||
      resource?.msisdn ||
      resource?.customer?.phone_number ||
      "";

    const transactionId: string = (resource?.reference || body?.data?.attributes?.reference || resource?.id || body?.id || body?.data?.id || "");

    // metadata reference we set during initiation
    const metadataRef: string | undefined =
      resource?.metadata?.reference ||
      body?.metadata?.reference ||
      body?.data?.attributes?.metadata?.reference ||
      undefined;

    const mpesaRef: string | undefined = resource?.reference || body?.data?.attributes?.reference || undefined;

    const accountReference = metadataRef || mpesaRef || transactionId;

    const originationTime = resource?.origination_time
      ? new Date(resource.origination_time)
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
      try {
        await processCustomerPayment(accountReference, amount);
        console.log("Customer payment processed for:", accountReference);
      } catch (err) {
        console.error("Failed to process customer payment:", err);
        // Continue - respond success so K2 doesn't retry unnecessarily
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


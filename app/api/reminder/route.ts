import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SmsService } from "@/lib/sms";

// This endpoint finds customers whose expiryDate is 1, 3, or 5 days from today
// and sends them a customer_expiry_reminder SMS across all organizations.
// Suitable for cron-job.org: GET /api/reminder
// Authentication: supports either Basic Auth (username/password) or an API key header.
// Configure with environment variables:
//   - CRON_REMINDER_TOKEN (used with X-API-KEY or X-CRON-TOKEN header)
//   - CRON_REMINDER_USER and CRON_REMINDER_PASS (for HTTP Basic Auth)
const CRON_USER = process.env.CRON_REMINDER_USER;
const CRON_PASS = process.env.CRON_REMINDER_PASS;
const CRON_TOKEN = process.env.CRON_REMINDER_TOKEN;

function parseBasicAuth(authorization: string | null): { user: string; pass: string } | null {
  if (!authorization || !authorization.startsWith("Basic ")) return null;
  const base64 = authorization.slice("Basic ".length).trim();
  try {
    const decoded = Buffer.from(base64, "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}

function isAuthorizedRequest(req: NextRequest): boolean {
  const headerToken = req.headers.get("x-api-key") || req.headers.get("x-cron-token");
  if (CRON_TOKEN && headerToken && headerToken === CRON_TOKEN) return true;

  if (CRON_USER && CRON_PASS) {
    const creds = parseBasicAuth(req.headers.get("authorization"));
    if (creds && creds.user === CRON_USER && creds.pass === CRON_PASS) return true;
  }

  return false;
}


function startOfUTCDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dayRangeFromTodayUTC(daysAhead: number) {
  const now = new Date();
  const base = startOfUTCDay(now);
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() + daysAhead);
  const end = new Date(base);
  end.setUTCDate(base.getUTCDate() + daysAhead + 1);
  return { gte: start, lt: end } as const;
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function processOrganization(org: { id: string; name: string; phone: string | null }) {
  const ranges = [1, 3, 5].map(dayRangeFromTodayUTC);

  const customers = await prisma.organizationCustomer.findMany({
    where: {
      organizationId: org.id,
      expiryDate: { not: null },
      OR: ranges.map((r) => ({ expiryDate: { gte: r.gte, lt: r.lt } })),
    },
    select: { id: true, name: true, phone: true, expiryDate: true },
  });

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  const details: Array<{ customerId: string; name: string; phone: string | null; expiryDate: string | null; success: boolean; message: string }>=[];

  const supportNumber = org.phone || "+254700000000";

  const tasks = customers.map(async (c) => {
    if (!c.phone || !c.expiryDate) {
      details.push({
        customerId: c.id,
        name: c.name,
        phone: c.phone ?? null,
        expiryDate: c.expiryDate ? isoDateOnly(c.expiryDate) : null,
        success: false,
        message: !c.phone ? "Missing phone" : "Missing expiryDate",
      });
      return;
    }
    attempted += 1;
    const res = await SmsService.sendExpiryReminder(
      org.id,
      c.phone,
      c.name,
      isoDateOnly(c.expiryDate),
      org.name,
      supportNumber
    );
    if (res.success) sent += 1; else failed += 1;
    details.push({
      customerId: c.id,
      name: c.name,
      phone: c.phone,
      expiryDate: isoDateOnly(c.expiryDate),
      success: res.success,
      message: res.message,
    });
  });

  await Promise.allSettled(tasks);

  return {
    organizationId: org.id,
    organizationName: org.name,
    targets: [1, 3, 5].map((d) => isoDateOnly(dayRangeFromTodayUTC(d).gte)),
    matched: customers.length,
    attempted,
    sent,
    failed,
    details,
  };
}

export async function GET(req: NextRequest) {


    const hasConfig = Boolean(CRON_TOKEN) || (Boolean(CRON_USER) && Boolean(CRON_PASS));
    if (!hasConfig) {
      return NextResponse.json(
        {
          success: false,
          message: "Reminder endpoint not configured. Set CRON_REMINDER_TOKEN or CRON_REMINDER_USER/CRON_REMINDER_PASS env vars.",
        },
        { status: 500 }
      );
    }

    if (!isAuthorizedRequest(req)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Cron", charset="UTF-8"' } }
      );
    }

  try {
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true, phone: true } });

    if (orgs.length === 0) {
      return NextResponse.json({ success: true, message: "No organizations to process", summary: { processedOrganizations: 0 } }, { status: 200 });
    }

    const results = await Promise.all(orgs.map(processOrganization));

    const summary = results.reduce(
      (acc, r) => {
        acc.processedOrganizations += 1;
        acc.matched += r.matched;
        acc.attempted += r.attempted;
        acc.sent += r.sent;
        acc.failed += r.failed;
        return acc;
      },
      { processedOrganizations: 0, matched: 0, attempted: 0, sent: 0, failed: 0 }
    );

    return NextResponse.json({ success: true, message: "Expiry reminders processed", summary }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `Unhandled error: ${err instanceof Error ? err.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

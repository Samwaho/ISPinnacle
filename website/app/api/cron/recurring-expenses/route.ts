import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processTemplatesForOrganization } from "@/lib/server/recurring-expense-processor";

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const headerSecret =
    request.headers.get("x-cron-secret") ?? request.headers.get("authorization");
  if (!headerSecret) return false;
  if (headerSecret === secret) return true;
  // Allow "Bearer <secret>" format
  if (headerSecret.startsWith("Bearer ")) {
    return headerSecret.slice(7) === secret;
  }
  return false;
};

const runForOrganization = async (organizationId: string) => {
  return processTemplatesForOrganization({
    organizationId,
    triggeredBy: null,
  });
};

const runForAllOrganizations = async () => {
  const organizations = await prisma.organizationExpenseTemplate.findMany({
    where: {
      isActive: true,
    },
    select: {
      organizationId: true,
    },
    distinct: ["organizationId"],
  });

  let processedTemplates = 0;
  let generatedExpenses = 0;

  for (const org of organizations) {
    const result = await runForOrganization(org.organizationId);
    processedTemplates += result.processedTemplates;
    generatedExpenses += result.generatedExpenses;
  }

  return { processedTemplates, generatedExpenses };
};

const handle = async (request: Request) => {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body =
      request.method === "POST"
        ? await request
            .json()
            .catch(() => ({ organizationId: undefined, templateIds: undefined }))
        : {};

    if (body?.organizationId) {
      const result = await processTemplatesForOrganization({
        organizationId: body.organizationId,
        templateIds: body.templateIds,
        triggeredBy: null,
      });

      return NextResponse.json({
        success: true,
        scope: "organization",
        organizationId: body.organizationId,
        ...result,
      });
    }

    const result = await runForAllOrganizations();

    return NextResponse.json({
      success: true,
      scope: "all",
      ...result,
    });
  } catch (error) {
    console.error("Failed to process recurring expenses via cron route", error);
    return NextResponse.json(
      { success: false, message: "Failed to process recurring expenses" },
      { status: 500 }
    );
  }
};

export const GET = handle;
export const POST = handle;

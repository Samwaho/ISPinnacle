import { prisma } from "@/lib/db";
import { RecurringIntervalType } from "@/lib/generated/prisma";

const addIntervalToDate = (
  date: Date,
  interval: number,
  intervalType: RecurringIntervalType
) => {
  const next = new Date(date);
  switch (intervalType) {
    case RecurringIntervalType.DAILY:
      next.setDate(next.getDate() + interval);
      break;
    case RecurringIntervalType.WEEKLY:
      next.setDate(next.getDate() + 7 * interval);
      break;
    case RecurringIntervalType.MONTHLY:
      next.setMonth(next.getMonth() + interval);
      break;
    case RecurringIntervalType.YEARLY:
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      next.setMonth(next.getMonth() + interval);
  }
  return next;
};

const isCycleDue = (cycleDate: Date, now: Date, endDate?: Date | null) => {
  if (cycleDate > now) return false;
  if (endDate && cycleDate > endDate) return false;
  return true;
};

export const processTemplatesForOrganization = async ({
  organizationId,
  templateIds,
  triggeredBy,
}: {
  organizationId: string;
  templateIds?: string[];
  triggeredBy?: string | null;
}) => {
  const now = new Date();
  const templates = await prisma.organizationExpenseTemplate.findMany({
    where: {
      organizationId,
      isActive: true,
      ...(templateIds ? { id: { in: templateIds } } : {}),
    },
    orderBy: {
      nextRunDate: "asc",
    },
  });

  let generatedCount = 0;

  for (const template of templates) {
    let currentNextRun = template.nextRunDate;
    let templateActive = template.isActive;

    while (templateActive && isCycleDue(currentNextRun, now, template.endDate)) {
      const runDate = currentNextRun;

      await prisma.$transaction(async (tx) => {
        await tx.organizationExpense.create({
          data: {
            organizationId,
            templateId: template.id,
            name: template.name,
            description: template.description,
            amount: template.amount,
            date: runDate,
            isRecurring: true,
            recurringInterval: template.interval,
            recurringIntervalType: template.intervalType,
            recurringStartDate: template.startDate,
            recurringEndDate: template.endDate,
            isPaid: template.autoMarkAsPaid,
            paidAt: template.autoMarkAsPaid ? new Date() : null,
          },
        });

        const nextRun = addIntervalToDate(
          runDate,
          template.interval,
          template.intervalType
        );
        const shouldDeactivate =
          template.endDate !== null && template.endDate !== undefined
            ? nextRun > template.endDate
            : false;

        await tx.organizationExpenseTemplate.update({
          where: { id: template.id },
          data: {
            lastGeneratedAt: runDate,
            nextRunDate: nextRun,
            isActive: shouldDeactivate ? false : true,
          },
        });

        if (triggeredBy) {
          await tx.organizationActivity.create({
            data: {
              organizationId,
              userId: triggeredBy,
              activity: `Generated recurring expense "${template.name}" for ${runDate.toISOString().split("T")[0]}`,
            },
          });
        }
      });

      generatedCount += 1;

      const nextRun = addIntervalToDate(
        runDate,
        template.interval,
        template.intervalType
      );
      currentNextRun = nextRun;
      templateActive =
        template.endDate !== null && template.endDate !== undefined
          ? nextRun <= template.endDate
          : template.isActive;

      if (!templateActive) {
        await prisma.organizationExpenseTemplate.update({
          where: { id: template.id },
          data: {
            isActive: false,
          },
        });
      }
    }
  }

  return {
    processedTemplates: templates.length,
    generatedExpenses: generatedCount,
  };
};

export const recurringExpenseHelpers = {
  addIntervalToDate,
  isCycleDue,
};

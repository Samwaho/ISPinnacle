import { createTRPCRouter, protectedProcedure } from "../init";
import {
  createExpenseSchema,
  updateExpenseSchema,
  deleteExpenseSchema,
  createRecurringExpenseTemplateSchema,
  updateRecurringExpenseTemplateSchema,
  toggleRecurringExpenseTemplateSchema,
  deleteRecurringExpenseTemplateSchema,
  processRecurringExpenseTemplatesSchema,
} from "@/schemas";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { processTemplatesForOrganization } from "@/lib/server/recurring-expense-processor";
import { createActivity, hasPermissions } from "@/lib/server-hooks";

export const expensesRouter = createTRPCRouter({
  getExpenses: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_EXPENSES]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view expenses in this organization",
        });
      }

      const expenses = await prisma.organizationExpense.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          date: "desc",
        },
        include: {
          template: true,
        },
      });

      return expenses;
    }),

  getExpenseById: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Expense ID is required"),
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_EXPENSES]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view expenses in this organization",
        });
      }

      const expense = await prisma.organizationExpense.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          template: true,
        },
      });

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      return expense;
    }),

  createExpense: protectedProcedure
    .input(createExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to create expenses in this organization",
        });
      }

      const expense = await prisma.organizationExpense.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          amount: input.amount,
          date: input.date,
          isRecurring: input.isRecurring,
          recurringInterval: input.recurringInterval,
          recurringIntervalType: input.recurringIntervalType,
          recurringStartDate: input.recurringStartDate,
          recurringEndDate: input.recurringEndDate,
          isPaid: input.isPaid,
          paidAt: input.paidAt,
        },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Created expense: ${expense.name} (KES ${expense.amount})`
      );

      return {
        success: true,
        message: "Expense created successfully",
        expense,
      };
    }),

  updateExpense: protectedProcedure
    .input(updateExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to update expenses in this organization",
        });
      }

      const existingExpense = await prisma.organizationExpense.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });

      if (!existingExpense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      const expense = await prisma.organizationExpense.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          amount: input.amount,
          date: input.date,
          isRecurring: input.isRecurring,
          recurringInterval: input.recurringInterval,
          recurringIntervalType: input.recurringIntervalType,
          recurringStartDate: input.recurringStartDate,
          recurringEndDate: input.recurringEndDate,
          isPaid: input.isPaid,
          paidAt: input.paidAt,
        },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Updated expense: ${expense.name} (KES ${expense.amount})`
      );

      return {
        success: true,
        message: "Expense updated successfully",
        expense,
      };
    }),

  deleteExpense: protectedProcedure
    .input(deleteExpenseSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to delete expenses in this organization",
        });
      }

      const existingExpense = await prisma.organizationExpense.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });

      if (!existingExpense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Expense not found",
        });
      }

      await prisma.organizationExpense.delete({
        where: { id: input.id },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Deleted expense: ${existingExpense.name} (KES ${existingExpense.amount})`
      );

      return {
        success: true,
        message: "Expense deleted successfully",
      };
    }),

  markExpenseAsPaid: protectedProcedure
    .input(z.object({
      id: z.string().min(1, "Expense ID is required"),
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to manage expenses in this organization",
        });
      }

      const expense = await prisma.organizationExpense.update({
        where: { id: input.id },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Marked expense as paid: ${expense.name} (KES ${expense.amount})`
      );

      return {
        success: true,
        message: "Expense marked as paid successfully",
        expense,
      };
    }),

  getRecurringExpenseTemplates: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_EXPENSES]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view expenses in this organization",
        });
      }

      const templates = await prisma.organizationExpenseTemplate.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          nextRunDate: "asc",
        },
        include: {
          expenses: {
            orderBy: {
              date: "desc",
            },
            take: 5,
            select: {
              id: true,
              date: true,
              amount: true,
              isPaid: true,
            },
          },
        },
      });

      const aggregated = await prisma.organizationExpense.groupBy({
        by: ["templateId", "isPaid"],
        where: {
          organizationId: input.organizationId,
          templateId: { not: null },
        },
        _count: { _all: true },
        _sum: { amount: true },
      });

      const statsMap = new Map<string, {
        totalCount: number;
        totalAmount: number;
        unpaidCount: number;
        unpaidAmount: number;
        paidCount: number;
      }>();

      aggregated.forEach((row) => {
        if (!row.templateId) return;
        const entry = statsMap.get(row.templateId) ?? {
          totalCount: 0,
          totalAmount: 0,
          unpaidCount: 0,
          unpaidAmount: 0,
          paidCount: 0,
        };

        entry.totalCount += row._count._all;
        entry.totalAmount += row._sum.amount ?? 0;

        if (row.isPaid) {
          entry.paidCount += row._count._all;
        } else {
          entry.unpaidCount += row._count._all;
          entry.unpaidAmount += row._sum.amount ?? 0;
        }

        statsMap.set(row.templateId, entry);
      });

      return templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        amount: template.amount,
        interval: template.interval,
        intervalType: template.intervalType,
        startDate: template.startDate,
        nextRunDate: template.nextRunDate,
        endDate: template.endDate,
        autoMarkAsPaid: template.autoMarkAsPaid,
        lastGeneratedAt: template.lastGeneratedAt,
        isActive: template.isActive,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        stats: statsMap.get(template.id) ?? {
          totalCount: 0,
          totalAmount: 0,
          unpaidCount: 0,
          unpaidAmount: 0,
          paidCount: 0,
        },
        recentExpenses: template.expenses,
      }));
    }),

  createRecurringExpenseTemplate: protectedProcedure
    .input(createRecurringExpenseTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to create recurring expenses in this organization",
        });
      }

      const sessionUserId = ctx.session.user.id!;
      const startDate = input.startDate;
      const requestedNextRun = input.nextRunDate ?? startDate;
      const nextRunDate = requestedNextRun < startDate ? startDate : requestedNextRun;

      const template = await prisma.organizationExpenseTemplate.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          description: input.description,
          amount: input.amount,
          interval: input.interval,
          intervalType: input.intervalType,
          startDate,
          nextRunDate,
          endDate: input.endDate ?? null,
          autoMarkAsPaid: input.autoMarkAsPaid ?? false,
          createdBy: sessionUserId,
          updatedBy: sessionUserId,
        },
      });

      await createActivity(
        input.organizationId,
        sessionUserId,
        `Created recurring expense template: ${template.name} (KES ${template.amount})`
      );

      if (template.isActive && template.nextRunDate <= new Date()) {
        await processTemplatesForOrganization({
          organizationId: input.organizationId,
          templateIds: [template.id],
          triggeredBy: sessionUserId,
        });
      }

      return {
        success: true,
        message: "Recurring expense template created successfully",
        template,
      };
    }),

  updateRecurringExpenseTemplate: protectedProcedure
    .input(updateRecurringExpenseTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to update recurring expenses in this organization",
        });
      }

      const existingTemplate = await prisma.organizationExpenseTemplate.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });

      if (!existingTemplate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring expense template not found",
        });
      }

      const startDate = input.startDate;
      const requestedNextRun = input.nextRunDate ?? existingTemplate.nextRunDate ?? startDate;
      const nextRunDate = requestedNextRun < startDate ? startDate : requestedNextRun;
      const isActive = input.isActive ?? existingTemplate.isActive;

      const template = await prisma.organizationExpenseTemplate.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          amount: input.amount,
          interval: input.interval,
          intervalType: input.intervalType,
          startDate,
          nextRunDate,
          endDate: input.endDate ?? null,
          autoMarkAsPaid: input.autoMarkAsPaid ?? existingTemplate.autoMarkAsPaid,
          isActive,
          updatedBy: ctx.session.user.id ?? existingTemplate.updatedBy,
        },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Updated recurring expense template: ${template.name} (KES ${template.amount})`
      );

      if (template.isActive && template.nextRunDate <= new Date()) {
        await processTemplatesForOrganization({
          organizationId: input.organizationId,
          templateIds: [template.id],
          triggeredBy: ctx.session.user.id,
        });
      }

      return {
        success: true,
        message: "Recurring expense template updated successfully",
        template,
      };
    }),

  toggleRecurringExpenseTemplate: protectedProcedure
    .input(toggleRecurringExpenseTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to manage recurring expenses in this organization",
        });
      }

      const template = await prisma.organizationExpenseTemplate.update({
        where: { id: input.id },
        data: {
          isActive: input.isActive,
          updatedBy: ctx.session.user.id ?? undefined,
        },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `${input.isActive ? "Activated" : "Paused"} recurring expense template: ${template.name}`
      );

      if (template.isActive && template.nextRunDate <= new Date()) {
        await processTemplatesForOrganization({
          organizationId: input.organizationId,
          templateIds: [template.id],
          triggeredBy: ctx.session.user.id,
        });
      }

      return {
        success: true,
        message: `Recurring expense template ${input.isActive ? "activated" : "paused"} successfully`,
        template,
      };
    }),

  deleteRecurringExpenseTemplate: protectedProcedure
    .input(deleteRecurringExpenseTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to delete recurring expenses in this organization",
        });
      }

      const template = await prisma.organizationExpenseTemplate.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        select: {
          name: true,
        },
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Recurring expense template not found",
        });
      }

      await prisma.organizationExpenseTemplate.delete({
        where: { id: input.id },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Deleted recurring expense template: ${template.name}`
      );

      return {
        success: true,
        message: "Recurring expense template deleted successfully",
      };
    }),

  processRecurringExpenseTemplates: protectedProcedure
    .input(processRecurringExpenseTemplatesSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_EXPENSES]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to process recurring expenses in this organization",
        });
      }

      const result = await processTemplatesForOrganization({
        organizationId: input.organizationId,
        templateIds: input.templateIds,
        triggeredBy: ctx.session.user.id,
      });

      return {
        success: true,
        message: `Processed ${result.processedTemplates} templates and generated ${result.generatedExpenses} expenses`,
        ...result,
      };
    }),

  getExpenseStats: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_EXPENSES]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view expenses in this organization",
        });
      }

      const [
        totalExpenses,
        paidExpenses,
        unpaidExpenses,
        recurringExpenses,
        activeTemplates,
        inactiveTemplates,
      ] = await Promise.all([
        prisma.organizationExpense.count({
          where: { organizationId: input.organizationId },
        }),
        prisma.organizationExpense.count({
          where: {
            organizationId: input.organizationId,
            isPaid: true,
          },
        }),
        prisma.organizationExpense.count({
          where: {
            organizationId: input.organizationId,
            isPaid: false,
          },
        }),
        prisma.organizationExpense.count({
          where: {
            organizationId: input.organizationId,
            isRecurring: true,
          },
        }),
        prisma.organizationExpenseTemplate.count({
          where: {
            organizationId: input.organizationId,
            isActive: true,
          },
        }),
        prisma.organizationExpenseTemplate.count({
          where: {
            organizationId: input.organizationId,
            isActive: false,
          },
        }),
      ]);

      const [totalAmount, paidAmount, unpaidAmount] = await Promise.all([
        prisma.organizationExpense.aggregate({
          where: { organizationId: input.organizationId },
          _sum: { amount: true },
        }),
        prisma.organizationExpense.aggregate({
          where: {
            organizationId: input.organizationId,
            isPaid: true,
          },
          _sum: { amount: true },
        }),
        prisma.organizationExpense.aggregate({
          where: {
            organizationId: input.organizationId,
            isPaid: false,
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalExpenses,
        paidExpenses,
        unpaidExpenses,
        recurringExpenses,
        totalAmount: totalAmount._sum.amount || 0,
        paidAmount: paidAmount._sum.amount || 0,
        unpaidAmount: unpaidAmount._sum.amount || 0,
        recurringTemplates: {
          active: activeTemplates,
          inactive: inactiveTemplates,
        },
      };
    }),
});

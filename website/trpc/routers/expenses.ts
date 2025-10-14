import { createTRPCRouter, protectedProcedure } from "../init";
import { createExpenseSchema, updateExpenseSchema, deleteExpenseSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { createActivity, hasPermissions } from "@/lib/server-hooks";

export const expensesRouter = createTRPCRouter({
  getExpenses: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input, ctx }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_EXPENSES]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view expenses in this organization" 
        });
      }

      const expenses = await prisma.organizationExpense.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          date: "desc",
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
          message: "You are not authorized to view expenses in this organization" 
        });
      }

      const expense = await prisma.organizationExpense.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
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
          message: "You are not authorized to create expenses in this organization" 
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

      // Create activity log
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
          message: "You are not authorized to update expenses in this organization" 
        });
      }

      // Check if expense exists
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

      // Create activity log
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
          message: "You are not authorized to delete expenses in this organization" 
        });
      }

      // Check if expense exists
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

      // Create activity log
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
          message: "You are not authorized to manage expenses in this organization" 
        });
      }

      const expense = await prisma.organizationExpense.update({
        where: { id: input.id },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });

      // Create activity log
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

  getExpenseStats: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_EXPENSES]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view expenses in this organization" 
        });
      }

      const [totalExpenses, paidExpenses, unpaidExpenses, recurringExpenses] = await Promise.all([
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
      };
    }),
});

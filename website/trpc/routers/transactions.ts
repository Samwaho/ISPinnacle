import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { hasPermissions } from "@/lib/server-hooks";

export const transactionsRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_CUSTOMERS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view transactions in this organization" 
        });
      }

      const transactionsRaw = await prisma.transaction.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Derive payment gateway from stored data without schema changes
      // Heuristic: invoiceNumber starting with 'K2-' => KopoKopo; otherwise M-Pesa
      const transactions = transactionsRaw.map(t => ({
        ...t,
        paymentGateway: t.invoiceNumber?.startsWith('K2-') ? 'KOPOKOPO' : 'MPESA',
      }));

      return transactions;
    }),

  getTransactionStats: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_CUSTOMERS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view transaction stats in this organization" 
        });
      }

             const [
         totalTransactions,
         totalAmount,
         thisMonthTransactions,
         thisMonthAmount,
         lastMonthTransactions,
         lastMonthAmount,
       ] = await Promise.all([
         // Total transactions
         prisma.transaction.count({
           where: { organizationId: input.organizationId },
         }),
         // Total amount
         prisma.transaction.aggregate({
           where: { organizationId: input.organizationId },
           _sum: { amount: true },
         }),
         // This month transactions
         prisma.transaction.count({
           where: {
             organizationId: input.organizationId,
             createdAt: {
               gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
             },
           },
         }),
         // This month amount
         prisma.transaction.aggregate({
           where: {
             organizationId: input.organizationId,
             createdAt: {
               gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
             },
           },
           _sum: { amount: true },
         }),
         // Last month transactions
         prisma.transaction.count({
           where: {
             organizationId: input.organizationId,
             createdAt: {
               gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
               lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
             },
           },
         }),
         // Last month amount
         prisma.transaction.aggregate({
           where: {
             organizationId: input.organizationId,
             createdAt: {
               gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
               lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
             },
           },
           _sum: { amount: true },
         }),
       ]);

      return {
        totalTransactions,
        totalAmount: totalAmount._sum.amount || 0,
        thisMonthTransactions,
        thisMonthAmount: thisMonthAmount._sum.amount || 0,
        lastMonthTransactions,
        lastMonthAmount: lastMonthAmount._sum.amount || 0,
      };
    }),
});

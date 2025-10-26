import { createTRPCRouter, protectedProcedure } from "../init";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission, VoucherStatus } from "@/lib/generated/prisma";
import { hasPermissions } from "@/lib/server-hooks";

export const analyticsRouter = createTRPCRouter({
  getFinancialOverview: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view financial analytics in this organization" 
        });
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (input.period) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0); // All time
      }

      // Get PPPoE revenue data (customer payments)
      const revenueData = await prisma.organizationCustomerPayment.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.period !== "all" && {
            createdAt: {
              gte: startDate,
            },
          }),
        },
        include: {
          customer: true,
          package: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Get expense data
      const expenseData = await prisma.organizationExpense.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.period !== "all" && {
            date: {
              gte: startDate,
            },
          }),
        },
        orderBy: {
          date: "asc",
        },
      });

      // Get transactions (successful receipts only)
      const transactions = await prisma.transaction.findMany({
        where: {
          organizationId: input.organizationId,
          invoiceNumber: { not: null },
          // Exclude empty-string receipts
          NOT: [{ invoiceNumber: "" }],
          ...(input.period !== "all" && {
            transactionDateTime: {
              gte: startDate,
            },
          }),
        },
        orderBy: {
          transactionDateTime: "asc",
        },
      });

      // Calculate hotspot revenue from successful voucher-related transactions
      const voucherCodes = await prisma.hotspotVoucher.findMany({
        where: { organizationId: input.organizationId },
        select: { voucherCode: true },
      });
      const voucherCodeList = voucherCodes.map(v => v.voucherCode);

      let hotspotRevenue = 0;
      if (voucherCodeList.length > 0) {
        const hotspotTx = await prisma.transaction.findMany({
          where: {
            organizationId: input.organizationId,
            billReferenceNumber: { in: voucherCodeList },
            invoiceNumber: { not: null },
            NOT: [{ invoiceNumber: "" }],
            ...(input.period !== 'all' && { transactionDateTime: { gte: startDate } }),
          },
          select: { amount: true },
        });
        hotspotRevenue = hotspotTx.reduce((s, t) => s + (t.amount || 0), 0);
      }

      // Calculate totals (PPPoE + Hotspot)
      const totalRevenue = revenueData.reduce((sum, payment) => sum + payment.amount, 0) + hotspotRevenue;
      const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.amount, 0);
      const totalTransactions = transactions.reduce((sum, tx) => sum + tx.amount, 0);
      const netProfit = totalRevenue - totalExpenses;

      // Calculate growth rates (compare with previous period)
      const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
      const previousPeriodEnd = startDate;

      // Previous period PPPoE revenue
      const previousRevenue = await prisma.organizationCustomerPayment.aggregate({
        where: {
          organizationId: input.organizationId,
          createdAt: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
        },
        _sum: { amount: true },
      });

      // Previous period Hotspot revenue
      let previousHotspotRevenue = 0;
      if (voucherCodeList.length > 0) {
        const prevHotspotAgg = await prisma.transaction.findMany({
          where: {
            organizationId: input.organizationId,
            billReferenceNumber: { in: voucherCodeList },
            invoiceNumber: { not: null },
            NOT: [{ invoiceNumber: "" }],
            transactionDateTime: {
              gte: previousPeriodStart,
              lt: previousPeriodEnd,
            },
          },
          select: { amount: true },
        });
        previousHotspotRevenue = prevHotspotAgg.reduce((s, t) => s + (t.amount || 0), 0);
      }

      const previousExpenses = await prisma.organizationExpense.aggregate({
        where: {
          organizationId: input.organizationId,
          date: {
            gte: previousPeriodStart,
            lt: previousPeriodEnd,
          },
        },
        _sum: { amount: true },
      });

      const prevTotalRevenue = (previousRevenue._sum.amount || 0) + previousHotspotRevenue;
      const revenueGrowth = prevTotalRevenue
        ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
        : 0;
      
      const expenseGrowth = previousExpenses._sum.amount 
        ? ((totalExpenses - previousExpenses._sum.amount) / previousExpenses._sum.amount) * 100 
        : 0;

      return {
        period: input.period,
        totalRevenue,
        totalExpenses,
        totalTransactions,
        netProfit,
        revenueGrowth,
        expenseGrowth,
        revenueData,
        expenseData,
        transactions,
      };
    }),

  getRevenueTrends: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view financial analytics in this organization" 
        });
      }

      const now = new Date();
      let startDate: Date;
      let groupBy: "day" | "week" | "month";
      
      switch (input.period) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = "day";
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = "day";
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          groupBy = "week";
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          groupBy = "month";
          break;
        case "all":
          startDate = new Date(0);
          groupBy = "month";
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = "day";
      }

      const payments = await prisma.organizationCustomerPayment.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.period !== "all" && {
            createdAt: {
              gte: startDate,
            },
          }),
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Include hotspot voucher-based transactions to reflect actual revenue
      const voucherCodes = await prisma.hotspotVoucher.findMany({
        where: { organizationId: input.organizationId },
        select: { voucherCode: true },
      });
      const voucherCodeList = voucherCodes.map(v => v.voucherCode);

      let hotspotTx: { transactionDateTime: Date; amount: number | null }[] = [];
      if (voucherCodeList.length > 0) {
        hotspotTx = await prisma.transaction.findMany({
          where: {
            organizationId: input.organizationId,
            billReferenceNumber: { in: voucherCodeList },
            invoiceNumber: { not: null },
            NOT: [{ invoiceNumber: "" }],
            ...(input.period !== 'all' && { transactionDateTime: { gte: startDate } }),
          },
          select: { transactionDateTime: true, amount: true },
          orderBy: { transactionDateTime: 'asc' },
        });
      }

      console.log(`Revenue trends query - Period: ${input.period}, PPPoE payments: ${payments.length}, Hotspot tx: ${hotspotTx.length}`);

      // Group data by time period
      const groupedData = new Map<string, number>();
      
      payments.forEach(payment => {
        const date = new Date(payment.createdAt);
        let key: string;

        if (groupBy === "day") {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else { // month
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }

        groupedData.set(key, (groupedData.get(key) || 0) + payment.amount);
      });

      // Merge hotspot revenue into grouped data
      hotspotTx.forEach(tx => {
        const date = new Date(tx.transactionDateTime);
        let key: string;

        if (groupBy === 'day') {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }

        groupedData.set(key, (groupedData.get(key) || 0) + (tx.amount || 0));
      });

      console.log(`Grouped data entries: ${groupedData.size}`);

      // Fill in missing dates for better visualization
      const result = Array.from(groupedData.entries()).map(([date, amount]) => ({
        date,
        amount,
      }));

      // Sort by date
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      console.log(`Final result length: ${result.length}`);

      return result;
    }),

  // Expense trends over time, grouped by period similar to revenue trends
  getExpenseTrends: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view financial analytics in this organization" 
        });
      }

      const now = new Date();
      let startDate: Date;
      let groupBy: "day" | "week" | "month";

      switch (input.period) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupBy = "day";
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = "day";
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          groupBy = "week";
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          groupBy = "month";
          break;
        case "all":
          startDate = new Date(0);
          groupBy = "month";
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          groupBy = "day";
      }

      const expenses = await prisma.organizationExpense.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.period !== "all" && {
            date: {
              gte: startDate,
            },
          }),
        },
        orderBy: { date: "asc" },
      });

      const groupedData = new Map<string, number>();

      expenses.forEach(expense => {
        const date = new Date(expense.date);
        let key: string;

        if (groupBy === "day") {
          key = date.toISOString().split('T')[0];
        } else if (groupBy === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
        } else { // month
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }

        groupedData.set(key, (groupedData.get(key) || 0) + expense.amount);
      });

      const result = Array.from(groupedData.entries()).map(([date, amount]) => ({
        date,
        amount,
      }));

      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return result;
    }),

  // Split revenue by product/source: PPPoE (customer payments) vs Hotspot (vouchers)
  getRevenueSources: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view financial analytics in this organization"
        });
      }

      const now = new Date();
      let startDate: Date;
      switch (input.period) {
        case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        case "1y": startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
        default: startDate = new Date(0);
      }

      // PPPoE revenue from customer payments
      const pppoeAgg = await prisma.organizationCustomerPayment.aggregate({
        where: {
          organizationId: input.organizationId,
          ...(input.period !== 'all' && { createdAt: { gte: startDate } }),
        },
        _sum: { amount: true },
      });
      const pppoeRevenue = pppoeAgg._sum.amount || 0;

      // Hotspot revenue from successful transactions that reference hotspot vouchers
      // We use MpesaTransaction.billReferenceNumber set to voucherCode in callbacks
      const voucherCodes = await prisma.hotspotVoucher.findMany({
        where: { organizationId: input.organizationId },
        select: { voucherCode: true },
      });
      const voucherCodeList = voucherCodes.map(v => v.voucherCode);

      let hotspotRevenue = 0;
      if (voucherCodeList.length > 0) {
        const hotspotTx = await prisma.transaction.findMany({
          where: {
            organizationId: input.organizationId,
            billReferenceNumber: { in: voucherCodeList },
            invoiceNumber: { not: null },
            NOT: [{ invoiceNumber: "" }],
            ...(input.period !== 'all' && { transactionDateTime: { gte: startDate } }),
          },
          select: { amount: true },
        });
        hotspotRevenue = hotspotTx.reduce((s, t) => s + (t.amount || 0), 0);
      }

      return {
        pppoe: pppoeRevenue,
        hotspot: hotspotRevenue,
        total: pppoeRevenue + hotspotRevenue,
      };
    }),

  getExpenseBreakdown: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view financial analytics in this organization" 
        });
      }

      const now = new Date();
      let startDate: Date;
      
      switch (input.period) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      const expenses = await prisma.organizationExpense.findMany({
        where: {
          organizationId: input.organizationId,
          ...(input.period !== "all" && {
            date: {
              gte: startDate,
            },
          }),
        },
      });

      // Group expenses by name/category
      const expenseBreakdown = new Map<string, number>();
      const paidExpenses = new Map<string, number>();
      const unpaidExpenses = new Map<string, number>();

      expenses.forEach(expense => {
        const category = expense.name;
        expenseBreakdown.set(category, (expenseBreakdown.get(category) || 0) + expense.amount);
        
        if (expense.isPaid) {
          paidExpenses.set(category, (paidExpenses.get(category) || 0) + expense.amount);
        } else {
          unpaidExpenses.set(category, (unpaidExpenses.get(category) || 0) + expense.amount);
        }
      });

      return {
        total: Array.from(expenseBreakdown.entries()).map(([name, amount]) => ({ name, amount })),
        paid: Array.from(paidExpenses.entries()).map(([name, amount]) => ({ name, amount })),
        unpaid: Array.from(unpaidExpenses.entries()).map(([name, amount]) => ({ name, amount })),
      };
    }),

  getCustomerAnalytics: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_CUSTOMERS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view customer analytics in this organization" 
        });
      }

      // Get customer statistics
      const totalCustomers = await prisma.organizationCustomer.count({
        where: { organizationId: input.organizationId },
      });

      const activeCustomers = await prisma.organizationCustomer.count({
        where: { 
          organizationId: input.organizationId,
          status: "ACTIVE",
        },
      });

      const inactiveCustomers = await prisma.organizationCustomer.count({
        where: { 
          organizationId: input.organizationId,
          status: "INACTIVE",
        },
      });

      const expiredCustomers = await prisma.organizationCustomer.count({
        where: { 
          organizationId: input.organizationId,
          status: "EXPIRED",
        },
      });

      // Get package distribution
      const packageStats = await prisma.organizationCustomer.groupBy({
        by: ['packageId'],
        where: {
          organizationId: input.organizationId,
          packageId: { not: null },
        },
        _count: {
          packageId: true,
        },
      });

      const packageDetails = await prisma.organizationPackage.findMany({
        where: {
          organizationId: input.organizationId,
          id: { in: packageStats.map(p => p.packageId!).filter(Boolean) },
        },
      });

      const packageDistribution = packageStats.map(stat => {
        const packageDetail = packageDetails.find(p => p.id === stat.packageId);
        return {
          packageName: packageDetail?.name || "Unknown",
          customerCount: stat._count.packageId,
        };
      });

      // Get recent payments
      const recentPayments = await prisma.organizationCustomerPayment.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          customer: true,
          package: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      return {
        totalCustomers,
        activeCustomers,
        inactiveCustomers,
        expiredCustomers,
        packageDistribution,
        recentPayments,
      };
    }),

  getPaymentMethods: protectedProcedure
    .input(z.object({
      organizationId: z.string().min(1, "Organization ID is required"),
      period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view payment analytics in this organization" 
        });
      }

      const now = new Date();
      let startDate: Date;
      
      switch (input.period) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      // Get successful transactions only (non-empty invoice/receipt)
      const transactions = await prisma.transaction.findMany({
        where: {
          organizationId: input.organizationId,
          invoiceNumber: { not: null },
          NOT: [{ invoiceNumber: "" }],
          ...(input.period !== "all" && {
            transactionDateTime: {
              gte: startDate,
            },
          }),
        },
      });

      // Classify by gateway preferring explicit field, fallback to invoice prefix
      const k2 = transactions.filter(tx => tx.paymentGateway === 'KOPOKOPO' || tx.invoiceNumber?.startsWith('K2-'));
      const mpesa = transactions.filter(tx => tx.paymentGateway === 'MPESA' || !tx.invoiceNumber?.startsWith('K2-'));

      const mpesaTotal = mpesa.reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const k2Total = k2.reduce((sum, tx) => sum + (tx.amount || 0), 0);

      return {
        mpesa: {
          count: mpesa.length,
          amount: mpesaTotal,
        },
        kopokopo: {
          count: k2.length,
          amount: k2Total,
        },
        total: mpesaTotal + k2Total,
      };
    }),
});

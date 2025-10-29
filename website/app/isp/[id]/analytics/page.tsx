"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessDenied } from "@/components/ui/access-denied";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  BarChart3,
  
  Calendar,
  Clock,
  CalendarDays,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart as ReBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

// Generic Trend Bar Chart using Recharts
const TrendBarChart = ({ data, valueKey = "amount" }: { data: Array<{ label: string } & Record<string, number | string>>; valueKey?: string }) => {
  if (!data.length) return <div className="text-center text-muted-foreground py-8">No data available</div>;

  return (
    <ChartContainer
      className="h-[220px] sm:h-72 md:h-80 w-full"
      config={{}}
    >
      <ReBarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
        <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `KES ${Number(v).toLocaleString()}`} />
        <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent labelFormatter={(v) => String(v)} />} />
        <Bar dataKey={valueKey} fill="var(--color-revenue, #3B82F6)" radius={[6, 6, 0, 0]} />
      </ReBarChart>
    </ChartContainer>
  );
};

const PERIOD_LABELS: Record<"7d" | "30d" | "90d" | "1y" | "all", string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "1y": "Last 12 months",
  "all": "All time",
};

type ExcelJSPackage = typeof import("exceljs") & {
  default?: typeof import("exceljs");
};
const PieChartComponent = ({ data, title }: { data: Array<{ name: string; amount: number }>, title: string }) => {
  if (!data.length) return <div className="text-center text-muted-foreground py-8">No data available</div>;
  
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = (item.amount / total) * 100;
          const color = colors[index % colors.length];
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">KES {item.amount.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AnalyticsPage = () => {
  const { id } = useParams();
  const organizationId = id as string;
  const t = useTRPC();
  
  const [selectedPeriod, setSelectedPeriod] = React.useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [isExporting, setIsExporting] = React.useState(false);

  const formatTrendLabel = React.useCallback((isoDate: string) => {
    const d = new Date(isoDate);
    if (selectedPeriod === "7d" || selectedPeriod === "30d") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (selectedPeriod === "90d") {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }, [selectedPeriod]);

  // Permissions
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );

  // Financial Overview
  const { data: financialOverview, isPending: overviewLoading } = useQuery(
    t.analytics.getFinancialOverview.queryOptions({ 
      organizationId, 
      period: selectedPeriod 
    })
  );

  // Revenue Trends
  const { data: revenueTrends, isPending: trendsLoading, error: trendsError } = useQuery(
    t.analytics.getRevenueTrends.queryOptions({ 
      organizationId, 
      period: selectedPeriod 
    })
  );
  const { data: expenseTrends, isPending: expenseTrendsLoading, error: expenseTrendsError } = useQuery(
    t.analytics.getExpenseTrends.queryOptions({
      organizationId,
      period: selectedPeriod,
    })
  );

  console.log('Revenue trends query result:', { revenueTrends, trendsLoading, trendsError, selectedPeriod });

  // Expense Breakdown
  const { data: expenseBreakdown, isPending: expenseLoading } = useQuery(
    t.analytics.getExpenseBreakdown.queryOptions({ 
      organizationId, 
      period: selectedPeriod 
    })
  );

  const { data: expenseDetails, isPending: expenseDetailsLoading } = useQuery(
    t.analytics.getExpenseDetails.queryOptions({
      organizationId,
      period: selectedPeriod,
    })
  );

  const { data: recurringTemplates, isPending: recurringTemplatesLoading } = useQuery(
    t.expenses.getRecurringExpenseTemplates.queryOptions({
      organizationId,
    })
  );

  // Removed Customer Analytics (Recent Payments) from this view

  // Removed payment method overview and organization gateway awareness from this view

  // Revenue sources (PPPoE vs Hotspot)
  const { data: revenueSources, isPending: sourcesLoading } = useQuery(
    t.analytics.getRevenueSources.queryOptions({
      organizationId,
      period: selectedPeriod,
    })
  );

  // Build combined series for Revenue vs Expenses vs Profit
  const combinedTrendData = React.useMemo(() => {
    const revMap = new Map<string, number>();
    const expMap = new Map<string, number>();

    (revenueTrends || []).forEach((d) => {
      revMap.set(d.date, (revMap.get(d.date) || 0) + d.amount);
    });
    (expenseTrends || []).forEach((d) => {
      expMap.set(d.date, (expMap.get(d.date) || 0) + d.amount);
    });

    const allDates = Array.from(new Set([...(revMap.keys()), ...(expMap.keys())]));
    allDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return allDates.map((date) => {
      const revenue = revMap.get(date) || 0;
      const expense = expMap.get(date) || 0;
      const profit = revenue - expense;
      return {
        label: formatTrendLabel(date),
        revenue,
        expense,
        profit,
      };
    });
  }, [revenueTrends, expenseTrends, formatTrendLabel]);

  const handleExport = React.useCallback(async () => {
    if (isExporting) return;
    if (!financialOverview && combinedTrendData.length === 0 && !(expenseDetails?.length)) {
      toast.error("Analytics data is not ready to export yet.");
      return;
    }

    try {
      setIsExporting(true);
      const excelModule = await import("exceljs");
      const exceljsPackage = excelModule as ExcelJSPackage;
      const WorkbookCtor = exceljsPackage.Workbook ?? exceljsPackage.default?.Workbook;
      if (!WorkbookCtor) {
        throw new Error("ExcelJS failed to load");
      }
      const workbook = new WorkbookCtor();
      const periodLabel = PERIOD_LABELS[selectedPeriod];
      const formatDate = (value?: Date | string | null) =>
        value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
      const formatDateTime = (value?: Date | string | null) =>
        value
          ? new Date(value).toLocaleString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      const formatRecurringLabel = (detail: NonNullable<typeof expenseDetails>[number]) => {
        if (!detail.isRecurring) return "No";
        if (detail.recurringInterval && detail.recurringIntervalType) {
          const intervalType = detail.recurringIntervalType
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
          return `Yes (${detail.recurringInterval} ${intervalType})`;
        }
        return "Yes";
      };

      const formatTemplateInterval = (interval: number, type: string) => {
        const normalized = type.toLowerCase().replace(/_/g, " ");
        if (interval === 1) {
          return `Every ${normalized.replace(/ly$/, "") || normalized}`;
        }
        return `Every ${interval} ${normalized}`;
      };

      const overviewSheet = workbook.addWorksheet("Overview");
      overviewSheet.columns = [
        { header: "Metric", key: "metric", width: 32 },
        { header: "Value", key: "value", width: 24 },
      ];
      overviewSheet.addRows([
        { metric: "Period", value: periodLabel },
        { metric: "Total Revenue (KES)", value: Number(financialOverview?.totalRevenue ?? 0) },
        { metric: "Total Expenses (KES)", value: Number(financialOverview?.totalExpenses ?? 0) },
        { metric: "Net Profit (KES)", value: Number(financialOverview?.netProfit ?? 0) },
      ]);

      const detailSheet = workbook.addWorksheet("Revenue vs Expenses");
      detailSheet.columns = [
        { header: "Period", key: "period", width: 20 },
        { header: "Revenue (KES)", key: "revenue", width: 18 },
        { header: "Expenses (KES)", key: "expenses", width: 18 },
        { header: "Profit (KES)", key: "profit", width: 16 },
      ];

      const detailRows = combinedTrendData.map((row) => ({
        period: row.label,
        revenue: Number(row.revenue || 0),
        expenses: Number(row.expense || 0),
        profit: Number(row.profit || 0),
      }));

      if (detailRows.length) {
        detailSheet.addRows(detailRows);
        const totals = detailRows.reduce(
          (acc, row) => ({
            revenue: acc.revenue + row.revenue,
            expenses: acc.expenses + row.expenses,
            profit: acc.profit + row.profit,
          }),
          { revenue: 0, expenses: 0, profit: 0 }
        );
        detailSheet.addRow({
          period: "Totals",
          revenue: totals.revenue,
          expenses: totals.expenses,
          profit: totals.profit,
        });
      } else {
        const emptyRow = detailSheet.addRow({
          period: "No revenue or expense data available for the selected period.",
          revenue: "",
          expenses: "",
          profit: "",
        });
        detailSheet.mergeCells(`A${emptyRow.number}:D${emptyRow.number}`);
      }

      const expensesSheet = workbook.addWorksheet("Expense Details");
      expensesSheet.columns = [
        { header: "Date", key: "date", width: 18 },
        { header: "Name", key: "name", width: 28 },
        { header: "Description", key: "description", width: 40 },
        { header: "Amount (KES)", key: "amount", width: 18 },
        { header: "Status", key: "status", width: 14 },
        { header: "Paid At", key: "paidAt", width: 24 },
        { header: "Recurring", key: "recurring", width: 22 },
      ];

      if (expenseDetails?.length) {
        expenseDetails.forEach((detail) => {
          expensesSheet.addRow({
            date: formatDate(detail.date),
            name: detail.name,
            description: detail.description ?? "",
            amount: Number(detail.amount ?? 0),
            status: detail.isPaid ? "Paid" : "Unpaid",
            paidAt: formatDateTime(detail.paidAt),
            recurring: formatRecurringLabel(detail),
          });
        });
        const totalExpensesValue = expenseDetails.reduce((sum, detail) => sum + Number(detail.amount ?? 0), 0);
        const totalsRow = expensesSheet.addRow({
          date: "Totals",
          name: "",
          description: "",
          amount: totalExpensesValue,
          status: "",
          paidAt: "",
          recurring: "",
        });
        expensesSheet.mergeCells(`A${totalsRow.number}:C${totalsRow.number}`);
      } else {
        const emptyExpensesRow = expensesSheet.addRow({
          date: "No expenses recorded for the selected period.",
          name: "",
          description: "",
          amount: "",
          status: "",
          paidAt: "",
          recurring: "",
        });
        expensesSheet.mergeCells(`A${emptyExpensesRow.number}:G${emptyExpensesRow.number}`);
      }

      const templatesSheet = workbook.addWorksheet("Recurring Templates");
      templatesSheet.columns = [
        { header: "Template", key: "name", width: 28 },
        { header: "Amount (KES)", key: "amount", width: 18 },
        { header: "Schedule", key: "schedule", width: 22 },
        { header: "Start Date", key: "startDate", width: 18 },
        { header: "Next Run", key: "nextRun", width: 18 },
        { header: "End Date", key: "endDate", width: 18 },
        { header: "Auto Mark Paid", key: "autoMark", width: 18 },
        { header: "Status", key: "status", width: 14 },
        { header: "Generated", key: "generated", width: 14 },
        { header: "Outstanding (KES)", key: "outstanding", width: 22 },
      ];

      if (recurringTemplates?.length) {
        const templateRows = recurringTemplates.map((template) => ({
          name: template.name,
          amount: Number(template.amount ?? 0),
          schedule: formatTemplateInterval(template.interval, template.intervalType),
          startDate: formatDate(template.startDate),
          nextRun: formatDate(template.nextRunDate),
          endDate: formatDate(template.endDate ?? null),
          autoMark: template.autoMarkAsPaid ? "Yes" : "No",
          status: template.isActive ? "Active" : "Paused",
          generated: template.stats?.totalCount ?? 0,
          outstanding: Number(template.stats?.unpaidAmount ?? 0),
        }));

        templatesSheet.addRows(templateRows);

        const totalsRow = templatesSheet.addRow({
          name: "Totals",
          amount: templateRows.reduce((sum, row) => sum + (row.amount ?? 0), 0),
          generated: templateRows.reduce(
            (sum, row) => sum + (row.generated ?? 0),
            0
          ),
          outstanding: templateRows.reduce(
            (sum, row) => sum + (row.outstanding ?? 0),
            0
          ),
        });
        templatesSheet.mergeCells(`A${totalsRow.number}:F${totalsRow.number}`);
      } else {
        const emptyTemplateRow = templatesSheet.addRow({
          name: "No recurring templates configured for this organization.",
        });
        templatesSheet.mergeCells(`A${emptyTemplateRow.number}:J${emptyTemplateRow.number}`);
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = `financial-analytics-${organizationId}-${selectedPeriod}-${timestamp}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success("Excel export ready.");
    } catch (error) {
      console.error("Failed to export analytics", error);
      toast.error("Could not export analytics. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, [combinedTrendData, expenseDetails, financialOverview, isExporting, organizationId, recurringTemplates, selectedPeriod]);

  const canViewAnalytics = userPermissions?.canView || false;

  // Loading state
  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!canViewAnalytics) {
    return (
      <div className="my-8">
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view financial analytics in this organization."
          showBackButton={true}
          backButtonLabel="Back to Organization"
          backButtonLink={`/organization/${organizationId}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Financial Analytics
          </h1>
          <p className="text-muted-foreground">Comprehensive financial insights and trends</p>
        </div>
        
        {/* Period Selection */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Time Period:
            </span>
            {[
              { value: "7d", label: "7 Days", icon: Clock },
              { value: "30d", label: "30 Days", icon: Calendar },
              { value: "90d", label: "90 Days", icon: CalendarDays },
              { value: "1y", label: "1 Year", icon: Calendar },
              { value: "all", label: "All Time", icon: BarChart3 },
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={selectedPeriod === value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(value as typeof selectedPeriod)}
                className="flex items-center gap-2"
              >
                <Icon className="h-3 w-3" />
                {label}
              </Button>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as typeof selectedPeriod)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              className="flex items-center gap-2"
              onClick={handleExport}
              disabled={isExporting || overviewLoading || trendsLoading || expenseTrendsLoading || expenseDetailsLoading || recurringTemplatesLoading}
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Preparing..." : "Export to Excel"}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <StatCard
              title="Total Revenue"
              value={`KES ${(financialOverview?.totalRevenue || 0).toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5" />}
              color="green"
              isClickable={false}
              trend={financialOverview?.revenueGrowth !== undefined ? {
                value: Number(financialOverview.revenueGrowth.toFixed(1)),
                isPositive: (financialOverview.revenueGrowth || 0) >= 0,
              } : undefined}
            />
            <StatCard
              title="Total Expenses"
              value={`KES ${(financialOverview?.totalExpenses || 0).toLocaleString()}`}
              icon={<CreditCard className="h-5 w-5" />}
              color="red"
              isClickable={false}
              trend={financialOverview?.expenseGrowth !== undefined ? {
                value: Number(financialOverview.expenseGrowth.toFixed(1)),
                isPositive: (financialOverview.expenseGrowth || 0) >= 0,
              } : undefined}
            />
            <StatCard
              title="Net Profit"
              value={`KES ${(financialOverview?.netProfit || 0).toLocaleString()}`}
              icon={financialOverview?.netProfit && financialOverview.netProfit >= 0 ? 
                <TrendingUp className="h-5 w-5" /> : 
                <TrendingDown className="h-5 w-5" />
              }
              color={financialOverview?.netProfit && financialOverview.netProfit >= 0 ? "green" : "red"}
              isClickable={false}
            />
           </>
        )}
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full overflow-x-auto sm:grid sm:grid-cols-2 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue Trends
                </CardTitle>
                <CardDescription>Revenue over the selected period</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {trendsLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : (
                  <TrendBarChart data={(revenueTrends || []).map(d => ({ label: formatTrendLabel(d.date), amount: d.amount }))} />
                )}
                {trendsError && (
                  <div className="text-center text-red-500 py-4">
                    Error loading revenue trends: {trendsError.message}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Sources
                </CardTitle>
                <CardDescription>PPPoE vs Hotspot</CardDescription>
              </CardHeader>
              <CardContent>
                {sourcesLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <PieChartComponent 
                    data={[
                      { name: "PPPoE", amount: revenueSources?.pppoe || 0 },
                      { name: "Hotspot", amount: revenueSources?.hotspot || 0 },
                    ]}
                    title=""
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue vs Expenses vs Profit
                </CardTitle>
                <CardDescription>Comparison over the selected period</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {trendsLoading || expenseTrendsLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : (
                  <ChartContainer className="h-[220px] sm:h-72 md:h-80 w-full" config={{}}>
                    <ReBarChart data={combinedTrendData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                      <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v) => `KES ${Number(v).toLocaleString()}`} />
                      <ChartTooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent labelFormatter={(v) => String(v)} />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="var(--color-revenue, #3B82F6)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="expense" name="Expenses" fill="var(--color-expense, #EF4444)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="profit" name="Profit" fill="var(--color-profit, #10B981)" radius={[6, 6, 0, 0]} />
                    </ReBarChart>
                  </ChartContainer>
                )}
                {expenseTrendsError && (
                  <div className="text-center text-red-500 py-4">
                    Error loading expense trends: {expenseTrendsError.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        

        <TabsContent value="expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <PieChartComponent data={expenseBreakdown?.total || []} title="" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Trends</CardTitle>
                <CardDescription>Expenses over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseTrendsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <TrendBarChart data={(expenseTrends || []).map(d => ({ label: formatTrendLabel(d.date), amount: d.amount }))} />
                )}
                {expenseTrendsError && (
                  <div className="text-center text-red-500 py-4">
                    Error loading expense trends: {expenseTrendsError.message}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;

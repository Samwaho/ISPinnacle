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
  PieChart,
  Activity,
  Calendar,
  Clock,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart as ReBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";

// Monthly Bar Chart using shadcn charts (Recharts)
const MonthlyRevenueChart = ({ data }: { data: Array<{ month: string; amount: number }> }) => {
  if (!data.length) return <div className="text-center text-muted-foreground py-8">No data available</div>;

  return (
    <ChartContainer
      className="h-[220px] sm:h-72 md:h-80 w-full"
      config={{
        revenue: {
          label: "Revenue",
          color: "#3B82F6", // brighter blue
        },
      }}
    >
      <ReBarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v) => `KES ${Number(v).toLocaleString()}`}
        />
        <ChartTooltip
          cursor={{ fill: "hsl(var(--muted))" }}
          content={<ChartTooltipContent labelFormatter={(v) => String(v)} />}
        />
        <Bar dataKey="amount" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} />
      </ReBarChart>
    </ChartContainer>
  );
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

  const buildMonthlySeries = React.useCallback((raw: Array<{ date: string; amount: number }>) => {
    const now = new Date();
    let start = new Date();
    switch (selectedPeriod) {
      case "7d":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1); // include previous month for nicer x-axis
        break;
      case "30d":
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case "90d":
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "1y":
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        break;
      case "all":
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1); // last 12 months for aesthetics
        break;
    }
    const end = new Date(now.getFullYear(), now.getMonth(), 1);

    // Map raw to month key -> amount
    const map = new Map<string, number>();
    raw.forEach((d) => {
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + d.amount);
    });

    const result: Array<{ month: string; amount: number }> = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      result.push({
        month: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        amount: map.get(key) || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return result;
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

  console.log('Revenue trends query result:', { revenueTrends, trendsLoading, trendsError, selectedPeriod });

  // Expense Breakdown
  const { data: expenseBreakdown, isPending: expenseLoading } = useQuery(
    t.analytics.getExpenseBreakdown.queryOptions({ 
      organizationId, 
      period: selectedPeriod 
    })
  );

  // Customer Analytics
  const { data: customerAnalytics, isPending: customerLoading } = useQuery(
    t.analytics.getCustomerAnalytics.queryOptions({ organizationId })
  );

  // Payment Methods
  const { data: paymentMethods, isPending: paymentLoading } = useQuery(
    t.analytics.getPaymentMethods.queryOptions({ 
      organizationId, 
      period: selectedPeriod 
    })
  );

  const canViewAnalytics = userPermissions?.canView || false;

  // Loading state
  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <StatCard
              title="M-Pesa Transactions"
              value={`KES ${(financialOverview?.totalMpesaTransactions || 0).toLocaleString()}`}
              icon={<Activity className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
          </>
        )}
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full overflow-x-auto sm:grid sm:grid-cols-3 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <MonthlyRevenueChart 
                    data={buildMonthlySeries(revenueTrends || [])}
                  />
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
                  <PieChart className="h-5 w-5" />
                  Payment Methods
                </CardTitle>
                <CardDescription>Revenue by payment method</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {paymentLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <PieChartComponent 
                    data={[
                      { name: "M-Pesa", amount: paymentMethods?.mpesa.amount || 0 },
                      { name: "Payment Links", amount: paymentMethods?.paymentLinks.amount || 0 },
                    ]} 
                    title="" 
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue over the selected period</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {trendsLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : (
                  <MonthlyRevenueChart 
                    data={buildMonthlySeries(revenueTrends || [])}
                  />
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
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest customer payments</CardDescription>
              </CardHeader>
              <CardContent>
                {customerLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <div className="space-y-3">
                    {customerAnalytics?.recentPayments?.slice(0, 5).map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{payment.customer.name}</div>
                          <div className="text-sm text-muted-foreground">{payment.package?.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">KES {payment.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
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
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Paid vs unpaid expenses</CardDescription>
              </CardHeader>
              <CardContent>
                {expenseLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <PieChartComponent 
                    data={[
                      { name: "Paid", amount: expenseBreakdown?.paid.reduce((sum, item) => sum + item.amount, 0) || 0 },
                      { name: "Unpaid", amount: expenseBreakdown?.unpaid.reduce((sum, item) => sum + item.amount, 0) || 0 },
                    ]} 
                    title="" 
                  />
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

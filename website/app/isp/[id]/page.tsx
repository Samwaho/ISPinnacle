"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/ui/access-denied";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  BarChart as ReBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  Receipt,
} from "lucide-react";

const DashboardPage = () => {
  const { id } = useParams();
  const organizationId = id as string;
  const t = useTRPC();

  const [selectedPeriod, setSelectedPeriod] = React.useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");

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

  // Overview + trends
  const { data: financialOverview } = useQuery(
    t.analytics.getFinancialOverview.queryOptions({ organizationId, period: selectedPeriod })
  );
  const { data: revenueTrends, isPending: trendsLoading } = useQuery(
    t.analytics.getRevenueTrends.queryOptions({ organizationId, period: selectedPeriod })
  );
  const { data: expenseTrends, isPending: expenseTrendsLoading, error: expenseTrendsError } = useQuery(
    t.analytics.getExpenseTrends.queryOptions({ organizationId, period: selectedPeriod })
  );

  // Entities and sources
  const { data: customerAnalytics } = useQuery(
    t.analytics.getCustomerAnalytics.queryOptions({ organizationId })
  );
  const { data: revenueSources, isPending: sourcesLoading } = useQuery(
    t.analytics.getRevenueSources.queryOptions({ organizationId, period: selectedPeriod })
  );
  const { data: txStats } = useQuery(
    t.transactions.getTransactionStats.queryOptions({ organizationId })
  );
  const { data: activities, isPending: activitiesLoading } = useQuery(
    t.organization.getOrganizationActivities.queryOptions({ id: organizationId })
  );

  const canView = userPermissions?.canView || false;
  type PackageDistItem = { packageName: string; customerCount: number };
  type ActivityItem = { id: string; activity?: string; createdAt: string | Date; user?: { name?: string | null; email?: string | null } | null };
  const packageDistribution = (customerAnalytics?.packageDistribution ?? []) as PackageDistItem[];
  const recentActivities = (activities ?? []) as unknown as ActivityItem[];

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

  // Derived trends
  const txTrend = React.useMemo(() => {
    if (!txStats) return undefined;
    const last = txStats.lastMonthAmount || 0;
    const current = txStats.thisMonthAmount || 0;
    if (last === 0) return undefined;
    const delta = ((current - last) / last) * 100;
    return { value: Math.round(delta), isPositive: delta >= 0 } as const;
  }, [txStats]);

  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="my-8">
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view this organization dashboard."
          showBackButton
          backButtonLabel="Back"
          backButtonLink={`/organization/${organizationId}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">Key metrics and recent activity</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          {(["7d","30d","90d","1y","all"] as const).map(p => (
            <Button key={p} size="sm" variant={selectedPeriod===p?"default":"outline"} onClick={() => setSelectedPeriod(p)}>
              {p === "7d" ? "7D" : p === "30d" ? "30D" : p.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`KES ${(financialOverview?.totalRevenue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
          trend={financialOverview ? { value: Math.round(financialOverview.revenueGrowth || 0), isPositive: (financialOverview.revenueGrowth || 0) >= 0 } : undefined}
        />
        <StatCard
          title="Total Expenses"
          value={`KES ${(financialOverview?.totalExpenses || 0).toLocaleString()}`}
          icon={<CreditCard className="h-5 w-5" />}
          color="red"
          trend={financialOverview ? { value: Math.round(financialOverview.expenseGrowth || 0), isPositive: (financialOverview.expenseGrowth || 0) <= 0 ? false : true } : undefined}
        />
        <StatCard
          title="Net Profit"
          value={`KES ${(financialOverview?.netProfit || 0).toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="Transactions"
          value={`${txStats?.totalTransactions || 0}`}
          icon={<Receipt className="h-5 w-5" />}
          color="orange"
          trend={txTrend}
        />
      </div>

      {/* Customers overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Customers"
          value={`${customerAnalytics?.totalCustomers || 0}`}
          icon={<Users className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Active Customers"
          value={`${customerAnalytics?.activeCustomers || 0}`}
          icon={<Users className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Expired/Inactive"
          value={`${(customerAnalytics?.expiredCustomers || 0) + (customerAnalytics?.inactiveCustomers || 0)}`}
          icon={<Users className="h-5 w-5" />}
          color="red"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses vs Profit</CardTitle>
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

        <Card>
          <CardHeader>
            <CardTitle>Revenue Sources</CardTitle>
            <CardDescription>PPPoE vs Hotspot</CardDescription>
          </CardHeader>
          <CardContent>
            {sourcesLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">PPPoE</span>
                  <span className="font-semibold">KES {(revenueSources?.pppoe || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Hotspot</span>
                  <span className="font-semibold">KES {(revenueSources?.hotspot || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 mt-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold">KES {(revenueSources?.total || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
      </CardContent>
    </Card>
  </div>

      {/* Package distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Package Distribution</CardTitle>
          <CardDescription>Customers by package</CardDescription>
        </CardHeader>
        <CardContent>
          {(packageDistribution.length === 0) ? (
            <div className="text-sm text-muted-foreground text-center py-6">No package data available</div>
          ) : (
            <div className="space-y-4">
              {packageDistribution.map((item, index) => {
                const total = customerAnalytics?.totalCustomers ?? 0;
                const percentage = total > 0 ? (item.customerCount / total) * 100 : 0;
                const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
                const color = colors[index % colors.length];
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium">{item.packageName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{item.customerCount}</div>
                        <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest changes across the organization</CardDescription>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="space-y-3">
              {recentActivities.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{a.activity || ''}</div>
                    <div className="text-xs text-muted-foreground">{a.user?.name || a.user?.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">No activity yet</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;

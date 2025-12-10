"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/ui/access-denied";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Label,
  Legend
} from "recharts";
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Wifi,
  ArrowUpRight,
  ArrowDownRight,
  HardDrive,
  type LucideIcon
} from "lucide-react";
import { clsx } from "clsx";

const COLORS = [
  "#2563eb", // blue-600
  "#16a34a", // green-600
  "#dc2626", // red-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#db2777", // pink-600
  "#0891b2", // cyan-600
];

const DashboardPage = () => {
  const { id } = useParams();
  const organizationId = id as string;
  const t = useTRPC();
  const [period, setPeriod] = React.useState<"7d" | "30d" | "90d" | "1y">("30d");

  // --- Data Fetching ---
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );

  const { data: financialOverview } = useQuery(
    t.analytics.getFinancialOverview.queryOptions({ organizationId, period })
  );

  const { data: revenueTrends } = useQuery(
    t.analytics.getRevenueTrends.queryOptions({ organizationId, period })
  );

  const { data: expenseTrends } = useQuery(
    t.analytics.getExpenseTrends.queryOptions({ organizationId, period })
  );

  const { data: realtimeStats } = useQuery(
    t.analytics.getRealtimeStats.queryOptions({ organizationId })
  );

  const { data: dataUsage } = useQuery(
    t.analytics.getDataUsageStats.queryOptions({ organizationId })
  );

  const { data: growthStats } = useQuery(
    t.analytics.getCustomerGrowth.queryOptions({ organizationId, period })
  );

  const { data: activities } = useQuery(
    t.organization.getOrganizationActivities.queryOptions({ id: organizationId })
  );

  const { data: customerAnalytics } = useQuery(
    t.analytics.getCustomerAnalytics.queryOptions({ organizationId })
  );

  const { data: revenueSources } = useQuery(
    t.analytics.getRevenueBySource.queryOptions({ organizationId })
  );

  // --- Derived Data ---
  const canView = userPermissions?.canView || false;

  // Combine Revenue & Expense for the main chart
  const mainChartData = React.useMemo(() => {
    if (!revenueTrends || !expenseTrends) return [];
    
    const revMap = new Map(revenueTrends.map(x => [x.date, x.amount]));
    const expMap = new Map(expenseTrends.map(x => [x.date, x.amount]));
    
    const allDates = Array.from(new Set([...revMap.keys(), ...expMap.keys()])).sort();
    
    return allDates.map(date => ({
      date,
      revenue: revMap.get(date) || 0,
      expense: expMap.get(date) || 0,
    }));
  }, [revenueTrends, expenseTrends]);

  // Network Health Data (Devices)
  const networkHealthData = React.useMemo(() => {
    if (!realtimeStats) return [];
    return [
      { name: "Online", value: realtimeStats.devices.online, fill: "#16a34a" }, // green-600
      { name: "Offline", value: realtimeStats.devices.offline, fill: "#dc2626" }, // red-600
    ];
  }, [realtimeStats]);



  // Package Distribution Data
  const packageData = React.useMemo(() => {
    if (!customerAnalytics?.packageDistribution) return [];
    return customerAnalytics.packageDistribution.map((item: { packageName: string; customerCount: number }, index: number) => ({
      name: item.packageName,
      value: item.customerCount,
      fill: COLORS[index % COLORS.length]
    }));
  }, [customerAnalytics]);

  // Revenue Sources Data
  const revenueSourceData = React.useMemo(() => {
    if (!revenueSources) return [];
    return revenueSources.map((item: { source: string; amount: number }) => ({
        name: item.source,
        value: item.amount,
        fill: item.source === "PPPOE" ? "#2563eb" : item.source === "HOTSPOT" ? "#d97706" : "#94a3b8"
    }));
  }, [revenueSources]);


  // Data Usage Data (Top 5)
  const dataUsageChartData = React.useMemo(() => {
    if (!dataUsage) return [];
    return dataUsage.slice(0, 5).map(u => ({
      name: u.name || u.username || "Unknown",
      total: (u.total / (1024 * 1024 * 1024)).toFixed(2), // GB
    }));
  }, [dataUsage]);


  if (permissionsLoading) {
    return <DashboardSkeleton />;
  }

  if (!canView) {
    return (
       <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <AccessDenied 
           title="Access Denied" 
           message="You do not have permission to view this dashboard."
           showBackButton
           backButtonLink={`/organization/${organizationId}`}
        />
       </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-[1920px] mx-auto min-h-screen bg-gray-50/50 dark:bg-zinc-950/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Overview of your network and business performance.</p>
        </div>
        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border shadow-sm">
          {(["7d", "30d", "90d", "1y"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="px-3"
            >
              {p.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          icon={DollarSign}
          value={`KES ${(financialOverview?.totalRevenue || 0).toLocaleString()}`}
          trend={financialOverview?.revenueGrowth}
          color="text-emerald-600"
        />
        <KpiCard
          title="Active Users"
          icon={Users}
          value={realtimeStats?.customers.online.toString() || "0"}
          subValue={`/ ${realtimeStats?.customers.total || 0} Total`}
          color="text-blue-600"
        />
        <KpiCard
          title="Devices Online"
          icon={Wifi}
          value={realtimeStats?.devices.online.toString() || "0"}
          subValue={`/ ${realtimeStats?.devices.total || 0} Total`}
          color="text-indigo-600"
        />
        <KpiCard
          title="Net Profit"
          icon={TrendingUp}
          value={`KES ${(financialOverview?.netProfit || 0).toLocaleString()}`}
          trend={0} 
          color="text-violet-600"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Row 1 */}
        {/* Financial Chart (Span 6) */}
        <Card className="md:col-span-6 shadow-sm flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Financial Performance</CardTitle>
            <CardDescription>Revenue vs Expenses over {period}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-4 min-h-0">
            <ChartContainer config={{ 
                revenue: { label: "Revenue", color: "#2563eb" },
                expense: { label: "Expenses", color: "#dc2626" } 
              }} 
              className="h-full w-full"
            >
              <BarChart data={mainChartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis 
                   dataKey="date" 
                   tickLine={false} 
                   axisLine={false} 
                   tickMargin={8} 
                   tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                   minTickGap={30}
                />
                <YAxis
                   tickLine={false}
                   axisLine={false}
                   tickFormatter={(value) => `K${(value / 1000).toFixed(0)}k`}
                   width={50}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                    dataKey="revenue" 
                    fill="var(--color-revenue)" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={50}
                />
                <Bar 
                    dataKey="expense" 
                    fill="var(--color-expense)" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={50}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Sources (Span 3) */}
        <Card className="md:col-span-3 shadow-sm flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Revenue Sources</CardTitle>
            <CardDescription>PPPoE vs Hotspot</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
             <ChartContainer config={{}} className="h-full w-full mx-auto">
               <PieChart>
                  <Pie
                    data={revenueSourceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {revenueSourceData.map((entry: { fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const total = revenueSourceData.reduce((acc, curr) => acc + curr.value, 0);
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                K{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toLocaleString()}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                Total
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
               </PieChart>
             </ChartContainer>
          </CardContent>
        </Card>

        {/* Package Distribution (Span 3) */}
        <Card className="md:col-span-3 shadow-sm flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle>Packages</CardTitle>
            <CardDescription>User distribution</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ChartContainer config={{}} className="h-full w-full mx-auto">
              <PieChart>
                 <Pie
                    data={packageData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                 >
                    {packageData.map((entry: { fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                {realtimeStats?.customers.total || 0}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                Total
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                 </Pie>
                 {/* Use standard Legend for dynamic data names */}
                 <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                 <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Row 2 */}
        {/* Customer Stats: Active/Inactive (Span 4) */}
        <Card className="md:col-span-4 shadow-sm flex flex-col">
            <CardHeader>
                <CardTitle>Customer Status</CardTitle>
                <CardDescription>Real-time connectivity & account status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Connection Status</h4>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/50">
                            <div className="text-2xl font-bold text-green-600">{realtimeStats?.customers.online || 0}</div>
                            <div className="text-xs text-green-700/80 font-medium">Online</div>
                        </div>
                        <div className="flex-1 p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-100 dark:border-slate-800">
                             <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{realtimeStats?.customers.offline || 0}</div>
                             <div className="text-xs text-slate-500 font-medium">Offline</div>
                        </div>
                    </div>
                </div>

                {/* Account Status */}
                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">Account Status</h4>
                    <div className="space-y-2">
                         {/* Active */}
                         <div className="flex items-center justify-between text-sm">
                             <span className="flex items-center gap-2">
                                 <span className="h-2 w-2 rounded-full bg-green-500" /> Active
                             </span>
                             <span className="font-medium">{customerAnalytics?.activeCustomers || 0}</span>
                         </div>
                         {/* Inactive */}
                         <div className="flex items-center justify-between text-sm">
                             <span className="flex items-center gap-2">
                                 <span className="h-2 w-2 rounded-full bg-amber-500" /> Inactive
                             </span>
                             <span className="font-medium">{customerAnalytics?.inactiveCustomers || 0}</span>
                         </div>
                         {/* Expired */}
                         <div className="flex items-center justify-between text-sm">
                             <span className="flex items-center gap-2">
                                 <span className="h-2 w-2 rounded-full bg-red-500" /> Expired
                             </span>
                             <span className="font-medium">{customerAnalytics?.expiredCustomers || 0}</span>
                         </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Activity Feed (Span 5: WIDER) */}
        <Card className="md:col-span-5 shadow-sm flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
             <ScrollArea className="h-full px-6 pb-6">
                <div className="space-y-6 pt-2">
                    {(activities || []).slice(0, 10).map((activity: { activity: string; createdAt: Date; user?: { name: string | null } }, i) => (
                        <div key={i} className="flex gap-4 relative pl-2 group">
                           {/* Timeline line */}
                           {i !== Math.min((activities || []).length, 10) - 1 && (
                               <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border group-hover:bg-primary/50 transition-colors" />
                           )}
                           <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0 z-10 ring-4 ring-background group-hover:scale-125 transition-transform" />
                           <div className="flex flex-col gap-1">
                               <span className="text-sm font-medium leading-none">{activity.activity}</span>
                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                   <span>{new Date(activity.createdAt).toLocaleString()}</span>
                                   <span>•</span>
                                   <span>{activity.user?.name || "System"}</span>
                               </div>
                           </div>
                        </div>
                    ))}
                    {(activities || []).length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8">No recent activity</div>
                    )}
                </div>
             </ScrollArea>
          </CardContent>
        </Card>

        {/* Network Health / Devices (Span 3) */}
        <Card className="md:col-span-3 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
             <ChartContainer config={{}} className="h-[180px] w-full">
               <PieChart>
                  <Pie
                    data={networkHealthData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={65}
                    strokeWidth={2}
                  >
                    {networkHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                    ))}
                     <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                {realtimeStats?.devices.total || 0}
                              </tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 20} className="fill-muted-foreground text-xs">
                                Routers
                              </tspan>
                            </text>
                          )
                        }
                      }}
                    />
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
               </PieChart>
             </ChartContainer>
          </CardContent>
        </Card>

        {/* Row 3 */}
         {/* Customer Growth (Span 8) */}
        <Card className="md:col-span-8 shadow-sm h-[300px] flex flex-col">
           <CardHeader>
             <CardTitle>Customer Growth</CardTitle>
             <CardDescription>Cumulative active customers over time</CardDescription>
           </CardHeader>
           <CardContent className="flex-1 min-h-0">
             <ChartContainer config={{
                 cumulative: { label: "Customers", color: "#2563eb" }
             }} className="h-full w-full">
                <AreaChart data={growthStats || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="fillGrowth" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0.1}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis 
                        dataKey="date" 
                        hide
                    />
                    <YAxis 
                        tickLine={false} 
                        axisLine={false}
                        width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="var(--color-cumulative)" 
                        fill="url(#fillGrowth)" 
                        strokeWidth={2}
                    />
                </AreaChart>
             </ChartContainer>
           </CardContent>
        </Card>

        {/* Data Usage Top 5 (Span 4) */}
        <Card className="md:col-span-4 shadow-sm h-[300px] flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-blue-500" /> Costliest Users (GB)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                <div className="space-y-4 pt-2">
                    {dataUsageChartData.map((item, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="font-medium truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                <span className="text-muted-foreground">{item.total} GB</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (parseFloat(item.total) / (parseFloat(dataUsageChartData[0]?.total || "1"))) * 100)}%` }} 
                                />
                            </div>
                        </div>
                    ))}
                     {dataUsageChartData.length === 0 && (
                        <div className="text-center text-muted-foreground text-xs py-4">No data usage records</div>
                    )}
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
};

// --- Subcomponents ---

function KpiCard({ title, icon: Icon, value, subValue, trend, color }: { title: string; icon: LucideIcon; value: string; subValue?: string; trend?: number; color?: string }) {
  return (
    <Card className="shadow-sm border-l-4" style={{ borderLeftColor: color ? undefined : 'transparent' }}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={clsx("h-4 w-4", color)} />
        </div>
        <div className="flex items-end justify-between">
           <div>
              <div className="text-2xl font-bold">{value}</div>
              {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
           </div>
           {trend !== undefined && (
             <div className={clsx("flex items-center text-xs font-medium", trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
               {trend >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
               {Math.abs(trend).toFixed(1)}%
             </div>
           )}
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
    return (
        <div className="flex flex-col gap-8 p-8 max-w-[1600px] mx-auto">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Skeleton className="md:col-span-2 md:row-span-2 h-[400px]" />
                <Skeleton className="md:col-span-1 h-[250px]" />
                <Skeleton className="md:col-span-1 md:row-span-2 h-[500px]" />
                <Skeleton className="md:col-span-1 h-[250px]" />
             </div>
        </div>
    )
}

export default DashboardPage;

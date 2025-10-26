"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { transactionColumns } from "@/components/isp/transaction-columns";
import { CreditCard, DollarSign, TrendingUp, Calendar, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/ui/access-denied";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TransactionsPage = () => {
  const { id } = useParams();
  const t = useTRPC();

  const { data: transactions, isPending } = useQuery(
    t.transactions.getTransactions.queryOptions({ organizationId: id as string })
  );

  const { data: transactionStats, isPending: statsPending } = useQuery(
    t.transactions.getTransactionStats.queryOptions({ organizationId: id as string })
  );

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  // Check if user has permission to view transactions
  const canViewTransactions = userPermissions?.canViewCustomers || false;
  const canManageTransactions = userPermissions?.canManageCustomers || false;

  console.log("Permissions:", { canViewTransactions, canManageTransactions, userPermissions });

  // Local filters for gateway and source (must be declared before any return)
  const [gatewayFilter, setGatewayFilter] = React.useState<'ALL' | 'MPESA' | 'KOPOKOPO' | 'OTHER'>("ALL");
  const [sourceFilter, setSourceFilter] = React.useState<'ALL' | 'PPPOE' | 'HOTSPOT' | 'OTHER'>("ALL");

  const filtered = React.useMemo(() => {
    const rows = (transactions || []).map((t) => ({
      id: t.id,
      organizationId: t.organizationId,
      transactionType: t.transactionType,
      transactionId: t.transactionId,
      billReferenceNumber: t.billReferenceNumber,
      phoneNumber: t.phoneNumber,
      amount: t.amount,
      name: t.name,
      transactionDateTime: t.transactionDateTime instanceof Date ? t.transactionDateTime : new Date(t.transactionDateTime),
      orgAccountBalance: t.orgAccountBalance,
      invoiceNumber: t.invoiceNumber,
      paymentGateway: ((): 'MPESA' | 'KOPOKOPO' | 'OTHER' => {
        const gw = (t as { paymentGateway?: 'MPESA' | 'KOPOKOPO' | 'OTHER' | null }).paymentGateway;
        if (gw) return gw;
        return t.invoiceNumber?.startsWith('K2-') ? 'KOPOKOPO' : 'MPESA';
      })(),
      source: ((): 'PPPOE' | 'HOTSPOT' | 'OTHER' | null => {
        const s = (t as { source?: 'PPPOE' | 'HOTSPOT' | 'OTHER' | null }).source;
        return s ?? null;
      })(),
      createdAt: t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt),
      updatedAt: t.updatedAt instanceof Date ? t.updatedAt : new Date(t.updatedAt),
    }));
    return rows.filter(r => {
      const gwOk = gatewayFilter === 'ALL' || r.paymentGateway === gatewayFilter;
      const srcOk = sourceFilter === 'ALL' || r.source === sourceFilter;
      return gwOk && srcOk;
    });
  }, [transactions, gatewayFilter, sourceFilter]);

  // Show loading state while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg p-6 border">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
            </div>
          </div>
        </div>

        {/* Header Loading */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Table Loading */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      {!canViewTransactions ? (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view transactions in this organization."
          showBackButton={true}
          backButtonLabel="Back to Organization"
          backButtonLink={`/organization/${id}`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {statsPending ? (
              <>
                <div className="bg-card rounded-lg p-6 border">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-6 border">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-6 border">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-lg p-6 border">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <StatCard
                  title="Total Transactions"
                  value={transactionStats?.totalTransactions.toString() || "0"}
                  icon={<CreditCard className="h-5 w-5" />}
                  color="blue"
                  isClickable={false}
                />
                <StatCard
                  title="Total Revenue"
                  value={`$${(transactionStats?.totalAmount || 0).toFixed(2)}`}
                  icon={<DollarSign className="h-5 w-5" />}
                  color="green"
                  isClickable={false}
                />
                <StatCard
                  title="This Month"
                  value={transactionStats?.thisMonthTransactions.toString() || "0"}
                  icon={<TrendingUp className="h-5 w-5" />}
                  color="yellow"
                  isClickable={false}
                />
                <StatCard
                  title="This Month Revenue"
                  value={`$${(transactionStats?.thisMonthAmount || 0).toFixed(2)}`}
                  icon={<Calendar className="h-5 w-5" />}
                  color="purple"
                  isClickable={false}
                />
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5" /> Transactions
            </h3>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={gatewayFilter} onValueChange={(v) => setGatewayFilter(v as typeof gatewayFilter)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Gateway" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Gateways</SelectItem>
                  <SelectItem value="MPESA">M-Pesa</SelectItem>
                  <SelectItem value="KOPOKOPO">KopoKopo</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as typeof sourceFilter)}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Sources</SelectItem>
                  <SelectItem value="PPPOE">PPPoE</SelectItem>
                  <SelectItem value="HOTSPOT">Hotspot</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isPending ? (
            <div className="space-y-3">
              {/* Table Header Skeleton */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              
              {/* Table Rows Skeleton */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={transactionColumns({ canManageTransactions })}
              data={filtered}
              filterPlaceholder="Search transactions..."
            />
          )}
        </>
      )}
    </div>
  );
};

export default TransactionsPage;

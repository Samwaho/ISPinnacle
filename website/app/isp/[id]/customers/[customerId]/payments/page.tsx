"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/table/DataTable";
import { customerPaymentColumns, CustomerPaymentTableRow } from "@/components/isp/customer-payment-columns";
import { ArrowLeft, DollarSign, CreditCard, Calendar, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { AccessDenied } from "@/components/ui/access-denied";
import { toast } from "sonner";

const CustomerPaymentsPage = () => {
  const { id: organizationId, customerId } = useParams();
  const router = useRouter();
  const t = useTRPC();

  const { data: customer, isPending: customerLoading } = useQuery(
    t.customer.getCustomerById.queryOptions({ 
      id: customerId as string, 
      organizationId: organizationId as string 
    })
  );

  const { data: payments, isPending: paymentsLoading } = useQuery(
    t.customer.getCustomerPayments.queryOptions({ 
      customerId: customerId as string, 
      organizationId: organizationId as string 
    })
  );

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId as string })
  );

  // Check if user has permission to view customers
  const canViewCustomers = userPermissions?.canViewCustomers || false;
  const canManagePayments = userPermissions?.canManageCustomers || false;

  if (permissionsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        {/* Header Loading */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Details Loading */}
        <div className="bg-card border rounded-lg p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Table Loading */}
        <div className="bg-card border rounded-lg">
          <div className="p-6 border-b">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canViewCustomers) {
    return <AccessDenied />;
  }

  if (customerLoading || paymentsLoading) {
    return (
      <div className="flex flex-col gap-6 my-8">
        {/* Header Loading */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        
        {/* Stats Cards Loading */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Details Loading */}
        <div className="bg-card border rounded-lg p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Table Loading */}
        <div className="bg-card border rounded-lg">
          <div className="p-6 border-b">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
              
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-6 w-16 rounded" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Customer not found</h2>
          <p className="text-muted-foreground">The customer you're looking for doesn't exist.</p>
        </div>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const totalPayments = payments?.length ?? 0;
  const totalAmount = payments?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const latestPayment = payments?.[0];
  const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0;

  const columns = customerPaymentColumns({ canManagePayments });

  const tableData: CustomerPaymentTableRow[] = payments?.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    package: payment.package ? {
      id: payment.package.id,
      name: payment.package.name,
      type: payment.package.type as "PPPOE" | "HOTSPOT",
    } : null,
    createdAt: payment.createdAt instanceof Date ? payment.createdAt : new Date(payment.createdAt),
    updatedAt: payment.updatedAt instanceof Date ? payment.updatedAt : new Date(payment.updatedAt),
  })) ?? [];

  return (
    <div className="flex flex-col gap-6 my-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Customer Payments</h1>
          <p className="text-muted-foreground">
            Payment history for {customer.name}
          </p>
        </div>
      </div>

             {/* Customer Info */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <StatCard
           title="Total Payments"
           value={totalPayments.toString()}
           icon={<CreditCard className="h-5 w-5" />}
           color="blue"
           isClickable={false}
         />
         <StatCard
           title="Total Amount"
           value={`$${totalAmount.toFixed(2)}`}
           icon={<DollarSign className="h-5 w-5" />}
           color="green"
           isClickable={false}
         />
         <StatCard
           title="Average Payment"
           value={`$${averageAmount.toFixed(2)}`}
           icon={<DollarSign className="h-5 w-5" />}
           color="purple"
           isClickable={false}
         />
         <StatCard
           title="Latest Payment"
           value={latestPayment ? latestPayment.createdAt.toLocaleDateString() : "None"}
           icon={<Calendar className="h-5 w-5" />}
           color="orange"
           isClickable={false}
         />
       </div>

      {/* Customer Details */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <p className="text-sm">{customer.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="text-sm">{customer.email || "Not provided"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Phone</label>
            <p className="text-sm">{customer.phone}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <p className="text-sm capitalize">{customer.status.toLowerCase()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Station</label>
            <p className="text-sm">{customer.station?.name || "Not assigned"}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Current Package</label>
            <p className="text-sm">{customer.package?.name || "Not assigned"}</p>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-card border rounded-lg">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Payment History</h2>
          <p className="text-sm text-muted-foreground">
            All payments made by this customer
          </p>
        </div>
        <div className="p-6">
          {tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <CreditCard className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium">No payments found</h3>
                <p className="text-sm text-muted-foreground">
                  This customer hasn't made any payments yet.
                </p>
              </div>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tableData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerPaymentsPage;

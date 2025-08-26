"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { customerColumns, CustomerTableRow } from "@/components/isp/customer-columns";
import { Users, UserPlus, DollarSign, Plus, Wifi, Globe, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AccessDenied } from "@/components/ui/access-denied";

const CustomerPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const t = useTRPC();
  const [selectedCustomers, setSelectedCustomers] = React.useState<CustomerTableRow[]>([]);
  const { data: customers, isPending } = useQuery(
    t.customer.getCustomers.queryOptions({ organizationId: id as string })
  );

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  const totalCustomers = isPending ? 0 : customers?.length ?? 0;
  const activeCustomers = isPending ? 0 : customers?.filter(c => c.status === "ACTIVE").length ?? 0;
  const inactiveCustomers = isPending ? 0 : customers?.filter(c => c.status === "INACTIVE").length ?? 0;
  const expiredCustomers = isPending ? 0 : customers?.filter(c => c.status === "EXPIRED").length ?? 0;

  const queryClient = useQueryClient();

  // Check if user has permission to view customers
  const canViewCustomers = userPermissions?.canViewCustomers || false;
  const canManageCustomers = userPermissions?.canManageCustomers || false;

  console.log("Permissions:", { canViewCustomers, canManageCustomers, userPermissions });

  const {
    mutate: deleteCustomer,
    isPending: isDeletingCustomer,
  } = useMutation(
    t.customer.deleteCustomer.mutationOptions({
      onSuccess: () => {
        console.log("Customer deleted successfully");
        toast.success("Customer deleted successfully");
        // Invalidate customers queries using TRPC's type-safe queryKey
        queryClient.invalidateQueries({
          queryKey: t.customer.getCustomers.queryKey({ organizationId: id as string }),
        });
        setDeletingCustomer(null);
      },
      onError: (error) => {
        console.error("Delete customer error:", error);
        toast.error(error.message || "Failed to delete customer");
        setDeletingCustomer(null);
      },
    })
  );

  const [deletingCustomer, setDeletingCustomer] = React.useState<CustomerTableRow | null>(null);

  const handleDeleteCustomer = (customer: CustomerTableRow) => {
    console.log("Delete customer clicked:", customer);
    setDeletingCustomer(customer);
  };

  const handleEditCustomer = (customer: CustomerTableRow) => {
    router.push(`/isp/${id}/customers/${customer.id}/edit`);
  };

  const columns = customerColumns({
    onEditCustomer: handleEditCustomer,
    onDeleteCustomer: handleDeleteCustomer,
    canManageCustomers,
  });

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
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table Loading */}
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      {!canViewCustomers ? (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view customers in this organization."
          showBackButton={true}
          backButtonLabel="Back to Organization"
          backButtonLink={`/organization/${id}`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isPending ? (
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
              title="Total Customers"
              value={totalCustomers.toString()}
              icon={<Users className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
            <StatCard
              title="Active Customers"
              value={activeCustomers.toString()}
              icon={<UserPlus className="h-5 w-5" />}
              color="green"
              isClickable={false}
            />
            <StatCard
              title="Inactive Customers"
              value={inactiveCustomers.toString()}
              icon={<MapPin className="h-5 w-5" />}
              color="yellow"
              isClickable={false}
            />
            <StatCard
              title="Expired Customers"
              value={expiredCustomers.toString()}
              icon={<DollarSign className="h-5 w-5" />}
              color="red"
              isClickable={false}
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5" /> Customers
        </h3>
        {userPermissions?.canManageCustomers && !permissionsLoading && (
          <Link href={`/isp/${id}/customers/new`}>
            <Button variant="gradient" >
              <Plus className="h-5 w-5" /> Add Customer
            </Button>
          </Link>
        )}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {/* Table Header Skeleton */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
          
          {/* Table Rows Skeleton */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-16 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : (
                 <DataTable
           columns={columns}
           data={customers?.map((c) => ({
             id: c.id,
             name: c.name,
             email: c.email,
             phone: c.phone || "",
             address: c.address,
             status: c.status as "ACTIVE" | "INACTIVE" | "EXPIRED",
             station: c.station ? {
               id: c.station.id,
               name: c.station.name,
             } : null,
             package: c.package ? {
               id: c.package.id,
               name: c.package.name,
               type: c.package.type as "PPPOE" | "HOTSPOT",
             } : null,
             paymentCount: c.paymentCount,
             lastPayment: c.lastPayment ? {
               id: c.lastPayment.id,
               amount: c.lastPayment.amount,
               date: c.lastPayment.createdAt instanceof Date ? c.lastPayment.createdAt : new Date(c.lastPayment.createdAt),
               isPaid: true, // Assuming all payments in the system are paid
             } : null,
             expiryDate: c.expiryDate ? (c.expiryDate instanceof Date ? c.expiryDate : new Date(c.expiryDate)) : null,
             createdAt: c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt),
           })) ?? []}
           filterPlaceholder="Search customers..."
           onRowSelectionChange={setSelectedCustomers}
         />
      )}
        </>
      )}

      {/* Delete Customer Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={() => {
          console.log("Delete confirmation clicked:", deletingCustomer);
          if (deletingCustomer) {
            if (deletingCustomer.paymentCount > 0) {
              toast.error("Cannot delete customer with payment history. Please archive the customer instead.");
              setDeletingCustomer(null);
              return;
            }
            console.log("Calling deleteCustomer with:", { id: deletingCustomer.id, organizationId: id as string });
            deleteCustomer({
              id: deletingCustomer.id,
              organizationId: id as string,
            });
          }
        }}
        title="Delete Customer"
        description={`Are you sure you want to delete the customer "${deletingCustomer?.name}"? This action cannot be undone.${
          deletingCustomer?.paymentCount && deletingCustomer.paymentCount > 0
            ? ` This customer has ${deletingCustomer.paymentCount} payment(s) and cannot be deleted.`
            : ""
        }`}
        isLoading={isDeletingCustomer}
        variant="destructive"
      />
    </div>
  );
};

export default CustomerPage;

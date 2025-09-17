"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { packageColumns, PackageTableRow } from "@/components/isp/package-columns";
import { Package, Users, DollarSign, Plus, Wifi, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AccessDenied } from "@/components/ui/access-denied";

const PackagePage = () => {
  const { id } = useParams();
  const router = useRouter();
  const t = useTRPC();
  const [selectedPackages, setSelectedPackages] = React.useState<PackageTableRow[]>([]);
  const { data: packages, isPending } = useQuery(
    t.packages.getPackages.queryOptions({ organizationId: id as string })
  );

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  const totalPackages = isPending ? 0 : packages?.length ?? 0;
  const pppoePackages = isPending ? 0 : packages?.filter(p => p.type === "PPPOE").length ?? 0;
  const hotspotPackages = isPending ? 0 : packages?.filter(p => p.type === "HOTSPOT").length ?? 0;

  const queryClient = useQueryClient();

  // Check if user has permission to view packages
  const canViewPackages = userPermissions?.canViewPackages || false;
  const canManagePackages = userPermissions?.canManagePackages || false;

  console.log("Permissions:", { canViewPackages, canManagePackages, userPermissions });

  const {
    mutate: deletePackage,
    isPending: isDeletingPackage,
  } = useMutation(
    t.packages.deletePackage.mutationOptions({
      onSuccess: () => {
        console.log("Package deleted successfully");
        toast.success("Package deleted successfully");
        // Invalidate packages queries using TRPC's type-safe queryKey
        queryClient.invalidateQueries({
          queryKey: t.packages.getPackages.queryKey({ organizationId: id as string }),
        });
        setDeletingPackage(null);
      },
      onError: (error) => {
        console.error("Delete package error:", error);
        toast.error(error.message || "Failed to delete package");
        setDeletingPackage(null);
      },
    })
  );

  const [deletingPackage, setDeletingPackage] = React.useState<PackageTableRow | null>(null);

  const handleDeletePackage = (pkg: PackageTableRow) => {
    console.log("Delete package clicked:", pkg);
    setDeletingPackage(pkg);
  };

  const handleEditPackage = (pkg: PackageTableRow) => {
    router.push(`/isp/${id}/packages/${pkg.id}/edit`);
  };

  const columns = packageColumns({
    onEditPackage: handleEditPackage,
    onDeletePackage: handleDeletePackage,
    canManagePackages,
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
      {!canViewPackages ? (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view packages in this organization."
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
          </>
        ) : (
          <>
            <StatCard
              title="Total Packages"
              value={totalPackages.toString()}
              icon={<Package className="h-5 w-5" />}
              color="blue"
              isClickable={false}
            />
                         <StatCard
               title="PPPoE Packages"
               value={pppoePackages.toString()}
               icon={<Wifi className="h-5 w-5" />}
               color="blue"
               isClickable={false}
             />
             <StatCard
               title="Hotspot Packages"
               value={hotspotPackages.toString()}
               icon={<Globe className="h-5 w-5" />}
               color="green"
               isClickable={false}
             />
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Package className="h-5 w-5" /> Packages
        </h3>
        {userPermissions?.canManagePackages && !permissionsLoading && (
          <Link href={`/isp/${id}/packages/new`}>
            <Button variant="gradient" >
              <Plus className="h-5 w-5" /> Add Package
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
          data={packages?.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            duration: p.duration,
            durationType: p.durationType,
            type: p.type,
            downloadSpeed: p.downloadSpeed,
            uploadSpeed: p.uploadSpeed,
            isActive: p.isActive,
            customerCount: p.customerCount,
            createdAt: p.createdAt instanceof Date ? p.createdAt : new Date(p.createdAt),
          })) ?? []}
          filterPlaceholder="Search packages..."
          onRowSelectionChange={setSelectedPackages}
        />
      )}
        </>
      )}

      {/* Delete Package Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingPackage}
        onClose={() => setDeletingPackage(null)}
        onConfirm={() => {
          console.log("Delete confirmation clicked:", deletingPackage);
          if (deletingPackage) {
            if (deletingPackage.customerCount > 0) {
              toast.error("Cannot delete package with active customers. Please reassign or remove customers first.");
              setDeletingPackage(null);
              return;
            }
            console.log("Calling deletePackage with:", { id: deletingPackage.id, organizationId: id as string });
            deletePackage({
              id: deletingPackage.id,
              organizationId: id as string,
            });
          }
        }}
        title="Delete Package"
        description={`Are you sure you want to delete the package "${deletingPackage?.name}"? This action cannot be undone.${
          deletingPackage?.customerCount && deletingPackage.customerCount > 0
            ? ` This package has ${deletingPackage.customerCount} customer(s) and cannot be deleted.`
            : ""
        }`}
        isLoading={isDeletingPackage}
        variant="destructive"
      />
    </div>
  );
};

export default PackagePage;

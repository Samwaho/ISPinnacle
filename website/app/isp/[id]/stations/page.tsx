"use client";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { stationColumns, StationTableRow } from "@/components/isp/station-columns";
import { Building2, Users, MapPin, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { AccessDenied } from "@/components/ui/access-denied";

const StationPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const t = useTRPC();
  const [selectedStations, setSelectedStations] = React.useState<StationTableRow[]>([]);
  const { data: stations, isPending } = useQuery(
    t.stations.getStations.queryOptions({ organizationId: id as string })
  );

  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  const totalStations = isPending ? 0 : stations?.length ?? 0;
  const totalCustomers = isPending ? 0 : stations?.reduce((sum, s) => sum + s.customerCount, 0) ?? 0;

  const queryClient = useQueryClient();

  // Check if user has permission to view stations
  const canViewStations = userPermissions?.canViewStations || false;
  const canManageStations = userPermissions?.canManageStations || false;

  const {
    mutate: deleteStation,
    isPending: isDeletingStation,
  } = useMutation(
    t.stations.deleteStation.mutationOptions({
      onSuccess: () => {
        toast.success("Station deleted successfully");
        // Invalidate stations queries using TRPC's type-safe queryKey
        queryClient.invalidateQueries({
          queryKey: t.stations.getStations.queryKey({ organizationId: id as string }),
        });
        setDeletingStation(null);
      },
      onError: (error) => {
        console.error("Delete station error:", error);
        toast.error(error.message || "Failed to delete station");
        setDeletingStation(null);
      },
    })
  );

  const [deletingStation, setDeletingStation] = React.useState<StationTableRow | null>(null);

  const handleDeleteStation = (station: StationTableRow) => {
    setDeletingStation(station);
  };

  const handleEditStation = (station: StationTableRow) => {
    router.push(`/isp/${id}/stations/${station.id}/edit`);
  };

  const columns = stationColumns({
    onEditStation: handleEditStation,
    onDeleteStation: handleDeleteStation,
    canManageStations,
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
      {!canViewStations ? (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to view stations in this organization."
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
          </>
        ) : (
          <>
            <StatCard
              title="Total Stations"
              value={totalStations.toString()}
              icon={<Building2 className="h-5 w-5" />}
              color="purple"
              isClickable={false}
            />
            <StatCard
              title="Total Customers"
              value={totalCustomers.toString()}
              icon={<Users className="h-5 w-5" />}
              color="green"
              isClickable={false}
            />
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Stations
        </h3>
        {userPermissions?.canManageStations && !permissionsLoading && (
          <Link href={`/isp/${id}/stations/new`}>
            <Button variant="gradient" >
              <Plus className="h-5 w-5" /> Add Station
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
          data={stations?.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            location: s.location,
            type: s.type,
            customerCount: s.customerCount,
            createdAt: s.createdAt instanceof Date ? s.createdAt : new Date(s.createdAt),
          })) ?? []}
          filterPlaceholder="Search stations..."
          onRowSelectionChange={setSelectedStations}
        />
      )}
        </>
      )}

      {/* Delete Station Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingStation}
        onClose={() => setDeletingStation(null)}
        onConfirm={() => {
          console.log("Delete confirmation clicked:", deletingStation);
          if (deletingStation) {
            if (deletingStation.customerCount > 0) {
              toast.error("Cannot delete station with active customers. Please reassign or remove customers first.");
              setDeletingStation(null);
              return;
            }
            console.log("Calling deleteStation with:", { id: deletingStation.id, organizationId: id as string });
            deleteStation({
              id: deletingStation.id,
              organizationId: id as string,
            });
          }
        }}
        title="Delete Station"
        description={`Are you sure you want to delete the station "${deletingStation?.name}"? This action cannot be undone.${
          deletingStation?.customerCount && deletingStation.customerCount > 0
            ? ` This station has ${deletingStation.customerCount} customer(s) and cannot be deleted.`
            : ""
        }`}
        isLoading={isDeletingStation}
        variant="destructive"
      />
    </div>
  );
};

export default StationPage;
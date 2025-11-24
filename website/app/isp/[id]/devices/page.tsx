"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccessDenied } from "@/components/ui/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { DataTable } from "@/components/table/DataTable";
import { createDeviceColumns, type DeviceTableRow } from "@/components/isp/devices/device-columns";
import Link from "next/link";
import { Router, RefreshCw, ShieldCheck, Plus, AlertTriangle, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { OrganizationDeviceStatus } from "@/lib/generated/prisma";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DevicesPage = () => {
  const params = useParams<{ id: string }>();
  const organizationId = params.id as string;
  const router = useRouter();
  const t = useTRPC();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );
  const canViewDevices = permissions?.canViewDevices ?? false;
  const canManageDevices = permissions?.canManageDevices ?? false;

  const devicesQuery = t.devices.list.queryOptions({ organizationId });
  const {
    data: devices = [],
    isPending: devicesPending,
    refetch: refetchDevices,
  } = useQuery({
    ...devicesQuery,
    enabled: canViewDevices,
  });
  const setupDeviceId = searchParams?.get("setupDeviceId") ?? undefined;
  const pendingSetupDevices = React.useMemo(
    () => devices.filter((device) => !device.wireguardPublicKey),
    [devices]
  );
  const highlightedPendingDevice = React.useMemo(() => {
    if (pendingSetupDevices.length === 0) {
      return null;
    }
    if (setupDeviceId) {
      return pendingSetupDevices.find((device) => device.id === setupDeviceId) ?? pendingSetupDevices[0];
    }
    return pendingSetupDevices[0];
  }, [pendingSetupDevices, setupDeviceId]);

  const [syncingDeviceId, setSyncingDeviceId] = React.useState<string | null>(null);
  const { mutate: syncDevice } = useMutation(
    t.devices.fetchStatus.mutationOptions({
      onSuccess: (_, variables) => {
        toast.success("Device synced successfully");
        queryClient.invalidateQueries({
          queryKey: t.devices.list.queryKey({ organizationId }),
        });
        queryClient.invalidateQueries({
          queryKey: t.devices.get.queryKey({ id: variables.id, organizationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Unable to reach the device");
      },
      onSettled: () => setSyncingDeviceId(null),
    })
  );

  const handleSyncDevice = React.useCallback(
    (deviceId: string) => {
      setSyncingDeviceId(deviceId);
      syncDevice({ id: deviceId, organizationId });
    },
    [organizationId, syncDevice]
  );
  const { mutateAsync: pollDeviceStatus } = useMutation(
    t.devices.fetchStatus.mutationOptions({
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: t.devices.list.queryKey({ organizationId }),
        });
        queryClient.invalidateQueries({
          queryKey: t.devices.get.queryKey({ id: variables.id, organizationId }),
        });
      },
      onError: (error, variables) => {
        queryClient.setQueriesData<DeviceTableRow[]>(
          { queryKey: t.devices.list.queryKey({ organizationId }) },
          (current) =>
            current?.map((d) =>
              d.id === variables.id
                ? {
                    ...d,
                    status: OrganizationDeviceStatus.OFFLINE,
                    lastSyncAt: new Date().toISOString(),
                  }
                : d
            ) ?? current
        );
        queryClient.setQueryData(
          t.devices.get.queryKey({ id: variables.id, organizationId }),
          (current: DeviceTableRow | undefined) =>
            current
              ? {
                  ...current,
                  status: OrganizationDeviceStatus.OFFLINE,
                  lastSyncAt: new Date().toISOString(),
                }
              : current
        );
      },
    })
  );
  const pollingRef = React.useRef(false);
  React.useEffect(() => {
    if (!canViewDevices || devices.length === 0) return;

    const intervalMs = 45000;
    const runPoll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      const staleThreshold = Date.now() - 5 * 60 * 1000;
      const candidates = devices
        .filter((d) => {
          if (d.status === OrganizationDeviceStatus.ONLINE) {
            return !d.lastSyncAt || new Date(d.lastSyncAt as string | Date).getTime() < staleThreshold;
          }
          return true;
        })
        .slice(0, 3);
      for (const device of candidates) {
        try {
          await pollDeviceStatus({ id: device.id, organizationId });
        } catch {
          // ignore per-device errors in background poll
        }
      }
      pollingRef.current = false;
    };

    const id = setInterval(runPoll, intervalMs);
    runPoll();
    return () => {
      clearInterval(id);
      pollingRef.current = false;
    };
  }, [canViewDevices, devices, organizationId, pollDeviceStatus]);

  const [deviceToDelete, setDeviceToDelete] = React.useState<DeviceTableRow | null>(null);
  const { mutate: deleteDevice, isPending: isDeleting } = useMutation(
    t.devices.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Device deleted successfully");
        queryClient.invalidateQueries({ queryKey: t.devices.list.queryKey({ organizationId }) });
        setDeviceToDelete(null);
      },
      onError: (error) => toast.error(error.message || "Failed to delete device"),
    })
  );

  const handleDeleteDevice = React.useCallback((device: DeviceTableRow) => {
    setDeviceToDelete(device);
  }, []);

  const confirmDelete = React.useCallback(() => {
    if (!deviceToDelete) return;
    deleteDevice({ id: deviceToDelete.id, organizationId });
  }, [deleteDevice, deviceToDelete, organizationId]);

  const deviceStats = React.useMemo(() => {
    const totals = devices.reduce(
      (acc, device) => {
        switch (device.status) {
          case OrganizationDeviceStatus.ONLINE:
            acc.online += 1;
            break;
          case OrganizationDeviceStatus.OFFLINE:
            acc.offline += 1;
            break;
          case OrganizationDeviceStatus.MAINTENANCE:
            acc.maintenance += 1;
            break;
          default:
            acc.unknown += 1;
        }
        if (device.lastSyncAt) {
          const ts = new Date(device.lastSyncAt as string | Date).getTime();
          acc.lastSync = Math.max(acc.lastSync ?? 0, ts);
        }
        return acc;
      },
      { total: devices.length, online: 0, offline: 0, maintenance: 0, unknown: 0, lastSync: undefined as number | undefined }
    );
    return totals;
  }, [devices]);

  const lastSyncLabel = deviceStats.lastSync
    ? formatDistanceToNow(deviceStats.lastSync, { addSuffix: true })
    : "No sync recorded";

  const columns = React.useMemo(
    () =>
      createDeviceColumns({
        organizationId,
        canManage: canManageDevices,
        onSync: handleSyncDevice,
        syncingDeviceId,
        onDelete: canManageDevices ? handleDeleteDevice : undefined,
      }),
    [organizationId, canManageDevices, handleSyncDevice, syncingDeviceId, handleDeleteDevice]
  );

  if (permissionsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canViewDevices) {
    return (
      <AccessDenied
        title="Insufficient permissions"
        message="You do not have access to view devices for this organization."
        backButtonLabel="Back to dashboard"
        backButtonLink={`/isp/${organizationId}`}
        showBackButton
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 my-8">
      <div className="flex flex-col gap-2">
        <Button variant="link" className="w-fit px-0" onClick={() => router.push(`/isp/${organizationId}`)}>
          Back to dashboard
        </Button>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Router className="h-6 w-6 text-primary" />
              Network Devices
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage MikroTik routers, automatically provision VPN IPs, and monitor health from a single place.
            </p>
          </div>
        </div>
      </div>

      {canManageDevices && highlightedPendingDevice && (
        <Alert className="border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-50">
          <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
          <div>
            <AlertTitle>Finish WireGuard setup</AlertTitle>
            <AlertDescription className="text-amber-900/80 dark:text-amber-100/90">
              <p>
                <span className="font-semibold">{highlightedPendingDevice.name}</span> still needs to share its WireGuard
                public key so we can register it on the central VPN.
              </p>
              {pendingSetupDevices.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {pendingSetupDevices.length - 1} other device
                  {pendingSetupDevices.length - 1 === 1 ? " is" : "s are"} waiting too.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  size="sm"
                  className="flex items-center gap-2"
                  asChild
                >
                  <Link href={`/isp/${organizationId}/devices/${highlightedPendingDevice.id}/setup`}>
                    <Wrench className="h-4 w-4" />
                    Open setup guide
                  </Link>
                </Button>
                {pendingSetupDevices.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const currentIndex = pendingSetupDevices.findIndex(
                        (device) => device.id === highlightedPendingDevice.id
                      );
                      const nextDevice = pendingSetupDevices[(currentIndex + 1) % pendingSetupDevices.length];
                      router.push(`/isp/${organizationId}/devices?setupDeviceId=${nextDevice.id}`);
                    }}
                  >
                    Next pending device
                  </Button>
                )}
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Devices"
          value={deviceStats.total.toString()}
          icon={<ShieldCheck className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Online / Offline"
          value={`${deviceStats.online} / ${deviceStats.offline}`}
          icon={<Router className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Last Sync"
          value={lastSyncLabel}
          icon={<RefreshCw className="h-5 w-5" />}
          color="purple"
        />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2">
            <CardTitle className="flex items-center gap-2">
              <Router className="h-5 w-5 text-primary" />
              Registered Devices
            </CardTitle>
            <CardDescription>All MikroTik routers linked to this organization</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchDevices()}
              disabled={devicesPending}
            >
              <RefreshCw className={`h-4 w-4 ${devicesPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canManageDevices && (
              <Button size="sm" variant="gradient" asChild>
                <Link href={`/isp/${organizationId}/devices/new`}>
                  <Plus className="h-4 w-4" />
                  Add Device
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {devicesPending ? (
            <Skeleton className="h-64 w-full" />
          ) : devices.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No devices found yet. {canManageDevices ? "Add your first router to begin monitoring." : ""}
            </div>
          ) : (
            <DataTable<DeviceTableRow, unknown>
              data={devices as DeviceTableRow[]}
              columns={columns}
              enableRowSelection={false}
              filterPlaceholder="Search by device name, IP, or host..."
            />
          )}
        </CardContent>
      </Card>

      {canManageDevices && (
        <DeleteConfirmationDialog
          isOpen={Boolean(deviceToDelete)}
          onClose={() => setDeviceToDelete(null)}
          onConfirm={confirmDelete}
          title={`Delete ${deviceToDelete?.name ?? "device"}?`}
          description="This will remove the router and revoke its VPN allocation."
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

export default DevicesPage;

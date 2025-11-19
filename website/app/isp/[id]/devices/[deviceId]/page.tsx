"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AccessDenied } from "@/components/ui/access-denied";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { DeviceSecretsDialog } from "@/components/isp/devices/device-secrets-dialog";
import { OrganizationDeviceStatus } from "@/lib/generated/prisma";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Pencil, RefreshCw, Router, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<OrganizationDeviceStatus, string> = {
  [OrganizationDeviceStatus.ONLINE]: "Online",
  [OrganizationDeviceStatus.OFFLINE]: "Offline",
  [OrganizationDeviceStatus.MAINTENANCE]: "Maintenance",
  [OrganizationDeviceStatus.UNKNOWN]: "Unknown",
};

const STATUS_STYLES: Record<OrganizationDeviceStatus, string> = {
  [OrganizationDeviceStatus.ONLINE]: "bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-500/20 dark:text-emerald-100",
  [OrganizationDeviceStatus.OFFLINE]: "bg-rose-100 text-rose-700 border-transparent dark:bg-rose-500/20 dark:text-rose-100",
  [OrganizationDeviceStatus.MAINTENANCE]: "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-500/20 dark:text-amber-100",
  [OrganizationDeviceStatus.UNKNOWN]: "bg-slate-100 text-slate-700 border-transparent dark:bg-slate-500/20 dark:text-slate-100",
};

const DeviceDetailPage = () => {
  const params = useParams<{ id: string; deviceId: string }>();
  const organizationId = params.id as string;
  const deviceId = params.deviceId as string;
  const router = useRouter();
  const t = useTRPC();

  const { data: permissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: organizationId })
  );
  const canView = permissions?.canViewDevices ?? false;
  const canManage = permissions?.canManageDevices ?? false;

  const deviceQuery = t.devices.get.queryOptions({ id: deviceId, organizationId });
  const {
    data: device,
    isPending: devicePending,
    refetch: refetchDevice,
  } = useQuery({
    ...deviceQuery,
    enabled: canView,
  });

  const { mutate: syncDevice, isPending: syncing } = useMutation(
    t.devices.fetchStatus.mutationOptions({
      onSuccess: () => {
        toast.success("Device synced successfully");
        refetchDevice();
      },
      onError: (error) => toast.error(error.message || "Failed to contact device"),
    })
  );

  const [showDelete, setShowDelete] = React.useState(false);
  const { mutate: deleteDevice, isPending: deleting } = useMutation(
    t.devices.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Device deleted");
        router.push(`/isp/${organizationId}/devices`);
      },
      onError: (error) => toast.error(error.message || "Failed to delete device"),
    })
  );

  if (permissionsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canView) {
    return (
      <AccessDenied
        title="Access restricted"
        message="You do not have permission to view router details."
        backButtonLabel="Back to devices"
        backButtonLink={`/isp/${organizationId}/devices`}
        showBackButton
      />
    );
  }

  if (devicePending) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device not found</CardTitle>
          <CardDescription>The device may have been deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push(`/isp/${organizationId}/devices`)}>
            Back to devices
          </Button>
        </CardContent>
      </Card>
    );
  }

  const lastSeen = device.lastSeenAt
    ? formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })
    : "Never seen";

  return (
    <div className="space-y-6">
      <Button
        variant="link"
        className="w-fit px-0"
        onClick={() => router.push(`/isp/${organizationId}/devices`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to devices
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Router className="h-6 w-6 text-primary" />
              {device.name}
            </CardTitle>
            <CardDescription>
              VPN IP {device.vpnIpAddress}/{device.vpnCidr} · RouterOS {device.routerOsHost}:{device.routerOsPort}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={STATUS_STYLES[device.status]}>
              {STATUS_LABELS[device.status]}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => syncDevice({ id: device.id, organizationId })}
              disabled={syncing}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              Sync
            </Button>
            {canManage && (
              <DeviceSecretsDialog organizationId={organizationId} deviceId={device.id} />
            )}
            {canManage && (
              <Button size="sm" variant="secondary" asChild>
                <Link href={`/isp/${organizationId}/devices/${device.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            {canManage && (
              <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">RouterOS Endpoint</p>
            <div className="rounded-lg border px-3 py-2 text-sm font-mono">
              {device.routerOsHost}:{device.routerOsPort}
            </div>
            <p className="text-xs text-muted-foreground">Username: {device.routerOsUsername}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">WireGuard</p>
            <div className="rounded-lg border px-3 py-2 text-sm font-mono truncate">
              {device.wireguardPublicKey ?? "Pending"}
            </div>
            <p className="text-xs text-muted-foreground">
              Listen Port: {device.wireguardListenPort ?? "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vendor / Model</p>
            <div className="rounded-lg border px-3 py-2 text-sm">
              {device.vendor || "—"} {device.model || ""}
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Seen</p>
            <div className="rounded-lg border px-3 py-2 text-sm">
              {lastSeen}
            </div>
          </div>
          {device.description && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Description</p>
              <div className="rounded-lg border px-3 py-2 text-sm">
                {device.description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <DeleteConfirmationDialog
          isOpen={showDelete}
          onClose={() => setShowDelete(false)}
          onConfirm={() => deleteDevice({ id: device.id, organizationId })}
          title="Delete device?"
          description="This will remove the router record and revoke its VPN allocation."
          isLoading={deleting}
        />
      )}
    </div>
  );
};

export default DeviceDetailPage;

"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeviceSecretsDialog } from "./device-secrets-dialog";
import { OrganizationDeviceStatus } from "@/lib/generated/prisma";
import { formatDistanceToNow } from "date-fns";
import { MoreHorizontal, Pencil, RefreshCw, Shield, Trash2, Wrench } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DeviceTableRow = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  vendor?: string | null;
  model?: string | null;
  deviceType: string;
  routerOsHost: string;
  routerOsPort: number;
  routerOsUsername: string;
  vpnIpAddress: string;
  vpnCidr: number;
  wireguardPublicKey?: string | null;
  wireguardPresharedKey?: string | null;
  wireguardListenPort?: number | null;
  status: OrganizationDeviceStatus;
  lastSeenAt?: Date | string | null;
  lastSyncAt?: Date | string | null;
};

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

type ColumnOptions = {
  organizationId: string;
  canManage: boolean;
  onSync: (deviceId: string) => void;
  syncingDeviceId: string | null;
  onDelete?: (device: DeviceTableRow) => void;
};

export const createDeviceColumns = ({
  organizationId,
  canManage,
  onSync,
  syncingDeviceId,
  onDelete,
}: ColumnOptions): ColumnDef<DeviceTableRow, unknown>[] => {
  const columns: ColumnDef<DeviceTableRow>[] = [
    {
      header: "Device",
      accessorKey: "name",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <div>
            <Link
              href={`/isp/${organizationId}/devices/${device.id}`}
              className="font-semibold text-primary hover:underline"
            >
              {device.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {device.vendor || "Device"} {device.model || ""} · {device.vpnIpAddress}/{device.vpnCidr}
            </p>
          </div>
        );
      },
    },
    {
      header: "RouterOS Endpoint",
      accessorKey: "routerOsHost",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <div>
            <p className="font-mono text-sm">
              {device.routerOsHost}:{device.routerOsPort}
            </p>
            <p className="text-xs text-muted-foreground">User: {device.routerOsUsername}</p>
          </div>
        );
      },
    },
    {
      header: "WireGuard",
      accessorKey: "wireguardPublicKey",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <div>
            <p className="font-mono text-xs truncate max-w-[260px]">
              {device.wireguardPublicKey ?? "Pending"}
            </p>
            <p className="text-xs text-muted-foreground">
              Listen {device.wireguardListenPort ?? "\u2014"}
            </p>
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const device = row.original;
        return (
          <div className="flex flex-col gap-1">
            <Badge className={STATUS_STYLES[device.status]}>
              {STATUS_LABELS[device.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {device.lastSeenAt
                ? `Seen ${formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })}`
                : "Never synced"}
            </span>
          </div>
        );
      },
    },
  ];

  if (canManage) {
    columns.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const device = row.original;
        const syncing = syncingDeviceId === device.id;
        return (
          <DeviceActionsCell
            device={device}
            organizationId={organizationId}
            syncing={syncing}
            onSync={onSync}
            onDelete={onDelete}
          />
        );
      },
      enableSorting: false,
      enableHiding: false,
    });
  }

  return columns;
};

const DeviceActionsCell = ({
  device,
  organizationId,
  syncing,
  onSync,
  onDelete,
}: {
  device: DeviceTableRow;
  organizationId: string;
  syncing: boolean;
  onSync: (deviceId: string) => void;
  onDelete?: (device: DeviceTableRow) => void;
}) => {
  const [secretsOpen, setSecretsOpen] = React.useState(false);

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={() => onSync(device.id)} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync status"}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/isp/${organizationId}/devices/${device.id}/setup`}
              className="flex w-full items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Open setup guide
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSecretsOpen(true)}>
            <Shield className="h-4 w-4" />
            View credentials
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href={`/isp/${organizationId}/devices/${device.id}/edit`}
              className="flex w-full items-center gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit device
            </Link>
          </DropdownMenuItem>
          {onDelete ? (
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(device)}>
              <Trash2 className="h-4 w-4" />
              Delete device
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <DeviceSecretsDialog
        deviceId={device.id}
        organizationId={device.organizationId}
        open={secretsOpen}
        onOpenChange={setSecretsOpen}
        trigger={null}
      />
    </div>
  );
};

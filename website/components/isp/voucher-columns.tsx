"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { Button } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { Copy, MoreHorizontal, CheckCircle2, XCircle, Clock, CalendarClock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type VoucherTableRow = {
  id: string;
  voucherCode: string;
  packageName: string;
  phoneNumber: string;
  amount: number;
  status: "PENDING" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  expiresAt: Date | null;
  usedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
};

type AllowedStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";

export const voucherColumns = ({
  onUpdateStatus,
  canManage,
}: {
  onUpdateStatus?: (voucher: VoucherTableRow, status: AllowedStatus) => void;
  canManage: boolean;
}): ColumnDef<VoucherTableRow>[] => [
  {
    accessorKey: "voucherCode",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Code" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-semibold">{row.original.voucherCode}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => navigator.clipboard.writeText(row.original.voucherCode)}
          title="Copy code"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
  {
    accessorKey: "packageName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Package" />
    ),
    cell: ({ row }) => (
      <div className="text-sm">{row.original.packageName}</div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => row.original.phoneNumber,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">KES {row.original.amount.toFixed(2)}</div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: VariantProps<typeof badgeVariants>["variant"] = "secondary";
      if (status === "ACTIVE") variant = "default";
      else if (status === "USED") variant = "outline";
      else if (status === "EXPIRED" || status === "PENDING") variant = "secondary";
      else if (status === "CANCELLED") variant = "destructive";
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: "expiresAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expires" />
    ),
    cell: ({ row }) => (
      row.original.expiresAt ? new Date(row.original.expiresAt).toLocaleString() : "—"
    ),
  },
  {
    accessorKey: "lastUsedAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="First Use" />
    ),
    cell: ({ row }) => (
      row.original.lastUsedAt ? new Date(row.original.lastUsedAt).toLocaleString() : "—"
    ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      if (!canManage) return null;
      const v = row.original;
      const canActivate = v.status === "PENDING" || v.status === "CANCELLED";
      const canCancel = v.status === "PENDING" || v.status === "ACTIVE";
      const canExpire = v.status === "ACTIVE";
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled>
              <CalendarClock className="mr-2 h-4 w-4" />
              Created {v.createdAt.toLocaleDateString()}
            </DropdownMenuItem>
            {onUpdateStatus && (
              <DropdownMenuItem disabled={!canActivate} onClick={() => onUpdateStatus(v, "ACTIVE")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Activate
              </DropdownMenuItem>
            )}
            {onUpdateStatus && (
              <DropdownMenuItem disabled={!canCancel} onClick={() => onUpdateStatus(v, "CANCELLED")}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </DropdownMenuItem>
            )}
            {onUpdateStatus && (
              <DropdownMenuItem disabled={!canExpire} onClick={() => onUpdateStatus(v, "EXPIRED")}>
                <Clock className="mr-2 h-4 w-4" />
                Mark Expired
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

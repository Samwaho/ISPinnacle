"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, User, Calendar, DollarSign, CreditCard } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export type TransactionTableRow = {
  id: string
  organizationId: string
  transactionType: "PAYBILL" | "BUYGOODS"
  transactionId: string
  billReferenceNumber?: string | null
  phoneNumber: string
  amount: number
  name?: string | null
  transactionDateTime: Date
  orgAccountBalance?: number | null
  invoiceNumber?: string | null
  paymentGateway?: "MPESA" | "KOPOKOPO" | "JENGA" | "OTHER" | null
  source?: "PPPOE" | "HOTSPOT" | "OTHER" | null
  createdAt: Date
  updatedAt: Date
}

export const transactionColumns = ({
  canManageTransactions,
}: {
  canManageTransactions: boolean;
}): ColumnDef<TransactionTableRow>[] => [
  {
    accessorKey: "transactionId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction ID" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-muted-foreground" />
        <div className="font-medium">{row.original.transactionId}</div>
      </div>
    ),
  },
  {
    accessorKey: "billReferenceNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bill Reference" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          {row.original.billReferenceNumber || "No reference"}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "transactionType",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Badge variant={row.original.transactionType === "PAYBILL" ? "default" : "secondary"}>
          {row.original.transactionType}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "paymentGateway",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Gateway" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Badge variant={row.original.paymentGateway === "KOPOKOPO" || row.original.paymentGateway === "JENGA" ? "secondary" : "default"}>
          {row.original.paymentGateway || "MPESA"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "source",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Source" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Badge variant={row.original.source === "HOTSPOT" ? "secondary" : "default"}>
          {row.original.source || "OTHER"}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "phoneNumber",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Phone" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <div className="space-y-1">
          <div className="font-medium">{row.original.phoneNumber}</div>
          {row.original.name && (
            <div className="text-sm text-muted-foreground">
              {row.original.name}
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          ${row.original.amount.toFixed(2)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "orgAccountBalance",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account Balance" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {row.original.orgAccountBalance ? `$${row.original.orgAccountBalance.toFixed(2)}` : "N/A"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "transactionDateTime",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Date" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {row.original.transactionDateTime.toLocaleDateString()}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(transaction.id)}
            >
              Copy transaction ID
            </DropdownMenuItem>
            {canManageTransactions && (
              <DropdownMenuItem
                onClick={() => {
                  // Handle view transaction details
                  console.log("View transaction:", transaction.id)
                }}
              >
                View details
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

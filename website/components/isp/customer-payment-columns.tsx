"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader"
import { Badge } from "@/components/ui/badge"
import { Package, Calendar, DollarSign } from "lucide-react"

export type CustomerPaymentTableRow = {
  id: string
  amount: number
  package?: {
    id: string
    name: string
    type: "PPPOE" | "HOTSPOT"
  } | null
  createdAt: Date
  updatedAt: Date
}

export const customerPaymentColumns = (): ColumnDef<CustomerPaymentTableRow>[] => [
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
    accessorKey: "package",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Package" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm">
          {row.original.package ? (
            <div className="flex items-center gap-1">
              <span>{row.original.package.name}</span>
              <Badge variant="outline" className="text-xs">
                {row.original.package.type}
              </Badge>
            </div>
          ) : (
            "No package"
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Date" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm">
          <div>{row.original.createdAt.toLocaleDateString()}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.createdAt.toLocaleTimeString()}
          </div>
        </div>
      </div>
    ),
  },
]

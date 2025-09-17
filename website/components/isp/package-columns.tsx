"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, Wifi, Globe } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type PackageTableRow = {
  id: string
  name: string
  description?: string | null
  price: number
  duration: number
  durationType: "MONTH" | "YEAR" | "WEEK" | "DAY" | "HOUR" | "MINUTE"
  type: "PPPOE" | "HOTSPOT"
  downloadSpeed: number
  uploadSpeed: number
  isActive: boolean
  customerCount: number
  createdAt: Date
}

export const packageColumns = ({
  onEditPackage,
  onDeletePackage,
  canManagePackages,
}: {
  onEditPackage?: (pkg: PackageTableRow) => void;
  onDeletePackage?: (pkg: PackageTableRow) => void;
  canManagePackages: boolean;
}): ColumnDef<PackageTableRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.type === "PPPOE" ? (
          <Wifi className="h-4 w-4 text-blue-500" />
        ) : (
          <Globe className="h-4 w-4 text-green-500" />
        )}
        <span className="uppercase text-xs px-2 py-1 rounded bg-muted">{row.original.type}</span>
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Price" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">${row.original.price.toFixed(2)}</div>
    ),
  },
  {
    accessorKey: "duration",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Duration" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span>{row.original.duration}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.durationType.toLowerCase()}
          {row.original.duration > 1 ? 's' : ''}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "speed",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Speed" />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.downloadSpeed} Mbps ↓</div>
        <div className="text-muted-foreground">{row.original.uploadSpeed} Mbps ↑</div>
      </div>
    ),
  },
  {
    accessorKey: "customerCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customers" />
    ),
    cell: ({ row }) => row.original.customerCount,
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => row.original.createdAt.toLocaleDateString(),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      if (!canManagePackages) return null;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditPackage && (
              <DropdownMenuItem onClick={() => onEditPackage(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDeletePackage && (
              <DropdownMenuItem 
                onClick={() => {
                  console.log("Delete menu item clicked:", row.original);
                  onDeletePackage(row.original);
                }}
                className={`${row.original.customerCount > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-red-600'}`}
                disabled={row.original.customerCount > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {row.original.customerCount > 0 && `(${row.original.customerCount} customers)`}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]

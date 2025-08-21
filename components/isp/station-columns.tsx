"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type StationTableRow = {
  id: string
  name: string
  description?: string | null
  location?: string | null
  type: "APARTMENT" | "HOUSE" | "OFFICE" | "OTHER"
  customerCount: number
  createdAt: Date
}

export const stationColumns = ({
  onEditStation,
  onDeleteStation,
  canManageStations,
}: {
  onEditStation?: (station: StationTableRow) => void;
  onDeleteStation?: (station: StationTableRow) => void;
  canManageStations: boolean;
}): ColumnDef<StationTableRow>[] => [
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
      <span className="uppercase text-xs px-2 py-1 rounded bg-muted">{row.original.type}</span>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Location" />
    ),
    cell: ({ row }) => row.original.location || "-",
  },
  {
    accessorKey: "customerCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Customers" />
    ),
    cell: ({ row }) => row.original.customerCount,
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
      if (!canManageStations) return null;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditStation && (
              <DropdownMenuItem onClick={() => onEditStation(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDeleteStation && (
              <DropdownMenuItem 
                onClick={() => {
                  if (row.original.customerCount === 0) {
                    onDeleteStation(row.original);
                  }
                }}
                className={`${row.original.customerCount > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-red-600'}`}
                aria-disabled={row.original.customerCount > 0}
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



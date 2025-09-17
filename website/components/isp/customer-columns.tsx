"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, User, MapPin, Package, Calendar, Phone, Mail, CreditCard } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type CustomerTableRow = {
  id: string
  name: string
  email?: string | null
  phone: string
  address?: string | null
  status: "ACTIVE" | "INACTIVE" | "EXPIRED"
  station?: {
    id: string
    name: string
  } | null
  package?: {
    id: string
    name: string
    type: "PPPOE" | "HOTSPOT"
  } | null
  paymentCount: number
  lastPayment?: {
    id: string
    amount: number
    date: Date
    isPaid: boolean
  } | null
  expiryDate?: Date | null
  createdAt: Date
}

export const customerColumns = ({
  onEditCustomer,
  onDeleteCustomer,
  onViewPayments,
  onCreatePaymentLink,
  canManageCustomers,
}: {
  onEditCustomer?: (customer: CustomerTableRow) => void;
  onDeleteCustomer?: (customer: CustomerTableRow) => void;
  onViewPayments?: (customer: CustomerTableRow) => void;
  onCreatePaymentLink?: (customer: CustomerTableRow) => void;
  canManageCustomers: boolean;
}): ColumnDef<CustomerTableRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <div className="font-medium">{row.original.name}</div>
      </div>
    ),
  },
  {
    accessorKey: "contact",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        {row.original.email && (
          <div className="flex items-center gap-1 text-sm">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span>{row.original.email}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-sm">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span>{row.original.phone}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "station",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Station" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {row.original.station?.name || "Not assigned"}
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
            "Not assigned"
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = status === "ACTIVE" ? "default" : status === "INACTIVE" ? "secondary" : "destructive";
      const label = status === "ACTIVE" ? "Active" : status === "INACTIVE" ? "Inactive" : "Expired";
      
      return (
        <Badge variant={variant}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "expiryDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Expiry" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-1 text-sm">
        <Calendar className="h-3 w-3 text-muted-foreground" />
        <span>
          {row.original.expiryDate 
            ? row.original.expiryDate.toLocaleDateString()
            : "No expiry"
          }
        </span>
      </div>
    ),
  },
  {
    accessorKey: "paymentCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payments" />
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.paymentCount}</div>
        {row.original.lastPayment && row.original.lastPayment.date && (
          <div className="text-xs text-muted-foreground">
            Last: {row.original.lastPayment.date.toLocaleDateString()}
          </div>
        )}
      </div>
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
      if (!canManageCustomers) return null;
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onViewPayments && (
              <DropdownMenuItem onClick={() => onViewPayments(row.original)}>
                <CreditCard className="mr-2 h-4 w-4" />
                View Payments
              </DropdownMenuItem>
            )}
            {onCreatePaymentLink && (
              <DropdownMenuItem onClick={() => onCreatePaymentLink(row.original)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Create Payment Link
              </DropdownMenuItem>
            )}
            {onEditCustomer && (
              <DropdownMenuItem onClick={() => onEditCustomer(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDeleteCustomer && (
              <DropdownMenuItem 
                onClick={() => {
                  console.log("Delete menu item clicked:", row.original);
                  onDeleteCustomer(row.original);
                }}
                className={`${row.original.paymentCount > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-red-600'}`}
                disabled={row.original.paymentCount > 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {row.original.paymentCount > 0 && `(${row.original.paymentCount} payments)`}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]

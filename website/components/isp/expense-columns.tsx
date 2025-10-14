"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Trash2, Calendar, DollarSign, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type ExpenseTableRow = {
  id: string
  name: string
  description?: string | null
  amount: number
  date: Date
  isRecurring: boolean
  recurringInterval?: number | null
  recurringIntervalType?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null
  recurringStartDate?: Date | null
  recurringEndDate?: Date | null
  isPaid: boolean
  paidAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export const expenseColumns = ({
  onEditExpense,
  onDeleteExpense,
  onMarkAsPaid,
  canManageExpenses,
}: {
  onEditExpense?: (expense: ExpenseTableRow) => void;
  onDeleteExpense?: (expense: ExpenseTableRow) => void;
  onMarkAsPaid?: (expense: ExpenseTableRow) => void;
  canManageExpenses?: boolean;
}): ColumnDef<ExpenseTableRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const expense = row.original
      return (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{expense.name}</div>
            {expense.description && (
              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                {expense.description}
              </div>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number
      return (
        <div className="font-medium">
          KES {amount.toLocaleString()}
        </div>
      )
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("date") as Date
      return (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{date.toLocaleDateString()}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "isRecurring",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => {
      const isRecurring = row.getValue("isRecurring") as boolean
      const expense = row.original
      
      if (isRecurring) {
        const interval = expense.recurringInterval
        const type = expense.recurringIntervalType
        return (
          <div className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-blue-500" />
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
              Recurring
            </Badge>
            {interval && type && (
              <span className="text-xs text-muted-foreground">
                Every {interval} {type.toLowerCase()}
              </span>
            )}
          </div>
        )
      }
      
      return (
        <Badge variant="outline">
          One-time
        </Badge>
      )
    },
  },
  {
    accessorKey: "isPaid",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const isPaid = row.getValue("isPaid") as boolean
      const expense = row.original
      
      if (isPaid) {
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <Badge variant="default" className="bg-green-50 text-green-700 border-green-200">
              Paid
            </Badge>
            {expense.paidAt && (
              <span className="text-xs text-muted-foreground">
                {expense.paidAt.toLocaleDateString()}
              </span>
            )}
          </div>
        )
      }
      
      return (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-500" />
          <Badge variant="destructive" className="bg-red-50 text-red-700 border-red-200">
            Unpaid
          </Badge>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const expense = row.original
      
      if (!canManageExpenses) {
        return null
      }

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEditExpense && (
              <DropdownMenuItem onClick={() => onEditExpense(expense)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {!expense.isPaid && onMarkAsPaid && (
              <DropdownMenuItem onClick={() => onMarkAsPaid(expense)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark as Paid
              </DropdownMenuItem>
            )}
            {onDeleteExpense && (
              <DropdownMenuItem 
                onClick={() => onDeleteExpense(expense)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

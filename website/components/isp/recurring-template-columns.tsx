"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RecurringTemplateRow = {
  id: string;
  name: string;
  description?: string | null;
  amount: number;
  interval: number;
  intervalType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: Date;
  nextRunDate: Date;
  endDate?: Date | null;
  autoMarkAsPaid: boolean;
  lastGeneratedAt?: Date | null;
  isActive: boolean;
  stats: {
    totalCount: number;
    totalAmount: number;
    unpaidCount: number;
    unpaidAmount: number;
    paidCount: number;
  };
  recentExpenses: Array<{
    id: string;
    date: Date;
    amount: number;
    isPaid: boolean;
  }>;
};

const formatIntervalLabel = (interval: number, intervalType: string) => {
  const friendly = intervalType.toLowerCase();
  if (interval === 1) {
    return `Every ${friendly.slice(0, friendly.length - (friendly.endsWith("ly") ? 2 : 0)) || friendly}`;
  }
  return `Every ${interval} ${friendly}`;
};

export const recurringTemplateColumns = ({
  onEdit,
  onToggle,
  onDelete,
  onProcess,
}: {
  onEdit?: (template: RecurringTemplateRow) => void;
  onToggle?: (template: RecurringTemplateRow) => void;
  onDelete?: (template: RecurringTemplateRow) => void;
  onProcess?: (template: RecurringTemplateRow) => void;
}): ColumnDef<RecurringTemplateRow>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Template" />
    ),
    cell: ({ row }) => {
      const template = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{template.name}</span>
          {template.description && (
            <span className="text-sm text-muted-foreground truncate max-w-[240px]">
              {template.description}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      return <span className="font-medium">KES {amount.toLocaleString()}</span>;
    },
  },
  {
    accessorKey: "interval",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Schedule" />
    ),
    cell: ({ row }) => {
      const template = row.original;
      return (
        <div className="flex flex-col gap-1 text-sm">
          <span>{formatIntervalLabel(template.interval, template.intervalType)}</span>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Starts {template.startDate.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Next {template.nextRunDate.toLocaleDateString()}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "stats",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Performance" />
    ),
    cell: ({ row }) => {
      const stats = row.original.stats;
      return (
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>{stats.paidCount} paid</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5 text-amber-500" />
            <span>
              {stats.unpaidCount} pending ({stats.unpaidAmount.toLocaleString("en-US", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })} KES)
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCcw className="h-3.5 w-3.5" />
            <span>{stats.totalCount} generated</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const template = row.original;
      const now = new Date();
      const overdue = template.isActive && template.nextRunDate < now;

      return (
        <div className="flex flex-col gap-1">
          <Badge
            variant={template.isActive ? "secondary" : "outline"}
            className={
              template.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }
          >
            {template.isActive ? "Active" : "Paused"}
          </Badge>
          {overdue && (
            <Badge variant="destructive" className="w-fit">
              Run overdue
            </Badge>
          )}
          {template.autoMarkAsPaid && (
            <Badge variant="secondary" className="w-fit">
              Auto-mark as paid
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const template = row.original;

      if (!onEdit && !onToggle && !onDelete && !onProcess) {
        return null;
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
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit template
              </DropdownMenuItem>
            )}
            {onProcess && (
              <DropdownMenuItem onClick={() => onProcess(template)}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Generate now
              </DropdownMenuItem>
            )}
            {onToggle && (
              <DropdownMenuItem onClick={() => onToggle(template)}>
                {template.isActive ? (
                  <>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Pause schedule
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Activate schedule
                  </>
                )}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(template)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete template
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

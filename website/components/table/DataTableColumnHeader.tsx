import { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className, "text-fuchsia-500 font-bold text-sm sm:text-base")}>{title}</div>
  }

  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 text-fuchsia-500 font-bold text-sm sm:text-base", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="data-[state=open]:bg-accent -ml-3 h-8 px-2 sm:px-3"
          >
            <span className="truncate">{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <ChevronsUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[140px] sm:w-[160px]">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

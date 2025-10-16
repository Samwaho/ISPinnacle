"use client"

import { ColumnDef } from "@tanstack/react-table"
import { roleSchema } from "@/schemas"
import z from "zod"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Button } from "../ui/button"
import { MoreHorizontal, Users, Shield, Edit, Trash2 } from "lucide-react"
import { DataTableColumnHeader } from "../table/DataTableColumnHeader"
import { Badge } from "../ui/badge"

interface RoleColumnsProps {
  onEditRole: (role: z.infer<typeof roleSchema> & { id: string; isDefault?: boolean }) => void;
  onDeleteRole: (role: z.infer<typeof roleSchema> & { id: string; isDefault?: boolean; memberCount?: number }) => void;
  canManageRoles?: boolean;
}

export const roleColumns = ({ onEditRole, onDeleteRole, canManageRoles = false }: RoleColumnsProps): ColumnDef<z.infer<typeof roleSchema> & { id: string; isDefault?: boolean }>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role Name" />
    ),
         cell: ({ row }) => {
       const role = row.original
       return (
         <div className="flex items-center gap-2">
           <Shield className="h-4 w-4 text-muted-foreground" />
           <span className="font-medium">{role.name}</span>
           {role.isDefault && (
             <Badge variant="secondary" className="text-xs">
               Default
             </Badge>
           )}
         </div>
       )
     },
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => {
      const description = row.getValue("description") as string
      return (
        <div className="max-w-[300px] truncate">
          {description || "No description"}
        </div>
      )
    },
  },
  {
    accessorKey: "memberCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Members" />
    ),
    cell: ({ row }) => {
      const memberCount = row.getValue("memberCount") as number
      return (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{memberCount || 0}</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const role = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
                     <DropdownMenuContent align="end">
             <DropdownMenuLabel>Actions</DropdownMenuLabel>
             {canManageRoles && (
               <DropdownMenuItem onClick={() => onEditRole(role)}>
                 <Edit className="mr-2 h-4 w-4" />
                 Edit role
               </DropdownMenuItem>
             )}
             {canManageRoles && !role.isDefault && (
               <DropdownMenuItem 
                 onClick={() => onDeleteRole(role)}
                 className="text-destructive"
               >
                 <Trash2 className="mr-2 h-4 w-4" />
                 Delete role
               </DropdownMenuItem>
             )}
             {canManageRoles && role.isDefault && (
               <DropdownMenuItem disabled className="text-muted-foreground">
                 <Shield className="mr-2 h-4 w-4" />
                 Default role (cannot be deleted)
               </DropdownMenuItem>
             )}
           </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

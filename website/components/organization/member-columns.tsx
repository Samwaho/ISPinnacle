"use client"

import { ColumnDef } from "@tanstack/react-table"
import { memberSchema } from "@/schemas"
import z from "zod"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "../ui/dropdown-menu"
import { Button } from "../ui/button"
import { MoreHorizontal, Edit, Trash2, User } from "lucide-react"
import { DataTableColumnHeader } from "../table/DataTableColumnHeader"

interface MemberColumnsProps {
  onEditMember: (member: z.infer<typeof memberSchema> & { id: string; userId: string }) => void;
  onDeleteMember: (member: z.infer<typeof memberSchema> & { id: string; userId: string; isOwner?: boolean }) => void;
  canManageMembers?: boolean;
}

export const columns = ({ onEditMember, onDeleteMember, canManageMembers = false }: MemberColumnsProps): ColumnDef<z.infer<typeof memberSchema> & { id: string; userId: string; isOwner?: boolean }>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ), 
    cell: ({ row }) => {
      const member = row.original
      return (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{member.name}</span>
          {member.isOwner && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
              Owner
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const member = row.original
 
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
            {canManageMembers && !member.isOwner && (
              <DropdownMenuItem onClick={() => onEditMember(member)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit member
              </DropdownMenuItem>
            )}
            {canManageMembers && !member.isOwner && (
              <DropdownMenuItem 
                onClick={() => onDeleteMember(member)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove member
              </DropdownMenuItem>
            )}
            {canManageMembers && member.isOwner && (
              <DropdownMenuItem disabled className="text-muted-foreground">
                <User className="mr-2 h-4 w-4" />
                Owner (cannot be edited)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
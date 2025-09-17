"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Mail, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface Invitation {
  id: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  expires: Date;
  role: {
    name: string;
  } | null;
}

interface InvitationColumnsProps {
  onResendInvitation: (invitationId: string) => void;
  onCancelInvitation: (invitationId: string) => void;
  canManageMembers: boolean;
}

export const invitationColumns = ({
  onResendInvitation,
  onCancelInvitation,
  canManageMembers,
}: InvitationColumnsProps): ColumnDef<Invitation>[] => [
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role;
      return (
        <div className="font-medium">
          {role?.name || "No Role"}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const getStatusBadge = (status: string) => {
        switch (status) {
          case "PENDING":
            return <Badge variant="secondary">Pending</Badge>;
          case "ACCEPTED":
            return <Badge variant="default">Accepted</Badge>;
          case "REJECTED":
            return <Badge variant="destructive">Rejected</Badge>;
          default:
            return <Badge variant="outline">{status}</Badge>;
        }
      };
      return getStatusBadge(status);
    },
  },
  {
    accessorKey: "expires",
    header: "Expires",
    cell: ({ row }) => {
      const date = new Date(row.getValue("expires"));
      const isExpired = date < new Date();
      return (
        <div className={`text-sm ${isExpired ? "text-red-500" : "text-muted-foreground"}`}>
          {isExpired ? "Expired" : formatDistanceToNow(date, { addSuffix: true })}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invitation = row.original;
      const isExpired = invitation.expires < new Date();
      const isPending = invitation.status === "PENDING";

      if (!canManageMembers || !isPending) {
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
            {!isExpired && (
              <DropdownMenuItem
                onClick={() => onResendInvitation(invitation.id)}
                className="cursor-pointer"
              >
                <Mail className="mr-2 h-4 w-4" />
                Resend
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => onCancelInvitation(invitation.id)}
              className="cursor-pointer text-red-600"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

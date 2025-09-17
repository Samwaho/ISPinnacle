"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export interface Activity {
  id: string;
  activity: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export const activityColumns: ColumnDef<Activity>[] = [
  {
    accessorKey: "user",
    header: "User",
    cell: ({ row }) => {
      const user = row.getValue("user") as Activity["user"];
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>
              {user.name?.charAt(0) || user.email.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-sm">
              {user.name || "Unknown User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "activity",
    header: "Activity",
    cell: ({ row }) => {
      const activity = row.getValue("activity") as string;
      return (
        <div className="w-80 max-w-80 max-h-24 overflow-y-auto">
          <p className="text-sm text-foreground break-words leading-relaxed">
            {activity}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Time",
    cell: ({ row }) => {
      const createdAt = row.getValue("createdAt") as Date;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
      );
    },
  },
];

"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, X } from "lucide-react";

interface MemberEditFormProps {
  member: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
    role?: {
      id: string;
      name: string;
    } | null;
  };
  organizationId: string;
  roles: {
    id: string;
    name: string;
    description?: string | null;
  }[];
  onCancel: () => void;
}

export const MemberEditForm = ({ member, organizationId, roles, onCancel }: MemberEditFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(
    member.role?.id || "no-role"
  );

  const { mutate: updateMemberRole, isPending } = useMutation(
    t.organization.updateMemberRole.mutationOptions({
      onSuccess: () => {
        toast.success("Member role updated successfully");
        queryClient.invalidateQueries({
          queryKey: ["organization", "getOrganizationMembers", { id: organizationId }],
        });
        onCancel();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update member role");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMemberRole({
      memberId: member.id,
      organizationId,
      roleId: selectedRoleId === "no-role" ? undefined : selectedRoleId,
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Edit Member Role</CardTitle>
            <CardDescription>
              Update role for {member.user.name || member.user.email}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Member</Label>
            <div className="p-3 border rounded-md bg-muted">
              <p className="font-medium">{member.user.name || "No name"}</p>
              <p className="text-sm text-muted-foreground">{member.user.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-role">No Role</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedRoleId && selectedRoleId !== "no-role" && (
              <p className="text-sm text-muted-foreground">
                {roles.find((r) => r.id === selectedRoleId)?.description || "No description"}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? "Updating..." : "Update Role"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

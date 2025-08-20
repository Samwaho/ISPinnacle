"use client";
import { Edit, Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import FormError from "../FormError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { updateRoleSchema } from "@/schemas";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { toast } from "sonner";

interface RoleEditFormProps {
  role: {
    id: string;
    name: string;
    description?: string | null;
    permissions: OrganizationPermission[];
    memberCount?: number;
    isDefault?: boolean;
  };
  organizationId: string;
  onCancel: () => void;
}

const permissionLabels: Record<OrganizationPermission, string> = {
  [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]:
    "View Organization Details",
  [OrganizationPermission.MANAGE_ORGANIZATION_DETAILS]:
    "Manage Organization Details",
  [OrganizationPermission.MANAGE_MEMBERS]: "Manage Members",
  [OrganizationPermission.MANAGE_SETTINGS]: "Manage Settings",
  [OrganizationPermission.MANAGE_ROLES]: "Manage Roles",
};

export const RoleEditForm = ({
  role,
  organizationId,
  onCancel,
}: RoleEditFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  const {
    mutate: updateRole,
    isPending,
    error,
  } = useMutation(
    t.organization.updateRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated successfully");
        queryClient.invalidateQueries({
          queryKey: [
            "organization",
            "getOrganizationRoles",
            { id: organizationId },
          ],
        });
        onCancel();
      },
    })
  );

  const form = useForm<z.infer<typeof updateRoleSchema>>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      id: role.id,
      organizationId,
      name: role.name,
      description: role.description || "",
      permissions: role.permissions,
    },
  });

  const onSubmit = (data: z.infer<typeof updateRoleSchema>) => {
    updateRole(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Role: {role.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Moderator, Editor" 
                        disabled={role.isDefault}
                        className={role.isDefault ? "bg-muted" : ""}
                      />
                    </FormControl>
                    {role.isDefault && (
                      <p className="text-sm text-muted-foreground">
                        Default role names cannot be changed
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe what this role can do..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Permissions</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Select the permissions this role should have
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(permissionLabels).map(
                        ([permission, label]) => (
                          <FormField
                            key={permission}
                            control={form.control}
                            name="permissions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={permission}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value.includes(
                                        permission as OrganizationPermission
                                      )}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([
                                              ...field.value,
                                              permission as OrganizationPermission,
                                            ])
                                          : field.onChange(
                                              field.value.filter(
                                                (value) => value !== permission
                                              )
                                            );
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-sm font-normal">
                                      {label}
                                    </FormLabel>
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                        )
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormError message={error?.message ?? ""} />
            <div className="flex gap-2">
              <Button type="submit" variant="gradient" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Role"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

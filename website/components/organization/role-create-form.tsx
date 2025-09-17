"use client";
import { Plus, Loader2 } from "lucide-react";
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
import { createRoleSchema } from "@/schemas";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { toast } from "sonner";

interface RoleCreateFormProps {
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
  [OrganizationPermission.VIEW_STATIONS]: "View Stations",
  [OrganizationPermission.MANAGE_STATIONS]: "Manage Stations",
  [OrganizationPermission.VIEW_PACKAGES]: "View Packages",
  [OrganizationPermission.MANAGE_PACKAGES]: "Manage Packages",
  [OrganizationPermission.VIEW_CUSTOMERS]: "View Customers",
  [OrganizationPermission.MANAGE_CUSTOMERS]: "Manage Customers",
  [OrganizationPermission.VIEW_EXPENSES]: "View Expenses",
  [OrganizationPermission.MANAGE_EXPENSES]: "Manage Expenses",
};

export const RoleCreateForm = ({
  organizationId,
  onCancel,
}: RoleCreateFormProps) => {
  const t = useTRPC();
  const queryClient = useQueryClient();
  const {
    mutate: createRole,
    isPending,
    error,
  } = useMutation(
    t.organization.createRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role created successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationRoles.queryKey({ id: organizationId }),
        });
        onCancel();
      },
    })
  );

  const form = useForm<z.infer<typeof createRoleSchema>>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      organizationId,
      name: "",
      description: "",
      permissions: [] as OrganizationPermission[],
    },
  });

  const onSubmit = (data: z.infer<typeof createRoleSchema>) => {
    createRole(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Role
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
                      <Input {...field} placeholder="e.g., Moderator, Editor" />
                    </FormControl>
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
                    )}</div>
                    
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
                    Creating...
                  </>
                ) : (
                  "Create Role"
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

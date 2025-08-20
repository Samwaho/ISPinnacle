"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { UserIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { columns } from "@/components/organization/member-columns";
import { roleColumns } from "@/components/organization/role-columns";
import { invitationColumns } from "@/components/organization/invitation-columns";
import { DataTable } from "@/components/table/DataTable";
import { FaShieldHalved } from "react-icons/fa6";
import { OrganizationDetails } from "@/components/organization/organization-details";
import { RoleCreateForm } from "@/components/organization/role-create-form";
import { RoleEditForm } from "@/components/organization/role-edit-form";
import { InvitationForm } from "@/components/organization/invitation-form";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const t = useTRPC();
  const queryClient = useQueryClient();
  const { data: organization } = useQuery(
    t.organization.getOrganizationById.queryOptions({ id: id as string },)
  );
  const { data: members } = useQuery(
    t.organization.getOrganizationMembers.queryOptions({ id: id as string })
  );
  const { data: roles } = useQuery(
    t.organization.getOrganizationRoles.queryOptions({ id: id as string })
  );
  const { data: invitations } = useQuery(
    t.organization.getOrganizationInvitations.queryOptions({ id: id as string })
  );
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  const {
    mutate: deleteRole,
    isPending: isDeletingRole,
  } = useMutation(
    t.organization.deleteRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role deleted successfully");
        queryClient.invalidateQueries({
          queryKey: ["organization", "getOrganizationRoles", { id: id as string }],
        });
        setDeletingRole(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete role");
      },
    })
  );

  const {
    mutate: resendInvitation,
    isPending: isResendingInvitation,
  } = useMutation(
    t.organization.resendInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation resent successfully");
        queryClient.invalidateQueries({
          queryKey: ["organization", "getOrganizationInvitations", { id: id as string }],
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to resend invitation");
      },
    })
  );

  const {
    mutate: cancelInvitation,
    isPending: isCancellingInvitation,
  } = useMutation(
    t.organization.cancelInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation cancelled successfully");
        queryClient.invalidateQueries({
          queryKey: ["organization", "getOrganizationInvitations", { id: id as string }],
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel invitation");
      },
    })
  );

  const [selectedMembers, setSelectedMembers] = React.useState<
    { name: string; email: string; role: string }[]
  >([]);
  const [selectedRoles, setSelectedRoles] = React.useState<
    {
      name: string;
      description?: string;
      permissions?: string[];
      memberCount?: number;
    }[]
  >([]);
  const [showCreateRoleForm, setShowCreateRoleForm] = React.useState(false);
  const [editingRole, setEditingRole] = React.useState<{
    id: string;
    name: string;
    description?: string | null;
    permissions: OrganizationPermission[];
    memberCount?: number;
    isDefault?: boolean;
  } | null>(null);
  const [deletingRole, setDeletingRole] = React.useState<{
    id: string;
    name: string;
    memberCount?: number;
    isDefault?: boolean;
  } | null>(null);
  const [showInvitationForm, setShowInvitationForm] = React.useState(false);

  const handleEditRole = (role: {
    id: string;
    name: string;
    description?: string | undefined;
    permissions?: OrganizationPermission[] | undefined;
    memberCount?: number | undefined;
    isDefault?: boolean;
  }) => {
    setEditingRole({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
      memberCount: role.memberCount,
      isDefault: role.isDefault,
    });
  };

  const handleDeleteRole = (role: {
    id: string;
    name: string;
    memberCount?: number | undefined;
    isDefault?: boolean;
  }) => {
    setDeletingRole({
      id: role.id,
      name: role.name,
      memberCount: role.memberCount,
      isDefault: role.isDefault,
    });
  };

  const handleResendInvitation = (invitationId: string) => {
    resendInvitation({ invitationId });
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInvitation({ invitationId });
  };

  return (
    <div className="flex flex-col gap-4 my-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-10 md:size-16">
            <AvatarImage src={organization?.logo ?? ""} />
            <AvatarFallback>{organization?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gradient-custom">
              {organization?.name}
            </h1>
            <p className="text-sm text-gray-500">{organization?.description}</p>
          </div>
        </div>
        <Button variant="gradient" className="w-full md:w-auto ">ISP Management</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        <StatCard
          title="Total Members"
          value={members?.length?.toString() ?? "0"}
          icon={<UserIcon />}
          isClickable={true}
          trend={{ value: 10, isPositive: true }}
        />
        <StatCard
          title="Total Roles"
          value={roles?.length?.toString() ?? "0"}
          icon={<FaShieldHalved />}
          color="orange"
          isClickable={true}
          trend={{ value: 10, isPositive: true }}
        />
      </div>
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="members">
          <TabsList className="p-1 mb-4">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="members">
                      <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Organization Members</h3>
              {userPermissions?.canManageMembers && !permissionsLoading && (
                <Button 
                  variant="gradient" 
                  size="sm"
                  onClick={() => setShowInvitationForm(true)}
                >
                  Invite Member
                </Button>
              )}
            </div>
            <DataTable
              columns={columns}
              data={
                members?.map((member) => ({
                  name: member.user.name ?? "Unknown",
                  email: member.user.email,
                  role: member.role?.name ?? "No Role",
                })) ?? []
              }
              filterPlaceholder="Search members..."
              onRowSelectionChange={setSelectedMembers}
            />
          </TabsContent>
          <TabsContent value="invitations">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Pending Invitations</h3>
              {userPermissions?.canManageMembers && !permissionsLoading && (
                <Button 
                  variant="gradient" 
                  size="sm"
                  onClick={() => setShowInvitationForm(true)}
                >
                  Invite Member
                </Button>
              )}
            </div>
            <DataTable
              columns={invitationColumns({ 
                onResendInvitation: handleResendInvitation,
                onCancelInvitation: handleCancelInvitation,
                canManageMembers: userPermissions?.canManageMembers || false
              })}
              data={invitations ?? []}
              filterPlaceholder="Search invitations..."
            />
          </TabsContent>
          <TabsContent value="roles">
            {showCreateRoleForm ? (
              <RoleCreateForm
                organizationId={id as string}
                onCancel={() => setShowCreateRoleForm(false)}
              />
            ) : editingRole ? (
              <RoleEditForm
                role={editingRole}
                organizationId={id as string}
                onCancel={() => setEditingRole(null)}
              />
            ) : (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">Organization Roles</h3>
                  {userPermissions?.canManageRoles && !permissionsLoading && (
                    <Button 
                      variant="gradient" 
                      size="sm"
                      onClick={() => setShowCreateRoleForm(true)}
                    >
                      Create Role
                    </Button>
                  )}
                </div>
                <DataTable
                  columns={roleColumns({ 
                    onEditRole: handleEditRole,
                    onDeleteRole: handleDeleteRole,
                    canManageRoles: userPermissions?.canManageRoles || false
                  })}
                                     data={
                     roles?.map((role) => ({
                       id: role.id,
                       name: role.name,
                       description: role.description || undefined,
                       permissions: role.permissions,
                       memberCount: role.memberCount,
                       isDefault: role.isDefault,
                     })) ?? []
                   }
                  filterPlaceholder="Search roles..."
                  onRowSelectionChange={setSelectedRoles}
                />
              </>
            )}
          </TabsContent>
          <TabsContent value="details">
            {organization && !permissionsLoading && (
              <OrganizationDetails
                organization={organization}
                canEdit={userPermissions?.canEdit || false}
              />
            )}
                     </TabsContent>
         </Tabs>
       </div>
       
       {/* Delete Confirmation Dialog */}
       <DeleteConfirmationDialog
         isOpen={!!deletingRole}
         onClose={() => setDeletingRole(null)}
         onConfirm={() => {
           if (deletingRole) {
             deleteRole({
               id: deletingRole.id,
               organizationId: id as string,
             });
           }
         }}
         title="Delete Role"
         description={`Are you sure you want to delete the role "${deletingRole?.name}"? This action cannot be undone.${
           deletingRole?.memberCount && deletingRole.memberCount > 0
             ? ` This role has ${deletingRole.memberCount} member(s) and cannot be deleted.`
             : ""
         }`}
         isLoading={isDeletingRole}
         variant="destructive"
       />

       {/* Invitation Form */}
       <InvitationForm
         organizationId={id as string}
         roles={roles?.map((role) => ({
           id: role.id,
           name: role.name,
           description: role.description,
         })) ?? []}
         isOpen={showInvitationForm}
         onClose={() => setShowInvitationForm(false)}
       />
     </div>
   );
 };

export default OrganizationDetailPage;

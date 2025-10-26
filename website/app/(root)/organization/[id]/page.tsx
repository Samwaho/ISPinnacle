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
import { activityColumns } from "@/components/organization/activity-columns";
import { DataTable } from "@/components/table/DataTable";
import { FaShieldHalved } from "react-icons/fa6";
import { OrganizationDetails } from "@/components/organization/organization-details";
import { RoleCreateForm } from "@/components/organization/role-create-form";
import { RoleEditForm } from "@/components/organization/role-edit-form";
import { MemberEditForm } from "@/components/organization/member-edit-form";
import { InvitationForm } from "@/components/organization/invitation-form";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { PaymentGatewayConfig } from "@/components/organization/payment-gateway-config";
import { SMSConfiguration } from "@/components/organization/sms-configuration";
import { SmsTemplate } from "@/components/organization/sms-template";

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const t = useTRPC();
  const queryClient = useQueryClient();
  
  const { data: organization, isLoading: organizationLoading } = useQuery(
    t.organization.getOrganizationById.queryOptions({ id: id as string },)
  );
  const { data: members, isLoading: membersLoading } = useQuery(
    t.organization.getOrganizationMembers.queryOptions({ id: id as string })
  );
  const { data: roles, isLoading: rolesLoading } = useQuery(
    t.organization.getOrganizationRoles.queryOptions({ id: id as string })
  );
  const { data: invitations, isLoading: invitationsLoading } = useQuery(
    t.organization.getOrganizationInvitations.queryOptions({ id: id as string })
  );
  const { data: activities, isLoading: activitiesLoading } = useQuery(
    t.organization.getOrganizationActivities.queryOptions({ id: id as string })
  );
  const { data: userPermissions, isLoading: permissionsLoading } = useQuery(
    t.organization.getUserPermissions.queryOptions({ id: id as string })
  );

  // Check if any critical data is still loading
  // const isLoading = organizationLoading || permissionsLoading;

  const {
    mutate: deleteRole,
    isPending: isDeletingRole,
  } = useMutation(
    t.organization.deleteRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role deleted successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationRoles.queryKey({ id: id as string }),
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
    // isPending: isResendingInvitation,
  } = useMutation(
    t.organization.resendInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation resent successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationInvitations.queryKey({ id: id as string }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to resend invitation");
      },
    })
  );

  const {
    mutate: cancelInvitation,
    // isPending: isCancellingInvitation,
  } = useMutation(
    t.organization.cancelInvitation.mutationOptions({
      onSuccess: () => {
        toast.success("Invitation cancelled successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationInvitations.queryKey({ id: id as string }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel invitation");
      },
    })
  );

  const {
    mutate: removeMember,
    isPending: isRemovingMember,
  } = useMutation(
    t.organization.removeMember.mutationOptions({
      onSuccess: () => {
        toast.success("Member removed successfully");
        queryClient.invalidateQueries({
          queryKey: t.organization.getOrganizationMembers.queryKey({ id: id as string }),
        });
        setDeletingMember(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove member");
      },
    })
  );

  // const [selectedMembers, setSelectedMembers] = React.useState<
  //   { name: string; email: string; role: string }[]
  // >([]);
  // const [selectedRoles, setSelectedRoles] = React.useState<
  //   {
  //     name: string;
  //     description?: string;
  //     permissions?: string[];
  //     memberCount?: number;
  //   }[]
  // >([]);
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
  const [editingMember, setEditingMember] = React.useState<{
    id: string;
    user: {
      name: string | null;
      email: string;
    };
    role?: {
      id: string;
      name: string;
    } | null;
  } | null>(null);
  const [deletingMember, setDeletingMember] = React.useState<{
    id: string;
    name: string;
    email: string;
    isOwner?: boolean;
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

  const handleEditMember = (member: {
    id: string;
    name: string;
    email: string;
    role: string;
    userId: string;
  }) => {
    setEditingMember({
      id: member.id,
      user: {
        name: member.name,
        email: member.email,
      },
      role: member.role !== "No Role" ? { id: "", name: member.role } : null,
    });
  };

  const handleDeleteMember = (member: {
    id: string;
    name: string;
    email: string;
    role: string;
    userId: string;
    isOwner?: boolean;
  }) => {
    setDeletingMember({
      id: member.id,
      name: member.name,
      email: member.email,
      isOwner: member.isOwner,
    });
  };

  return (
    <div className="flex flex-col gap-4 my-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-10 md:size-16">
            <AvatarImage src={organization?.logo ?? ""} />
            <AvatarFallback>
              {organizationLoading ? (
                <Skeleton className="h-full w-full rounded-full" />
              ) : (
                organization?.name?.charAt(0)
              )}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            {organizationLoading ? (
              <>
                <Skeleton className="h-8 md:h-10 w-48" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : (
              <>
                <h1 className="text-2xl md:text-3xl font-bold text-gradient-custom">
                  {organization?.name}
                </h1>
                <p className="text-sm text-gray-500">{organization?.description}</p>
              </>
            )}
          </div>
        </div>
        <Link href={`/isp/${id}`}>
          <Button variant="gradient" className="w-full md:w-auto ">
            ISP Management
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
        <StatCard
          title="Total Members"
          value={membersLoading ? "..." : members?.length?.toString() ?? "0"}
          icon={<UserIcon />}
          isClickable={true}
          trend={{ value: 10, isPositive: true }}
        />
        <StatCard
          title="Total Roles"
          value={rolesLoading ? "..." : roles?.length?.toString() ?? "0"}
          icon={<FaShieldHalved />}
          color="orange"
          isClickable={true}
          trend={{ value: 10, isPositive: true }}
        />
      </div>
      
      <div className="flex flex-col gap-4">
        <Tabs defaultValue="members" orientation="vertical">
          <div className="flex flex-col md:flex-row gap-4">
            <TabsList className="p-1 mb-2 md:mb-0 w-full md:w-60 h-auto max-h-64 md:max-h-[70vh] overflow-y-auto flex-col gap-2 [&_[data-slot=tabs-trigger]]:h-9 [&_[data-slot=tabs-trigger]]:w-full [&_[data-slot=tabs-trigger]]:justify-start">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invitations">Invitations</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="payment-gateway">Payment Gateway</TabsTrigger>
              <TabsTrigger value="sms">SMS Provider</TabsTrigger>
              <TabsTrigger value="sms-templates">SMS Templates</TabsTrigger>
            </TabsList>

            <div className="flex-1">
          
          <TabsContent value="members">
            {editingMember ? (
              <MemberEditForm
                member={editingMember}
                organizationId={id as string}
                roles={roles?.map((role) => ({
                  id: role.id,
                  name: role.name,
                  description: role.description,
                })) ?? []}
                onCancel={() => setEditingMember(null)}
              />
            ) : (
              <>
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
                {membersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="flex flex-col gap-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <DataTable
                    columns={columns({ 
                      onEditMember: handleEditMember,
                      onDeleteMember: handleDeleteMember,
                      canManageMembers: userPermissions?.canManageMembers || false
                    })}
                    data={
                      members?.map((member) => ({
                        id: member.id,
                        name: member.user.name ?? "Unknown",
                        email: member.user.email,
                        role: member.role?.name ?? "No Role",
                        userId: member.userId,
                        isOwner: organization?.ownerId === member.userId,
                      })) ?? []
                    }
                    filterPlaceholder="Search members..."
                    // onRowSelectionChange={setSelectedMembers}
                  />
                )}
              </>
            )}
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
            {invitationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DataTable
                columns={invitationColumns({ 
                  onResendInvitation: handleResendInvitation,
                  onCancelInvitation: handleCancelInvitation,
                  canManageMembers: userPermissions?.canManageMembers || false
                })}
                data={invitations ?? []}
                filterPlaceholder="Search invitations..."
              />
            )}
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
                {rolesLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex flex-col gap-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-6 w-12" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                    // onRowSelectionChange={setSelectedRoles}
                  />
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="activities">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Organization Activities</h3>
            </div>
            {activitiesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <DataTable
                columns={activityColumns}
                data={activities ?? []}
                filterPlaceholder="Search activities..."
              />
            )}
          </TabsContent>
          
          <TabsContent value="details">
            {organization && !permissionsLoading ? (
              <OrganizationDetails
                organization={organization}
                canEdit={userPermissions?.canEdit || false}
              />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="payment-gateway">
            {!permissionsLoading && userPermissions?.canManageSettings ? (
              <PaymentGatewayConfig organizationId={id as string} />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sms">
            {!permissionsLoading && userPermissions?.canManageSms ? (
              <SMSConfiguration organizationId={id as string} />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sms-templates">
            {!permissionsLoading && userPermissions?.canManageSms ? (
              <SmsTemplate organizationId={id as string} />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
      
      {/* Delete Role Confirmation Dialog */}
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

      {/* Delete Member Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        onConfirm={() => {
          if (deletingMember) {
            removeMember({
              memberId: deletingMember.id,
              organizationId: id as string,
            });
          }
        }}
        title="Remove Member"
        description={`Are you sure you want to remove "${deletingMember?.name}" (${deletingMember?.email}) from this organization? This action cannot be undone.${
          deletingMember?.isOwner
            ? " This is the organization owner and cannot be removed."
            : ""
        }`}
        isLoading={isRemovingMember}
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

"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { UserIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { columns } from "@/components/organization/member-columns";
import { roleColumns } from "@/components/organization/role-columns";
import { DataTable } from "@/components/table/DataTable";
import { FaShieldHalved } from "react-icons/fa6";

const OrganizationDetailPage = () => {
  const { id } = useParams();
  const t = useTRPC();
  const { data: organization } = useQuery(
    t.organization.getOrganizationById.queryOptions({ id: id as string })
  );
  const { data: members } = useQuery(
    t.organization.getOrganizationMembers.queryOptions({ id: id as string })
  );
  const { data: roles } = useQuery(
    t.organization.getOrganizationRoles.queryOptions({ id: id as string })
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
  return (
    <div className="flex flex-col gap-4 my-8">
      <div className="flex justify-between items-center">
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
        <Button variant="gradient">ISP Management</Button>
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
            <TabsTrigger value="roles">Roles</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="members">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Organization Members</h3>
              <Button variant="gradient" size="sm">
                Invite Member
              </Button>
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
          <TabsContent value="roles">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Organization Roles</h3>
              <Button variant="gradient" size="sm">
                Create Role
              </Button>
            </div>
            <DataTable
              columns={roleColumns}
              data={
                roles?.map((role) => ({
                  name: role.name,
                  description: role.description || undefined,
                  permissions: role.permissions,
                  memberCount: role.memberCount,
                })) ?? []
              }
              filterPlaceholder="Search roles..."
              onRowSelectionChange={setSelectedRoles}
            />
          </TabsContent>
          <TabsContent value="details">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Organization Details</h3>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OrganizationDetailPage;

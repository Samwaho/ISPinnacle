import { OrganizationPermission } from "@/lib/generated/prisma";

export const defaultOrganizationRoles = [
  {
    name: "Owner",
    description: "Owner role with all permissions",
    permissions: Object.values(OrganizationPermission),
    isDefault: true,
  },
  {
    name: "Admin",
    description: "Admin role with all permissions",
    permissions: [
      OrganizationPermission.VIEW_ORGANIZATION_DETAILS,
      OrganizationPermission.MANAGE_ORGANIZATION_DETAILS,
      OrganizationPermission.MANAGE_MEMBERS,
      OrganizationPermission.MANAGE_SETTINGS,
      OrganizationPermission.MANAGE_ROLES,
    ],
    isDefault: true,
  },
  {
    name: "Member",
    description: "Member role with limited permissions",
    permissions: [
      OrganizationPermission.VIEW_ORGANIZATION_DETAILS,
    ],
    isDefault: true,
  },
];

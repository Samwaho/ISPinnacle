import { auth } from "@/auth";
import { prisma } from "./db";
import { OrganizationPermission } from "@/lib/generated/prisma";

export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user;
};

export const getCurrentUserOrganization = async (id: string) => {
  const organization = await prisma.organization.findUnique({
    where: {
      id,
    },
  });
  return organization;
};

export const getCurrentUserOrganizationMember = async (
  organizationId: string
) => {
  const session = await auth();
  if (!session?.user) return false;
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: session.user.id!,
      },
    },
    include: {
      role: true,
    },
  });
  return member;
};

// export const getCurrentUserOrganizationRole = async () => {
//     const session = await auth();
//     if (!session?.user) return false;
//     const organization = await getCurrentUserOrganization();
//     if (!organization) return false;
//     const role = await prisma.organizationRole.findUnique({
//         where: {
//             id: session.user.role,
//         },
//     });
//     return role;
// };

export const hasPermissions = async (
  organizationId: string,
  permissions: OrganizationPermission[]
) => {
  const session = await auth();
  if (!session?.user) return false;
  const organization = await getCurrentUserOrganization(organizationId);
  if (!organization) return false;
  const member = await getCurrentUserOrganizationMember(organizationId);
  if (!member) return false;
  return member.role?.permissions.some((permission) =>
    permissions.includes(permission)
  );
};

export const isOrganizationOwner = async (organizationId: string) => {
  const session = await auth();
  if (!session?.user) return false;
  const organization = await getCurrentUserOrganization(organizationId);
  if (!organization) return false;
  if (organization.ownerId === session.user.id) return true;
  return false;
};

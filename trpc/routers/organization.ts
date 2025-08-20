import { createTRPCRouter, protectedProcedure } from "../init";
import { organizationSchema, updateOrganizationSchema, createRoleSchema, updateRoleSchema, deleteRoleSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { defaultOrganizationRoles } from "@/lib/default-data";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { hasPermissions, isOrganizationOwner } from "@/lib/server-hooks";

export const organizationRouter = createTRPCRouter({
  createOrganization: protectedProcedure
    .input(organizationSchema)
    .mutation(async ({ input, ctx }) => {
      const { name, email, phone, logo, description, website } = input;
      // Create organization
      const organization = await prisma.organization.create({
        data: {
          name,
          email,
          phone,
          logo,
          description,
          website,
          ownerId: ctx.session.user.id!,
        },
      });

      // Create default roles
      await prisma.organizationRole.createMany({
        data: defaultOrganizationRoles.map((role) => ({
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          organizationId: organization.id,
        })),
      });

      // Fetch the created roles to get their IDs
      const roles = await prisma.organizationRole.findMany({
        where: {
          organizationId: organization.id,
        },
      });

      // Find the Owner role
      const ownerRole = roles.find((role) => role.name === "Owner");

      // Create organization membership for the owner
      await prisma.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: ctx.session.user.id!,
          roleId: ownerRole?.id,
        },
      });

      return {
        success: true,
        message: "Organization created successfully",
        organization,
      };
    }),
  updateOrganization: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const canUpdate = await hasPermissions(id, [OrganizationPermission.MANAGE_ORGANIZATION_DETAILS]);
      if (!canUpdate) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to update this organization" });
      const organization = await prisma.organization.update({
        where: { id },
        data,
      });
      return {
        success: true,
        message: "Organization updated successfully",
        organization,
      };
    }),
  deleteOrganization: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { id } = input;
      const canDelete = await isOrganizationOwner(id);
      if (!canDelete) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to delete this organization" });
      await prisma.organization.delete({
        where: { id },
      });
      return {
        success: true,
        message: "Organization deleted successfully",
      };
    }),
  createRole: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ input }) => {
      const { organizationId, name, description, permissions } = input;
      const canManageRoles = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_ROLES]);
      if (!canManageRoles) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to create roles in this organization" });
      
      const role = await prisma.organizationRole.create({
        data: {
          name,
          description,
          permissions,
          organizationId,
        },
      });
      return {
        success: true,
        message: "Role created successfully",
        role,
      };
    }),
  updateRole: protectedProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input }) => {
      const { id, organizationId, name, description, permissions } = input;
      const canManageRoles = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_ROLES]);
      if (!canManageRoles) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to update roles in this organization" });
      
      // Check if role exists and get current data
      const existingRole = await prisma.organizationRole.findUnique({
        where: { id },
      });
      
      if (!existingRole) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      
      // Prevent changing name of default roles
      if (existingRole.isDefault && existingRole.name !== name) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change the name of default roles" });
      }
      
      const role = await prisma.organizationRole.update({
        where: { id },
        data: {
          name,
          description,
          permissions,
        },
      });
      return {
        success: true,
        message: "Role updated successfully",
        role,
      };
    }),
  deleteRole: protectedProcedure
    .input(deleteRoleSchema)
    .mutation(async ({ input }) => {
      const { id, organizationId } = input;
      const canManageRoles = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_ROLES]);
      if (!canManageRoles) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to delete roles in this organization" });
      
      // Check if role exists and is not default
      const role = await prisma.organizationRole.findUnique({
        where: { id },
        include: { members: true },
      });
      
      if (!role) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
      }
      
      if (role.isDefault) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete default roles" });
      }
      
      if (role.members.length > 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete role with active members. Please reassign or remove members first." });
      }
      
      await prisma.organizationRole.delete({
        where: { id },
      });
      
      return {
        success: true,
        message: "Role deleted successfully",
      };
    }),
  getMyOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const organizations = await prisma.organization.findMany({
      where: {
        ownerId: ctx.session.user.id!,
      },
    });
    return organizations;
  }),
  getOrganizationById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.id, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this organization" });
      const organization = await prisma.organization.findUnique({
        where: {
          id: input.id,
        },
      });
      return organization;
    }),
  getOrganizationMembers: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.id, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this organization members" });
      const members = await prisma.organizationMember.findMany({
        where: {
          organizationId: input.id,
        },
        include: {
          user: true,
          role: true,
        },
      });
      return members.map((member) => ({
        ...member,
        user: {
          ...member.user,
          password: undefined,
        },
      }));
    }),
  getOrganizationRoles: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.id, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this organization roles" });
      const roles = await prisma.organizationRole.findMany({
        where: {
          organizationId: input.id,
        },
        include: {
          members: true,
        },
      });

      return roles.map((role) => ({
        ...role,
        memberCount: role.members.length,
      }));
    }),
  getUserPermissions: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.id,
            userId: ctx.session.user.id!,
          },
        },
        include: {
          role: true,
        },
      });

      if (!member) {
        return {
          canView: false,
          canEdit: false,
          canManageMembers: false,
          canManageRoles: false,
          canManageSettings: false,
          isOwner: false,
        };
      }

      const permissions = member.role?.permissions || [];
      const organization = await prisma.organization.findUnique({
        where: { id: input.id },
      });

      return {
        canView: permissions.includes(OrganizationPermission.VIEW_ORGANIZATION_DETAILS),
        canEdit: permissions.includes(OrganizationPermission.MANAGE_ORGANIZATION_DETAILS),
        canManageMembers: permissions.includes(OrganizationPermission.MANAGE_MEMBERS),
        canManageRoles: permissions.includes(OrganizationPermission.MANAGE_ROLES),
        canManageSettings: permissions.includes(OrganizationPermission.MANAGE_SETTINGS),
        isOwner: organization?.ownerId === ctx.session.user.id,
      };
    }),
});

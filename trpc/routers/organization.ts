import { createTRPCRouter, protectedProcedure } from "../init";
import { organizationSchema, updateOrganizationSchema } from "@/schemas";
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
});

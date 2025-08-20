import { createTRPCRouter, protectedProcedure } from "../init";
import { organizationSchema, updateOrganizationSchema, createRoleSchema, updateRoleSchema, deleteRoleSchema, inviteMemberSchema, acceptInvitationSchema, rejectInvitationSchema, resendInvitationSchema, cancelInvitationSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { defaultOrganizationRoles } from "@/lib/default-data";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { hasPermissions, isOrganizationOwner } from "@/lib/server-hooks";
import { generateInvitationToken } from "@/lib/tokens";
import { sendOrganizationInvitation } from "@/lib/mail";

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
        members: {
          some: {
            userId: ctx.session.user.id!,
          },
        },
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
  inviteMember: protectedProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId, email, roleId } = input;
      
      // Check if user has permission to manage members
      const canManageMembers = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_MEMBERS]);
      if (!canManageMembers) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to invite members to this organization" 
        });
      }

      // Check if user is already a member
      const existingMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          user: {
            email,
          },
        },
      });

      if (existingMember) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "User is already a member of this organization" 
        });
      }

      // Check if there's already a pending invitation
      const existingInvitation = await prisma.organizationInvitation.findFirst({
        where: {
          email,
          organizationId,
          status: "PENDING",
        },
      });

      if (existingInvitation) {
        throw new TRPCError({ 
          code: "CONFLICT", 
          message: "An invitation has already been sent to this email address" 
        });
      }

      // Verify the role exists and belongs to the organization
      const role = await prisma.organizationRole.findFirst({
        where: {
          id: roleId,
          organizationId,
        },
      });

      if (!role) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Role not found" 
        });
      }

      // Generate invitation token
      const invitation = await generateInvitationToken(email, organizationId, roleId);

      // Get organization and inviter details
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          owner: true,
        },
      });

      if (!organization) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Organization not found" 
        });
      }

      const inviter = await prisma.user.findUnique({
        where: { id: ctx.session.user.id! },
      });

      // Send invitation email
      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/invitation?token=${invitation.token}&email=${email}`;
      
      const emailResult = await sendOrganizationInvitation(
        email,
        invitationLink,
        organization.name,
        inviter?.name || "Organization Admin",
        role.name
      );

      if (!emailResult.success) {
        // Delete the invitation if email failed
        await prisma.organizationInvitation.delete({
          where: { id: invitation.id },
        });
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to send invitation email" 
        });
      }

      return {
        success: true,
        message: "Invitation sent successfully",
        invitation,
      };
    }),
  getOrganizationInvitations: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.id, [OrganizationPermission.VIEW_ORGANIZATION_DETAILS]);
      if (!canView) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to view this organization invitations" 
        });
      }

      const invitations = await prisma.organizationInvitation.findMany({
        where: {
          organizationId: input.id,
        },
        include: {
          role: true,
        },
        orderBy: {
          id: "desc",
        },
      });

      return invitations;
    }),
  resendInvitation: protectedProcedure
    .input(resendInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const { invitationId } = input;

      // Get the invitation
      const invitation = await prisma.organizationInvitation.findUnique({
        where: { id: invitationId },
        include: {
          organization: {
            include: {
              owner: true,
            },
          },
          role: true,
        },
      });

      if (!invitation) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Invitation not found" 
        });
      }

      // Check if user has permission to manage members
      const canManageMembers = await hasPermissions(invitation.organizationId, [OrganizationPermission.MANAGE_MEMBERS]);
      if (!canManageMembers) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to resend invitations" 
        });
      }

      // Check if invitation is still pending
      if (invitation.status !== "PENDING") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Can only resend pending invitations" 
        });
      }

      // Check if invitation has expired
      if (invitation.expires < new Date()) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Invitation has expired" 
        });
      }

      const inviter = await prisma.user.findUnique({
        where: { id: ctx.session.user.id! },
      });

      // Send invitation email
      const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/invitation?token=${invitation.token}&email=${invitation.email}`;
      
      const emailResult = await sendOrganizationInvitation(
        invitation.email,
        invitationLink,
        invitation.organization.name,
        inviter?.name || "Organization Admin",
        invitation.role?.name || "Member"
      );

      if (!emailResult.success) {
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Failed to resend invitation email" 
        });
      }

      return {
        success: true,
        message: "Invitation resent successfully",
      };
    }),
  cancelInvitation: protectedProcedure
    .input(cancelInvitationSchema)
    .mutation(async ({ input }) => {
      const { invitationId } = input;

      // Get the invitation
      const invitation = await prisma.organizationInvitation.findUnique({
        where: { id: invitationId },
      });

      if (!invitation) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Invitation not found" 
        });
      }

      // Check if user has permission to manage members
      const canManageMembers = await hasPermissions(invitation.organizationId, [OrganizationPermission.MANAGE_MEMBERS]);
      if (!canManageMembers) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to cancel invitations" 
        });
      }

      // Check if invitation is still pending
      if (invitation.status !== "PENDING") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Can only cancel pending invitations" 
        });
      }

      // Delete the invitation
      await prisma.organizationInvitation.delete({
        where: { id: invitationId },
      });

      return {
        success: true,
        message: "Invitation cancelled successfully",
      };
    }),
});

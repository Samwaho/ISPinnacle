import { createTRPCRouter, protectedProcedure } from "../init";
import { organizationSchema, updateOrganizationSchema, createRoleSchema, updateRoleSchema, deleteRoleSchema, inviteMemberSchema, acceptInvitationSchema, rejectInvitationSchema, resendInvitationSchema, cancelInvitationSchema, updateMemberRoleSchema, removeMemberSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { defaultOrganizationRoles } from "@/lib/default-data";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { createActivity, hasPermissions, isOrganizationOwner } from "@/lib/server-hooks";
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

      await createActivity(organization.id, ctx.session.user.id!, `Organization "${name}" created successfully with default roles and settings`);

      return {
        success: true,
        message: "Organization created successfully",
        organization,
      };
    }),
  updateOrganization: protectedProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      const canUpdate = await hasPermissions(id, [OrganizationPermission.MANAGE_ORGANIZATION_DETAILS]);
      if (!canUpdate) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to update this organization" });
      
      // Get current organization data for comparison
      const currentOrg = await prisma.organization.findUnique({
        where: { id },
      });
      
      const organization = await prisma.organization.update({
        where: { id },
        data,
      });

      // Create detailed activity message
      const changes = [];
      if (data.name && data.name !== currentOrg?.name) changes.push(`name from "${currentOrg?.name}" to "${data.name}"`);
      if (data.email && data.email !== currentOrg?.email) changes.push(`email from "${currentOrg?.email}" to "${data.email}"`);
      if (data.phone && data.phone !== currentOrg?.phone) changes.push(`phone from "${currentOrg?.phone}" to "${data.phone}"`);
      if (data.description && data.description !== currentOrg?.description) changes.push(`description`);
      if (data.website && data.website !== currentOrg?.website) changes.push(`website from "${currentOrg?.website}" to "${data.website}"`);
      
      const activityMessage = changes.length > 0 
        ? `Updated organization details: ${changes.join(', ')}`
        : `Updated organization settings`;

      await createActivity(id, ctx.session.user.id!, activityMessage);

      return {
        success: true,
        message: "Organization updated successfully",
        organization,
      };
    }),
  deleteOrganization: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { id } = input;
      const canDelete = await isOrganizationOwner(id);
      if (!canDelete) throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to delete this organization" });
      
      // Get organization name before deletion
      const organization = await prisma.organization.findUnique({
        where: { id },
      });
      
      await prisma.organization.delete({
        where: { id },
      });

      await createActivity(id, ctx.session.user.id!, `Organization "${organization?.name}" permanently deleted`);

      return {
        success: true,
        message: "Organization deleted successfully",
      };
    }),
  createRole: protectedProcedure
    .input(createRoleSchema)
    .mutation(async ({ input, ctx }) => {
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

      await createActivity(organizationId, ctx.session.user.id!, `Created new role "${name}" with ${permissions.length} permissions: ${permissions.join(', ')}`);

      return {
        success: true,
        message: "Role created successfully",
        role,
      };
    }),
  updateRole: protectedProcedure
    .input(updateRoleSchema)
    .mutation(async ({ input, ctx }) => {
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

      // Create detailed activity message
      const changes = [];
      if (name !== existingRole.name) changes.push(`name from "${existingRole.name}" to "${name}"`);
      if (description !== existingRole.description) changes.push(`description`);
      if (JSON.stringify(permissions.sort()) !== JSON.stringify(existingRole.permissions.sort())) {
        const added = permissions.filter(p => !existingRole.permissions.includes(p));
        const removed = existingRole.permissions.filter(p => !permissions.includes(p));
        if (added.length > 0) changes.push(`added permissions: ${added.join(', ')}`);
        if (removed.length > 0) changes.push(`removed permissions: ${removed.join(', ')}`);
      }

      const activityMessage = changes.length > 0 
        ? `Updated role "${existingRole.name}": ${changes.join(', ')}`
        : `Updated role "${existingRole.name}" settings`;

      await createActivity(organizationId, ctx.session.user.id!, activityMessage);

      return {
        success: true,
        message: "Role updated successfully",
        role,
      };
    }),
  deleteRole: protectedProcedure
    .input(deleteRoleSchema)
    .mutation(async ({ input, ctx }) => {
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

      await createActivity(organizationId, ctx.session.user.id!, `Deleted custom role "${role.name}"`);

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
        canViewStations: permissions.includes(OrganizationPermission.VIEW_STATIONS),
        canManageStations: permissions.includes(OrganizationPermission.MANAGE_STATIONS),
        canViewCustomers: permissions.includes(OrganizationPermission.VIEW_CUSTOMERS),
        canManageCustomers: permissions.includes(OrganizationPermission.MANAGE_CUSTOMERS),
        canViewPackages: permissions.includes(OrganizationPermission.VIEW_PACKAGES),
        canManagePackages: permissions.includes(OrganizationPermission.MANAGE_PACKAGES),
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

      await createActivity(organizationId, ctx.session.user.id!, `Sent invitation to ${email} for role "${role.name}"`);

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

      await createActivity(invitation.organizationId, ctx.session.user.id!, `Resent invitation to ${invitation.email} for role "${invitation.role?.name || 'Member'}"`);

      return {
        success: true,
        message: "Invitation resent successfully",
      };
    }),
  cancelInvitation: protectedProcedure
    .input(cancelInvitationSchema)
    .mutation(async ({ input, ctx }) => {
      const { invitationId } = input;

      // Get the invitation
      const invitation = await prisma.organizationInvitation.findUnique({
        where: { id: invitationId },
        include: {
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

      await createActivity(invitation.organizationId, ctx.session.user.id!, `Cancelled invitation to ${invitation.email} for role "${invitation.role?.name || 'Member'}"`);

      return {
        success: true,
        message: "Invitation cancelled successfully",
      };
    }),
  updateMemberRole: protectedProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId, memberId, roleId } = input;
      const canManageMembers = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_MEMBERS]);
      if (!canManageMembers) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to update member roles" 
        });
      }

      const member = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        include: { user: true, role: true },
      });

      if (!member) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Member not found" 
        });
      }

      // Get the new role details if roleId is provided
      let newRole = null;
      if (roleId) {
        newRole = await prisma.organizationRole.findFirst({
          where: { 
            id: roleId,
            organizationId,
          },
        });

        if (!newRole) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Role not found" 
          });
        }
      }

      const updatedMember = await prisma.organizationMember.update({
        where: { id: memberId },
        data: {
          roleId: roleId || null,
        },
        include: { user: true, role: true },
      });

      // Create detailed activity message
      const oldRoleName = member.role?.name || "No Role";
      const newRoleName = newRole?.name || "No Role";
      const activityMessage = `Updated ${member.user.name || member.user.email}'s role from "${oldRoleName}" to "${newRoleName}"`;

      await createActivity(organizationId, ctx.session.user.id!, activityMessage);

      return {
        success: true,
        message: "Member role updated successfully",
        member: updatedMember,
      };
    }),
  removeMember: protectedProcedure
    .input(removeMemberSchema)
    .mutation(async ({ input, ctx }) => {
      const { organizationId, memberId } = input;
      const canManageMembers = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_MEMBERS]);
      if (!canManageMembers) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: "You are not authorized to remove members" 
        });
      }

      const member = await prisma.organizationMember.findUnique({
        where: { id: memberId },
        include: { user: true, role: true },
      });

      if (!member) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Member not found" 
        });
      }

      // Prevent removing the last owner
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          members: true,
        },
      });

      if (organization && organization.ownerId === member.userId) {
        const otherMembers = organization.members.filter(m => m.userId !== member.userId);
        if (otherMembers.length === 0) {
          throw new TRPCError({ 
            code: "FORBIDDEN", 
            message: "Cannot remove the last owner. Please reassign or delete the organization." 
          });
        }
      }

      await prisma.organizationMember.delete({
        where: { id: memberId },
      });

      const roleName = member.role?.name || "No Role";
      await createActivity(organizationId, ctx.session.user.id!, `Removed ${member.user.name || member.user.email} (${roleName}) from the organization`);

      return {
        success: true,
        message: "Member removed successfully",
      };
    }),
  getOrganizationActivities: protectedProcedure
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
          message: "You are not authorized to view this organization activities" 
        });
      }

      const activities = await prisma.organizationActivity.findMany({
        where: {
          organizationId: input.id,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return activities;
    }),
});

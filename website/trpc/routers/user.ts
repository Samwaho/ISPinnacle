import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import {
  loginSchema,
  newPasswordSchema,
  registerSchema,
  resetSchema,
  acceptInvitationSchema,
  rejectInvitationSchema,
  updateProfileSchema,
  changePasswordSchema,
  requestTwoFactorSchema,
  verifyTwoFactorSchema,
} from "@/schemas";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { TRPCError } from "@trpc/server";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import {
  generatePasswordResetToken,
  generateTwoFactorToken,
  generateVerificationToken,
} from "@/lib/tokens";
import {
  sendPasswordResetEmail,
  sendTwoFactorEmail,
  sendVerificationEmail,
} from "@/lib/mail";
import z from "zod";

export const userRouter = createTRPCRouter({
  // Register a new user
  register: baseProcedure.input(registerSchema).mutation(async ({ input }) => {
    const { email, password, name, invitationToken } = input;
    const hashedPassword = await bcrypt.hash(password, 10);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new TRPCError({ code: "CONFLICT", message: "User already exists" });
    }
    
    // Create the user
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    // If there's an invitation token, accept the invitation
    if (invitationToken) {
      try {
        // Find the invitation
        const invitation = await prisma.organizationInvitation.findFirst({
          where: {
            token: invitationToken,
            email,
            status: "PENDING",
          },
          include: {
            organization: true,
            role: true,
          },
        });

        if (invitation && invitation.expires > new Date()) {
          // Create organization membership
          await prisma.organizationMember.create({
            data: {
              organizationId: invitation.organizationId,
              userId: user.id,
              roleId: invitation.roleId,
            },
          });

          // Update invitation status
          await prisma.organizationInvitation.update({
            where: { id: invitation.id },
            data: { status: "ACCEPTED" },
          });

          // Send verification email
          const verificationToken = await generateVerificationToken(email);
          await sendVerificationEmail(
            verificationToken.email,
            verificationToken.token
          );

          return { 
            success: true, 
            message: "Account created and invitation accepted! Please verify your email. Check your inbox.",
            organization: invitation.organization,
          };
        }
      } catch (error) {
        console.error("Error accepting invitation during registration:", error);
        // Continue with normal registration even if invitation fails
      }
    }

    // Normal registration flow
    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(
      verificationToken.email,
      verificationToken.token
    );
    return { success: true, message: "Verify your email. Check your inbox." };
  }),
  // Login a user
  login: baseProcedure.input(loginSchema).mutation(async ({ input }) => {
    const { email, password, twoFactorToken } = input;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (!existingUser || !existingUser.email || !existingUser.password) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }
    if (!existingUser.emailVerified) {
      const verificationToken = await generateVerificationToken(email);
      await sendVerificationEmail(
        verificationToken.email,
        verificationToken.token
      );
      return {
        success: true,
        message: "Verify your email. Check your inbox.",
        verifyEmail: true,
      };
    }
    if (existingUser.isTwoFactorEnabled && existingUser.email) {
      if (twoFactorToken) {
        const existingTwoFactorToken = await prisma.twoFactorToken.findFirst({
          where: { email: existingUser.email },
        });
        if (!existingTwoFactorToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid two-factor token",
          });
        }
        if (existingTwoFactorToken.token !== twoFactorToken) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid two-factor token",
          });
        }
        const hasExpired =
          new Date(existingTwoFactorToken.expires) < new Date();
        if (hasExpired) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Two-factor token expired",
          });
        }
        await prisma.twoFactorToken.delete({
          where: { id: existingTwoFactorToken.id },
        });

        const existingTwoFactorConfirmation =
          await prisma.twoFactorConfirmation.findUnique({
            where: { userId: existingUser.id },
          });
        if (existingTwoFactorConfirmation) {
          await prisma.twoFactorConfirmation.delete({
            where: { id: existingTwoFactorConfirmation.id },
          });
        }
        await prisma.twoFactorConfirmation.create({
          data: {
            userId: existingUser.id,
          },
        });
      } else {
        const newTwoFactorToken = await generateTwoFactorToken(
          existingUser.email
        );
        await sendTwoFactorEmail(existingUser.email, newTwoFactorToken.token);
        return { twoFactorEnabled: true };
      }
    }
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case "CredentialsSignin":
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid credentials",
            });
          default:
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Something went wrong",
            });
        }
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      });
    }
  }),
  verifyEmail: baseProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const { token } = input;
      const verificationToken = await prisma.verificationToken.findUnique({
        where: { token },
      });
      if (!verificationToken) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid token" });
      }
      const hasExpired = new Date(verificationToken.expires) < new Date();
      if (hasExpired) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Token expired" });
      }
      const existingUser = await prisma.user.findUnique({
        where: { email: verificationToken.email },
      });
      if (!existingUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: new Date() },
      });
      await prisma.verificationToken.delete({
        where: { id: verificationToken.id },
      });
      return { success: true, message: "Email verified successfully" };
    }),
  resetPassword: baseProcedure
    .input(resetSchema)
    .mutation(async ({ input }) => {
      const { email } = input;
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (!existingUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const resetToken = await generatePasswordResetToken(email);
      await sendPasswordResetEmail(resetToken.email, resetToken.token);
      return { success: true, message: "Reset password link sent to email" };
    }),
  newPassword: baseProcedure.input(newPasswordSchema).mutation(async ({ input }) => {
    const { password, token } = input;
    const existingToken = await prisma.passwordResetToken.findUnique({
      where: {
        token,
      },
    });
    if (!existingToken) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invalid token" });
    }
    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Token has expired" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: {
        email: existingToken.email,
      },
      data: {
        password: hashedPassword,
      },
    });
    await prisma.passwordResetToken.delete({
      where: {
        id: existingToken.id,
      },
    });
    return { success: true, message: "Password updated successfully" };
  }),
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isTwoFactorEnabled: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        password: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const { password, ...profile } = user;

    return {
      ...profile,
      hasPassword: Boolean(password),
    };
  }),
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const trimmedName = input.name.trim();
      const normalizedImage =
        input.image === undefined || input.image === null
          ? undefined
          : input.image.trim() === ""
            ? null
            : input.image.trim();

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: trimmedName,
          ...(normalizedImage !== undefined ? { image: normalizedImage } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          isTwoFactorEnabled: true,
          role: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),
  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const { currentPassword, newPassword } = input;
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          password: true,
        },
      });

      if (!user?.password) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Password authentication is not configured for this account",
        });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Current password is incorrect",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { password: hashedPassword },
      });

      return { success: true, message: "Password updated successfully" };
    }),
  requestTwoFactor: protectedProcedure
    .input(requestTwoFactorSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          email: true,
          name: true,
          isTwoFactorEnabled: true,
        },
      });

      if (!user?.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A valid email address is required to manage two-factor authentication",
        });
      }

      if (input.enable && user.isTwoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication is already enabled",
        });
      }

      if (!input.enable && !user.isTwoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication is not enabled",
        });
      }

      const twoFactorToken = await generateTwoFactorToken(user.email);
      const { success } = await sendTwoFactorEmail(
        user.email,
        twoFactorToken.token,
        user.name ?? undefined
      );

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send verification code. Please try again later.",
        });
      }

      return {
        success: true,
        message: "Verification code sent to your email address",
      };
    }),
  verifyTwoFactor: protectedProcedure
    .input(verifyTwoFactorSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          isTwoFactorEnabled: true,
        },
      });

      if (!user?.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A valid email address is required to manage two-factor authentication",
        });
      }

      if (input.enable && user.isTwoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication is already enabled",
        });
      }

      if (!input.enable && !user.isTwoFactorEnabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Two-factor authentication is already disabled",
        });
      }

      const existingToken = await prisma.twoFactorToken.findFirst({
        where: { email: user.email },
      });

      if (!existingToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No verification code found. Please request a new code.",
        });
      }

      if (existingToken.token !== input.code) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      if (existingToken.expires < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Verification code has expired",
        });
      }

      await prisma.twoFactorToken.delete({
        where: { id: existingToken.id },
      });

      await prisma.twoFactorConfirmation.deleteMany({
        where: { userId },
      });

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isTwoFactorEnabled: input.enable,
        },
        select: {
          id: true,
          isTwoFactorEnabled: true,
        },
      });

      return {
        success: true,
        isTwoFactorEnabled: updatedUser.isTwoFactorEnabled,
        message: input.enable
          ? "Two-factor authentication has been enabled"
          : "Two-factor authentication has been disabled",
      };
    }),
  acceptInvitation: baseProcedure.input(acceptInvitationSchema).mutation(async ({ input }) => {
    const { token, email } = input;

    // Find the invitation
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        email,
        status: "PENDING",
      },
      include: {
        organization: true,
        role: true,
      },
    });

    if (!invitation) {
      throw new TRPCError({ 
        code: "NOT_FOUND", 
        message: "Invalid or expired invitation" 
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Invitation has expired" 
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new TRPCError({ 
        code: "NOT_FOUND", 
        message: "User not found. Please create an account first." 
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new TRPCError({ 
        code: "CONFLICT", 
        message: "You are already a member of this organization" 
      });
    }

    // Create organization membership
    await prisma.organizationMember.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        roleId: invitation.roleId,
      },
    });

    // Update invitation status
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    return {
      success: true,
      message: "Invitation accepted successfully",
      organization: invitation.organization,
    };
  }),
  rejectInvitation: baseProcedure.input(rejectInvitationSchema).mutation(async ({ input }) => {
    const { token, email } = input;

    // Find the invitation
    const invitation = await prisma.organizationInvitation.findFirst({
      where: {
        token,
        email,
        status: "PENDING",
      },
    });

    if (!invitation) {
      throw new TRPCError({ 
        code: "NOT_FOUND", 
        message: "Invalid or expired invitation" 
      });
    }

    // Check if invitation has expired
    if (invitation.expires < new Date()) {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Invitation has expired" 
      });
    }

    // Update invitation status
    await prisma.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: "REJECTED" },
    });

    return {
      success: true,
      message: "Invitation rejected successfully",
    };
  }),

  // Check if a user exists by email
  checkUserExists: baseProcedure
    .input(z.object({ email: z.string().email("Invalid email address") }))
    .query(async ({ input }) => {
      const { email } = input;
      
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true }, // Only select necessary fields
      });

      return {
        exists: !!user,
        email: email,
      };
    }),
});

import { Resend } from "resend";
import {
  resetPasswordEmailTemplate,
  verifyEmailTemplate,
  welcomeEmailTemplate,
  twoFactorEmailTemplate,
  organizationInvitationTemplate,
} from "./email-templates";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail =
  process.env.RESEND_FROM_EMAIL ?? "RentSys <noreply@ispinnacle.co.ke>";
export const sendVerificationEmail = async (
  email: string,
  token: string,
  userName?: string
) => {
  try {
    const confirmLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/new-verification?token=${token}`;

    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Verify your email - RentSys",
      html: verifyEmailTemplate(confirmLink, userName),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, error };
  }
};

export const sendWelcomeEmail = async (email: string, userName: string) => {
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Welcome to RentSys! 🎉",
      html: welcomeEmailTemplate(userName),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    return { success: false, error };
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string,
  userName?: string
) => {
  try {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/new-password?token=${token}`;

    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your password - RentSys",
      html: resetPasswordEmailTemplate(resetLink, userName),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error };
  }
};

export const sendTwoFactorEmail = async (
  email: string,
  token: string,
  userName?: string
) => {
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Two-Factor Authentication - RentSys",
      html: twoFactorEmailTemplate(token, userName),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send two-factor email:", error);
    return { success: false, error };
  }
};

export const sendOrganizationInvitation = async (
  email: string,
  invitationLink: string,
  organizationName: string,
  inviterName: string,
  roleName: string
) => {
  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: `Invitation to join ${organizationName} - RentSys`,
      html: organizationInvitationTemplate(
        invitationLink,
        organizationName,
        inviterName,
        roleName,
        email
      ),
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to send organization invitation email:", error);
    return { success: false, error };
  }
};
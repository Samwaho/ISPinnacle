import { OrganizationPermission } from "@/lib/generated/prisma";
import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    twoFactorToken: z.string().optional(),
});

export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const resetSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const newPasswordSchema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
    token: z.string().min(1, "Token is required"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

export const organizationSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    logo: z.string().optional(),
    description: z.string().optional(),
    website: z.string().optional(),
});

export const updateOrganizationSchema = organizationSchema.extend({
    id: z.string().min(1, "Organization ID is required"),
});

export const memberSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.string().min(1, "Role is required"),
});

export const roleSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    permissions: z.array(z.nativeEnum(OrganizationPermission)).optional(),
    memberCount: z.number().optional(),
});

export const createRoleSchema = z.object({
    organizationId: z.string().min(1, "Organization ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    permissions: z.array(z.nativeEnum(OrganizationPermission)),
});

export const updateRoleSchema = z.object({
    id: z.string().min(1, "Role ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    permissions: z.array(z.nativeEnum(OrganizationPermission)),
});

export const deleteRoleSchema = z.object({
    id: z.string().min(1, "Role ID is required"),
    organizationId: z.string().min(1, "Organization ID is required"),
});
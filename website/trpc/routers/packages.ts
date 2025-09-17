import { createTRPCRouter, protectedProcedure } from "../init";
import { createPackageSchema, updatePackageSchema, deletePackageSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { createActivity, hasPermissions } from "@/lib/server-hooks";

export const packagesRouter = createTRPCRouter({
    getPackages: protectedProcedure
        .input(z.object({
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .query(async ({ input }) => {
            const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_PACKAGES]);
            if (!canView) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to view packages in this organization" 
                });
            }

            const packages = await prisma.organizationPackage.findMany({
                where: {
                    organizationId: input.organizationId,
                },
                include: {
                    customers: {
                        include: {
                            station: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            return packages.map(pkg => ({
                ...pkg,
                customerCount: pkg.customers.length,
            }));
        }),

    getPackageById: protectedProcedure
        .input(z.object({
            id: z.string().min(1, "Package ID is required"),
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .query(async ({ input }) => {
            const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_PACKAGES]);
            if (!canView) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to view this package" 
                });
            }

            const pkg = await prisma.organizationPackage.findFirst({
                where: {
                    id: input.id,
                    organizationId: input.organizationId,
                },
                include: {
                    customers: {
                        include: {
                            station: true,
                        },
                    },
                },
            });

            if (!pkg) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Package not found" 
                });
            }

            return pkg;
        }),

    createPackage: protectedProcedure
        .input(createPackageSchema)
        .mutation(async ({ input, ctx }) => {
            const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_PACKAGES]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to create packages in this organization" 
                });
            }

            // Check if package with same name already exists in the organization
            const existingPackage = await prisma.organizationPackage.findFirst({
                where: {
                    name: input.name,
                    organizationId: input.organizationId,
                },
            });

            if (existingPackage) {
                throw new TRPCError({ 
                    code: "CONFLICT", 
                    message: "A package with this name already exists in this organization" 
                });
            }

            const pkg = await prisma.organizationPackage.create({
                data: {
                    name: input.name,
                    description: input.description,
                    price: input.price,
                    duration: input.duration,
                    durationType: input.durationType,
                    type: input.type,
                    addressPool: input.addressPool,
                    maxDevices: input.maxDevices,
                    downloadSpeed: input.downloadSpeed,
                    uploadSpeed: input.uploadSpeed,
                    burstDownloadSpeed: input.burstDownloadSpeed,
                    burstUploadSpeed: input.burstUploadSpeed,
                    burstThresholdDownload: input.burstThresholdDownload,
                    burstThresholdUpload: input.burstThresholdUpload,
                    burstDuration: input.burstDuration,
                    isActive: input.isActive,
                    organizationId: input.organizationId,
                },
            });

            await createActivity(input.organizationId, ctx.session.user.id!, `Created new package "${input.name}"`);

            return {
                success: true,
                message: "Package created successfully",
                package: pkg,
            };
        }),

    updatePackage: protectedProcedure
        .input(updatePackageSchema)
        .mutation(async ({ input, ctx }) => {
            const { id, organizationId, ...data } = input;
            
            const canManage = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_PACKAGES]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to update packages in this organization" 
                });
            }

            // Check if package exists
            const existingPackage = await prisma.organizationPackage.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });

            if (!existingPackage) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Package not found" 
                });
            }

            // Check if new name conflicts with another package
            if (data.name && data.name !== existingPackage.name) {
                const nameConflict = await prisma.organizationPackage.findFirst({
                    where: {
                        name: data.name,
                        organizationId,
                        id: { not: id },
                    },
                });

                if (nameConflict) {
                    throw new TRPCError({ 
                        code: "CONFLICT", 
                        message: "A package with this name already exists in this organization" 
                    });
                }
            }

            const pkg = await prisma.organizationPackage.update({
                where: { id },
                data,
            });

            // Create detailed activity message
            const changes = [];
            if (data.name && data.name !== existingPackage.name) changes.push(`name from "${existingPackage.name}" to "${data.name}"`);
            if (data.description !== existingPackage.description) changes.push(`description`);
            if (data.price !== existingPackage.price) changes.push(`price from ${existingPackage.price} to ${data.price}`);
            if (data.duration !== existingPackage.duration) changes.push(`duration from ${existingPackage.duration} to ${data.duration}`);
            if (data.durationType && data.durationType !== existingPackage.durationType) changes.push(`duration type from "${existingPackage.durationType}" to "${data.durationType}"`);
            if (data.type && data.type !== existingPackage.type) changes.push(`type from "${existingPackage.type}" to "${data.type}"`);
            if (data.addressPool !== existingPackage.addressPool) changes.push(`address pool`);
            if (data.maxDevices !== existingPackage.maxDevices) changes.push(`max devices`);
            if (data.downloadSpeed !== existingPackage.downloadSpeed) changes.push(`download speed from ${existingPackage.downloadSpeed} to ${data.downloadSpeed}`);
            if (data.uploadSpeed !== existingPackage.uploadSpeed) changes.push(`upload speed from ${existingPackage.uploadSpeed} to ${data.uploadSpeed}`);
            if (data.isActive !== existingPackage.isActive) changes.push(`active status from ${existingPackage.isActive} to ${data.isActive}`);
            
            const activityMessage = changes.length > 0 
                ? `Updated package "${existingPackage.name}": ${changes.join(', ')}`
                : `Updated package "${existingPackage.name}" settings`;

            await createActivity(organizationId, ctx.session.user.id!, activityMessage);

            return {
                success: true,
                message: "Package updated successfully",
                package: pkg,
            };
        }),

    deletePackage: protectedProcedure
        .input(deletePackageSchema)
        .mutation(async ({ input, ctx }) => {
            const { id, organizationId } = input;
            
            const canManage = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_PACKAGES]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to delete packages in this organization" 
                });
            }

            // Check if package exists and get its details
            const pkg = await prisma.organizationPackage.findFirst({
                where: {
                    id,
                    organizationId,
                },
                include: {
                    customers: true,
                },
            });

            if (!pkg) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Package not found" 
                });
            }

            // Check if package has customers
            if (pkg.customers.length > 0) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "Cannot delete package with active customers. Please reassign or remove customers first." 
                });
            }

            await prisma.organizationPackage.delete({
                where: { id },
            });

            await createActivity(organizationId, ctx.session.user.id!, `Deleted package "${pkg.name}"`);

            return {
                success: true,
                message: "Package deleted successfully",
            };
        }),

    getPackageCustomers: protectedProcedure
        .input(z.object({
            packageId: z.string().min(1, "Package ID is required"),
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .query(async ({ input }) => {
            const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_PACKAGES]);
            if (!canView) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to view package customers" 
                });
            }

            const customers = await prisma.organizationCustomer.findMany({
                where: {
                    packageId: input.packageId,
                    organizationId: input.organizationId,
                },
                include: {
                    station: true,
                    payments: {
                        orderBy: {
                            date: "desc",
                        },
                        take: 5,
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            return customers;
        }),

    togglePackageStatus: protectedProcedure
        .input(z.object({
            id: z.string().min(1, "Package ID is required"),
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .mutation(async ({ input, ctx }) => {
            const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_PACKAGES]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to manage packages in this organization" 
                });
            }

            // Check if package exists
            const existingPackage = await prisma.organizationPackage.findFirst({
                where: {
                    id: input.id,
                    organizationId: input.organizationId,
                },
            });

            if (!existingPackage) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Package not found" 
                });
            }

            const newStatus = !existingPackage.isActive;
            const pkg = await prisma.organizationPackage.update({
                where: { id: input.id },
                data: { isActive: newStatus },
            });

            const statusText = newStatus ? "activated" : "deactivated";
            await createActivity(input.organizationId, ctx.session.user.id!, `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} package "${existingPackage.name}"`);

            return {
                success: true,
                message: `Package ${statusText} successfully`,
                package: pkg,
            };
        }),
});

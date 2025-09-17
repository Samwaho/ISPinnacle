import { createTRPCRouter, protectedProcedure } from "../init";
import { createStationSchema, updateStationSchema, deleteStationSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { createActivity, hasPermissions } from "@/lib/server-hooks";

export const stationsRouter = createTRPCRouter({
    getStations: protectedProcedure
        .input(z.object({
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .query(async ({ input, ctx }) => {
            const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_STATIONS]);
            if (!canView) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to view stations in this organization" 
                });
            }

            const stations = await prisma.organizationStation.findMany({
                where: {
                    organizationId: input.organizationId,
                },
                include: {
                    customers: {
                        include: {
                            package: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            return stations.map(station => ({
                ...station,
                customerCount: station.customers.length,
            }));
        }),

    getStationById: protectedProcedure
        .input(z.object({
            id: z.string().min(1, "Station ID is required"),
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .query(async ({ input }) => {
            const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_STATIONS]);
            if (!canView) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to view this station" 
                });
            }

            const station = await prisma.organizationStation.findFirst({
                where: {
                    id: input.id,
                    organizationId: input.organizationId,
                },
                include: {
                    customers: {
                        include: {
                            package: true,
                        },
                    },
                },
            });

            if (!station) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Station not found" 
                });
            }

            return station;
        }),

    createStation: protectedProcedure
        .input(createStationSchema)
        .mutation(async ({ input, ctx }) => {
            const canManage = await hasPermissions(input.organizationId, [OrganizationPermission.MANAGE_STATIONS]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to create stations in this organization" 
                });
            }

            // Check if station with same name already exists in the organization
            const existingStation = await prisma.organizationStation.findFirst({
                where: {
                    name: input.name,
                    organizationId: input.organizationId,
                },
            });

            if (existingStation) {
                throw new TRPCError({ 
                    code: "CONFLICT", 
                    message: "A station with this name already exists in this organization" 
                });
            }

            const station = await prisma.organizationStation.create({
                data: {
                    name: input.name,
                    description: input.description,
                    location: input.location,
                    type: input.type,
                    organizationId: input.organizationId,
                },
            });

            await createActivity(input.organizationId, ctx.session.user.id!, `Created new station "${input.name}"`);

            return {
                success: true,
                message: "Station created successfully",
                station,
            };
        }),

    updateStation: protectedProcedure
        .input(updateStationSchema)
        .mutation(async ({ input, ctx }) => {
            const { id, organizationId, ...data } = input;
            
            const canManage = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_STATIONS]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to update stations in this organization" 
                });
            }

            // Check if station exists
            const existingStation = await prisma.organizationStation.findFirst({
                where: {
                    id,
                    organizationId,
                },
            });

            if (!existingStation) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Station not found" 
                });
            }

            // Check if new name conflicts with another station
            if (data.name && data.name !== existingStation.name) {
                const nameConflict = await prisma.organizationStation.findFirst({
                    where: {
                        name: data.name,
                        organizationId,
                        id: { not: id },
                    },
                });

                if (nameConflict) {
                    throw new TRPCError({ 
                        code: "CONFLICT", 
                        message: "A station with this name already exists in this organization" 
                    });
                }
            }

            const station = await prisma.organizationStation.update({
                where: { id },
                data,
            });

            // Create detailed activity message
            const changes = [];
            if (data.name && data.name !== existingStation.name) changes.push(`name from "${existingStation.name}" to "${data.name}"`);
            if ('description' in data && data.description !== existingStation.description) changes.push(`description`);
            if ('location' in data && data.location !== existingStation.location) changes.push(`location`);
            if (data.type && data.type !== existingStation.type) changes.push(`type from "${existingStation.type}" to "${data.type}"`);            
            const activityMessage = changes.length > 0 
                ? `Updated station "${existingStation.name}": ${changes.join(', ')}`
                : `Updated station "${existingStation.name}" settings`;

            await createActivity(organizationId, ctx.session.user.id!, activityMessage);

            return {
                success: true,
                message: "Station updated successfully",
                station,
            };
        }),

    deleteStation: protectedProcedure
        .input(deleteStationSchema)
        .mutation(async ({ input, ctx }) => {
            const { id, organizationId } = input;
            
            const canManage = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_STATIONS]);
            if (!canManage) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to delete stations in this organization" 
                });
            }

            // Check if station exists and get its details
            const station = await prisma.organizationStation.findFirst({
                where: {
                    id,
                    organizationId,
                },
                include: {
                    customers: true,
                },
            });

            if (!station) {
                throw new TRPCError({ 
                    code: "NOT_FOUND", 
                    message: "Station not found" 
                });
            }

            // Check if station has customers
            if (station.customers.length > 0) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "Cannot delete station with active customers. Please reassign or remove customers first." 
                });
            }

            await prisma.organizationStation.delete({
                where: { id },
            });

            await createActivity(organizationId, ctx.session.user.id!, `Deleted station "${station.name}"`);

            return {
                success: true,
                message: "Station deleted successfully",
            };
        }),

    getStationCustomers: protectedProcedure
        .input(z.object({
            stationId: z.string().min(1, "Station ID is required"),
            organizationId: z.string().min(1, "Organization ID is required"),
        }))
        .query(async ({ input }) => {
            const canView = await hasPermissions(input.organizationId, [OrganizationPermission.VIEW_STATIONS]);
            if (!canView) {
                throw new TRPCError({ 
                    code: "FORBIDDEN", 
                    message: "You are not authorized to view station customers" 
                });
            }

            const customers = await prisma.organizationCustomer.findMany({
                where: {
                    stationId: input.stationId,
                    organizationId: input.organizationId,
                },
                include: {
                    package: true,
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
});

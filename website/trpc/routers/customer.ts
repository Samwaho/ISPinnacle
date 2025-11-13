import { createTRPCRouter, protectedProcedure, baseProcedure } from "../init";
import {
  createCustomerSchema,
  updateCustomerSchema,
  deleteCustomerSchema,
  createPaymentLinkSchema,
  getPaymentLinkSchema,
  processPaymentLinkSchema,
} from "@/schemas";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { OrganizationPermission } from "@/lib/generated/prisma";
import { createActivity, hasPermissions } from "@/lib/server-hooks";
import crypto from "crypto";
import { SmsService } from "@/lib/sms";

export const customerRouter = createTRPCRouter({
  getCustomerConnection: protectedProcedure
    .input(
      z.object({
        customerId: z.string().min(1, "Customer ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.VIEW_CUSTOMERS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view customers in this organization",
        });
      }

      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          id: input.customerId,
          organizationId: input.organizationId,
        },
        select: { id: true },
      });

      if (!customer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
      }

      const existing = await prisma.organizationCustomerConnection.findUnique({
        where: { customerId: input.customerId },
      });

      if (existing) return existing;

      const created = await prisma.organizationCustomerConnection.create({
        data: { customerId: input.customerId },
      });

      return created;
    }),
  getCustomers: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.VIEW_CUSTOMERS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to view customers in this organization",
        });
      }

      const customers = await prisma.organizationCustomer.findMany({
        where: {
          organizationId: input.organizationId,
        },
        include: {
          station: true,
          package: true,
          payments: {
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const customerIds = customers.map((c) => c.id);
      const connections = await prisma.organizationCustomerConnection.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, sessionStatus: true },
      });
      const connectionByCustomerId = new Map(connections.map((c) => [c.customerId, c]));

      return customers.map((customer) => ({
        ...customer,
        paymentCount: customer.payments.length,
        lastPayment: customer.payments[0] || null,
        connectionStatus: connectionByCustomerId.get(customer.id)?.sessionStatus ?? null,
      }));
    }),

  getCustomerById: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Customer ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.VIEW_CUSTOMERS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view this customer",
        });
      }

      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
        include: {
          station: true,
          package: true,
          payments: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      return customer;
    }),

  createCustomer: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [
        OrganizationPermission.MANAGE_CUSTOMERS,
      ]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to create customers in this organization",
        });
      }

      // Check if customer with same email already exists in the organization
      if (input.email) {
        const existingCustomer = await prisma.organizationCustomer.findFirst({
          where: {
            email: input.email,
            organizationId: input.organizationId,
          },
        });

        if (existingCustomer) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A customer with this email already exists in this organization",
          });
        }
      }

      // Validate station if provided
      if (input.stationId) {
        const station = await prisma.organizationStation.findFirst({
          where: {
            id: input.stationId,
            organizationId: input.organizationId,
          },
        });

        if (!station) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Station not found",
          });
        }
      }

      // Validate package if provided
      if (input.packageId) {
        const pkg = await prisma.organizationPackage.findFirst({
          where: {
            id: input.packageId,
            organizationId: input.organizationId,
            isActive: true,
          },
        });

        if (!pkg) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Package not found or not active",
          });
        }
      }

      // Convert undefined values to null for database
      const createData = {
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        expiryDate: input.expiryDate,
        pppoeUsername: input.pppoeUsername,
        pppoePassword: input.pppoePassword,
        hotspotUsername: input.hotspotUsername,
        hotspotPassword: input.hotspotPassword,
        status: input.status,
        stationId: input.stationId === undefined ? null : input.stationId,
        packageId: input.packageId === undefined ? null : input.packageId,
        organizationId: input.organizationId,
      };

      const customer = await prisma.organizationCustomer.create({
        data: createData,
        include: {
          station: true,
          package: true,
          organization: true,
        },
      });

      await SmsService.sendWelcomeMessage(  
        input.organizationId,
        customer.phone,
        customer.name,
        customer.pppoeUsername!,
        customer.pppoePassword!,
        customer.organization.name,
        customer.organization.phone
      );

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Created new customer "${input.name}"`
      );

      return {
        success: true,
        message: "Customer created successfully",
        customer,
      };
    }),

  updateCustomer: protectedProcedure
    .input(updateCustomerSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, organizationId, ...data } = input;

      const canManage = await hasPermissions(organizationId, [
        OrganizationPermission.MANAGE_CUSTOMERS,
      ]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to update customers in this organization",
        });
      }

      // Check if customer exists
      const existingCustomer = await prisma.organizationCustomer.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!existingCustomer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Check if new email conflicts with another customer
      if (data.email && data.email !== existingCustomer.email) {
        const emailConflict = await prisma.organizationCustomer.findFirst({
          where: {
            email: data.email,
            organizationId,
            id: { not: id },
          },
        });

        if (emailConflict) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "A customer with this email already exists in this organization",
          });
        }
      }

      // Validate station if provided
      if (data.stationId && data.stationId !== existingCustomer.stationId) {
        const station = await prisma.organizationStation.findFirst({
          where: {
            id: data.stationId,
            organizationId,
          },
        });

        if (!station) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Station not found",
          });
        }
      }

      // Validate package if provided
      if (data.packageId && data.packageId !== existingCustomer.packageId) {
        const pkg = await prisma.organizationPackage.findFirst({
          where: {
            id: data.packageId,
            organizationId,
            isActive: true,
          },
        });

        if (!pkg) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Package not found or not active",
          });
        }
      }

      // Convert undefined values to null for database
      const updateData = {
        ...data,
        stationId: data.stationId === undefined ? null : data.stationId,
        packageId: data.packageId === undefined ? null : data.packageId,
      };

      const customer = await prisma.organizationCustomer.update({
        where: { id },
        data: updateData,
        include: {
          station: true,
          package: true,
        },
      });

      // Create detailed activity message
      const changes = [];
      if (data.name && data.name !== existingCustomer.name)
        changes.push(`name from "${existingCustomer.name}" to "${data.name}"`);
      if (data.email !== existingCustomer.email) changes.push(`email`);
      if (data.phone !== existingCustomer.phone) changes.push(`phone`);
      if (data.address !== existingCustomer.address) changes.push(`address`);
      if (data.expiryDate !== existingCustomer.expiryDate)
        changes.push(`expiry date`);
      if (data.pppoeUsername !== existingCustomer.pppoeUsername)
        changes.push(`PPPoE username`);
      if (data.hotspotUsername !== existingCustomer.hotspotUsername)
        changes.push(`hotspot username`);
      if (data.status && data.status !== existingCustomer.status)
        changes.push(
          `status from "${existingCustomer.status}" to "${data.status}"`
        );
      if (data.stationId !== existingCustomer.stationId)
        changes.push(`station assignment`);
      if (data.packageId !== existingCustomer.packageId)
        changes.push(`package assignment`);

      const activityMessage =
        changes.length > 0
          ? `Updated customer "${existingCustomer.name}": ${changes.join(", ")}`
          : `Updated customer "${existingCustomer.name}" settings`;

      await createActivity(
        organizationId,
        ctx.session.user.id!,
        activityMessage
      );

      return {
        success: true,
        message: "Customer updated successfully",
        customer,
      };
    }),

  deleteCustomer: protectedProcedure
    .input(deleteCustomerSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, organizationId } = input;

      const canManage = await hasPermissions(organizationId, [
        OrganizationPermission.MANAGE_CUSTOMERS,
      ]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to delete customers in this organization",
        });
      }

      // Check if customer exists and get its details
      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          id,
          organizationId,
        },
        include: {
          payments: true,
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Check if customer has payments
      if (customer.payments.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Cannot delete customer with payment history. Please archive the customer instead.",
        });
      }

      await prisma.organizationCustomer.delete({
        where: { id },
      });

      await createActivity(
        organizationId,
        ctx.session.user.id!,
        `Deleted customer "${customer.name}"`
      );

      return {
        success: true,
        message: "Customer deleted successfully",
      };
    }),

  getCustomerPayments: protectedProcedure
    .input(
      z.object({
        customerId: z.string().min(1, "Customer ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.VIEW_CUSTOMERS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not authorized to view customer payments",
        });
      }

      const payments = await prisma.organizationCustomerPayment.findMany({
        where: {
          customerId: input.customerId,
          organizationId: input.organizationId,
        },
        include: {
          package: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return payments;
    }),

  toggleCustomerStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Customer ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [
        OrganizationPermission.MANAGE_CUSTOMERS,
      ]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to manage customers in this organization",
        });
      }

      // Check if customer exists
      const existingCustomer = await prisma.organizationCustomer.findFirst({
        where: {
          id: input.id,
          organizationId: input.organizationId,
        },
      });

      if (!existingCustomer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Toggle between ACTIVE and INACTIVE
      const newStatus =
        existingCustomer.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const customer = await prisma.organizationCustomer.update({
        where: { id: input.id },
        data: { status: newStatus },
      });

      const statusText = newStatus === "ACTIVE" ? "activated" : "deactivated";
      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `${
          statusText.charAt(0).toUpperCase() + statusText.slice(1)
        } customer "${existingCustomer.name}"`
      );

      return {
        success: true,
        message: `Customer ${statusText} successfully`,
        customer,
      };
    }),

  getCustomersByStation: protectedProcedure
    .input(
      z.object({
        stationId: z.string().min(1, "Station ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.VIEW_CUSTOMERS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to view customers in this organization",
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
              createdAt: "desc",
            },
            take: 5,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const customerIds = customers.map((c) => c.id);
      const connections = await prisma.organizationCustomerConnection.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, sessionStatus: true },
      });
      const connectionByCustomerId = new Map(connections.map((c) => [c.customerId, c]));

      return customers.map((customer) => ({
        ...customer,
        paymentCount: customer.payments.length,
        lastPayment: customer.payments[0] || null,
        connectionStatus: connectionByCustomerId.get(customer.id)?.sessionStatus ?? null,
      }));
    }),

  getCustomersByPackage: protectedProcedure
    .input(
      z.object({
        packageId: z.string().min(1, "Package ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      const canView = await hasPermissions(input.organizationId, [
        OrganizationPermission.VIEW_CUSTOMERS,
      ]);
      if (!canView) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to view customers in this organization",
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
              createdAt: "desc",
            },
            take: 5,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const customerIds = customers.map((c) => c.id);
      const connections = await prisma.organizationCustomerConnection.findMany({
        where: { customerId: { in: customerIds } },
        select: { customerId: true, sessionStatus: true },
      });
      const connectionByCustomerId = new Map(connections.map((c) => [c.customerId, c]));

      return customers.map((customer) => ({
        ...customer,
        paymentCount: customer.payments.length,
        lastPayment: customer.payments[0] || null,
        connectionStatus: connectionByCustomerId.get(customer.id)?.sessionStatus ?? null,
      }));
    }),

  // Create payment link for a customer
  createPaymentLink: protectedProcedure
    .input(createPaymentLinkSchema)
    .mutation(async ({ input, ctx }) => {
      const canManage = await hasPermissions(input.organizationId, [
        OrganizationPermission.MANAGE_CUSTOMERS,
      ]);
      if (!canManage) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You are not authorized to create payment links for customers in this organization",
        });
      }

      // Verify customer exists and belongs to the organization
      const customer = await prisma.organizationCustomer.findFirst({
        where: {
          id: input.customerId,
          organizationId: input.organizationId,
        },
      });

      if (!customer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Customer not found",
        });
      }

      // Generate unique token
      const token = crypto.randomBytes(32).toString("hex");

      // Create payment link
      const paymentLink = await prisma.mpesaPaymentLink.create({
        data: {
          token,
          organizationId: input.organizationId,
          customerId: input.customerId,
          amount: input.amount,
          description: input.description,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              pppoeUsername: true,
              hotspotUsername: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Created payment link for customer "${customer.name}" - ${input.amount} KES`
      );

      return {
        success: true,
        message: "Payment link created successfully",
        paymentLink: {
          id: paymentLink.id,
          token: paymentLink.token,
          amount: paymentLink.amount,
          description: paymentLink.description,
          customer: {
            name: paymentLink.customer.name,
            email: paymentLink.customer.email,
            phone: paymentLink.customer.phone,
          },
          organization: {
            name: paymentLink.organization.name,
          },
          createdAt: paymentLink.createdAt,
        },
      };
    }),

  // Get payment link details (public endpoint)
  getPaymentLink: baseProcedure
    .input(getPaymentLinkSchema)
    .query(async ({ input }) => {
      const paymentLink = await prisma.mpesaPaymentLink.findUnique({
        where: { token: input.token },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              pppoeUsername: true,
              hotspotUsername: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      });

      if (!paymentLink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment link not found or has expired",
        });
      }

      if (paymentLink.isUsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This payment link has already been used",
        });
      }

      return {
        success: true,
        paymentLink: {
          id: paymentLink.id,
          token: paymentLink.token,
          amount: paymentLink.amount,
          description: paymentLink.description,
          customer: {
            name: paymentLink.customer.name,
            email: paymentLink.customer.email,
            phone: paymentLink.customer.phone,
          },
          organization: {
            name: paymentLink.organization.name,
            logo: paymentLink.organization.logo,
          },
          createdAt: paymentLink.createdAt,
        },
      };
    }),

  // Process payment link with phone number
  processPaymentLink: baseProcedure
    .input(processPaymentLinkSchema)
    .mutation(async ({ input }) => {
      const paymentLink = await prisma.mpesaPaymentLink.findUnique({
        where: { token: input.token },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              pppoeUsername: true,
              hotspotUsername: true,
            },
          },
          organization: {
            include: {
              mpesaConfiguration: true,
              kopokopoConfiguration: true,
            },
          },
        },
      });

      if (!paymentLink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Payment link not found or has expired",
        });
      }

      if (paymentLink.isUsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This payment link has already been used",
        });
      }

      // Use customer username as reference if available, otherwise use token
      const reference =
        paymentLink.customer.pppoeUsername ||
        paymentLink.customer.hotspotUsername ||
        `PAY-${paymentLink.token}`;

      const gateway = paymentLink.organization.paymentGateway || "MPESA";

      try {
        if (gateway === "MPESA") {
          if (!paymentLink.organization.mpesaConfiguration) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "M-Pesa is not configured for this organization",
            });
          }

          const { MpesaAPI } = await import("./mpesa");
          const mpesaAPI = new MpesaAPI({
            consumerKey: paymentLink.organization.mpesaConfiguration.consumerKey,
            consumerSecret: paymentLink.organization.mpesaConfiguration.consumerSecret,
            shortCode: paymentLink.organization.mpesaConfiguration.shortCode,
            partyB: paymentLink.organization.mpesaConfiguration.partyB || paymentLink.organization.mpesaConfiguration.shortCode,
            passKey: paymentLink.organization.mpesaConfiguration.passKey,
            transactionType: paymentLink.organization.mpesaConfiguration.transactionType,
          });

          const result = await mpesaAPI.initiateSTKPush(
            input.phoneNumber,
            paymentLink.amount,
            reference,
            paymentLink.description
          );

          await prisma.mpesaPaymentLink.update({
            where: { id: paymentLink.id },
            data: {
              isUsed: true,
              checkoutRequestId: result.CheckoutRequestID,
              merchantRequestId: result.MerchantRequestID,
            },
          });

          return {
            success: true,
            message: "Payment initiated successfully",
            checkoutRequestId: result.CheckoutRequestID,
            merchantRequestId: result.MerchantRequestID,
          };
        }

        if (gateway === "KOPOKOPO") {
          if (!paymentLink.organization.kopokopoConfiguration) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Kopo Kopo is not configured for this organization",
            });
          }

          const { KopoKopoAPI } = await import("./kopokopo");
          const k2 = new KopoKopoAPI({
            clientId: paymentLink.organization.kopokopoConfiguration.clientId,
            clientSecret: paymentLink.organization.kopokopoConfiguration.clientSecret,
            apiKey: paymentLink.organization.kopokopoConfiguration.apiKey,
            tillNumber: paymentLink.organization.kopokopoConfiguration.tillNumber,
          });

          const result = await k2.initiateIncomingPayment({
            phoneNumber: input.phoneNumber,
            amount: paymentLink.amount,
            reference,
            description: paymentLink.description,
          });

          await prisma.mpesaPaymentLink.update({
            where: { id: paymentLink.id },
            data: {
              isUsed: true,
              checkoutRequestId: null,
              merchantRequestId: result.location || null,
            },
          });

          return {
            success: true,
            message: "Payment initiated successfully",
            location: result.location,
          };
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unsupported or undefined payment gateway",
        });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to initiate payment: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),
});

import { createTRPCRouter, protectedProcedure } from "../init";
import { createDeviceSchema, deleteDeviceSchema, updateDeviceSchema } from "@/schemas";
import { prisma } from "@/lib/db";
import { allocateNextVpnIp, DEFAULT_DEVICE_VPN_MASK } from "@/lib/network";
import { generatePresharedKey } from "@/lib/wireguard";
import { createActivity, hasPermissions } from "@/lib/server-hooks";
import {
  OrganizationDeviceStatus,
  OrganizationPermission,
  type OrganizationDevice,
} from "@/lib/generated/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Prisma } from "@/lib/generated/prisma";
import { RouterOsApi, type RouterOsQueryName } from "@/lib/routeros-api";
import {
  registerDeviceOnCentralVpn,
  removeDeviceFromCentralVpn,
} from "@/lib/vpn-provisioner";

const sanitizeDevice = (device: OrganizationDevice) => {
  const { routerOsPassword, wireguardPrivateKey, wireguardPresharedKey, ...rest } = device;
  return rest;
};

const pruneUndefined = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as T;

const routerQueryValues = [...RouterOsApi.supportedQueries] as [
  RouterOsQueryName,
  ...RouterOsQueryName[],
];
const routerQueryEnum = z.enum(routerQueryValues);

const ensureViewPermission = async (organizationId: string) => {
  const canView = await hasPermissions(organizationId, [
    OrganizationPermission.MANAGE_DEVICES,
    OrganizationPermission.VIEW_DEVICES,
  ]);
  if (!canView) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to view devices in this organization",
    });
  }
};

const ensureManagePermission = async (organizationId: string) => {
  const canManage = await hasPermissions(organizationId, [OrganizationPermission.MANAGE_DEVICES]);
  if (!canManage) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not authorized to manage devices in this organization",
    });
  }
};

export const devicesRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      await ensureViewPermission(input.organizationId);

      const devices = await prisma.organizationDevice.findMany({
        where: { organizationId: input.organizationId },
        orderBy: { createdAt: "desc" },
      });

      return devices.map(sanitizeDevice);
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Device ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      await ensureViewPermission(input.organizationId);

      const device = await prisma.organizationDevice.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      return sanitizeDevice(device);
    }),

  secrets: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Device ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
      })
    )
    .query(async ({ input }) => {
      await ensureManagePermission(input.organizationId);

      const device = await prisma.organizationDevice.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      return device;
    }),

  create: protectedProcedure
    .input(createDeviceSchema)
    .mutation(async ({ input, ctx }) => {
      await ensureManagePermission(input.organizationId);

      const {
        routerOsPassword,
        metadata,
        wireguardListenPort,
        wireguardPublicKey,
        ...rest
      } = input;
      const basePayload = pruneUndefined(rest);
      const listenPort = wireguardListenPort ?? 51820;
      const metadataPayload =
        metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {};

      const device = await prisma.$transaction(async (tx) => {
        let vpnIpAddress: string;
        try {
          vpnIpAddress = await allocateNextVpnIp(input.organizationId, tx);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              error instanceof Error
                ? error.message
                : "Unable to allocate a VPN IP address for this organization",
            cause: error,
          });
        }
        const presharedKey = generatePresharedKey();

        return tx.organizationDevice.create({
          data: {
            ...basePayload,
            ...metadataPayload,
            routerOsPassword,
            vpnIpAddress,
            vpnCidr: DEFAULT_DEVICE_VPN_MASK,
            routerOsHost: vpnIpAddress,
            wireguardPublicKey: wireguardPublicKey?.trim() ?? null,
            wireguardPrivateKey: null,
            wireguardPresharedKey: presharedKey,
            wireguardListenPort: listenPort,
          },
        });
      });

      if (device.wireguardPublicKey) {
        try {
          await registerDeviceOnCentralVpn(device);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to provision device on central VPN",
            cause: error,
          });
        }
      }

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Added device "${device.name}" with VPN IP ${device.vpnIpAddress}`
      );

      return {
        success: true,
        message: "Device created successfully",
        device: sanitizeDevice(device),
        setup: {
          deviceId: device.id,
          vpnIpAddress: device.vpnIpAddress,
          wireguardPresharedKey: device.wireguardPresharedKey,
          wireguardListenPort: device.wireguardListenPort,
        },
      };
    }),

  update: protectedProcedure
    .input(updateDeviceSchema)
    .mutation(async ({ input, ctx }) => {
      await ensureManagePermission(input.organizationId);

      const {
        id,
        organizationId,
        routerOsPassword,
        metadata,
        wireguardListenPort,
        ...rest
      } = input;
      const payload = pruneUndefined(rest);
      const metadataPayload =
        metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {};

      const existing = await prisma.organizationDevice.findFirst({
        where: { id, organizationId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      const updated = await prisma.organizationDevice.update({
        where: { id },
        data: {
          ...payload,
          ...metadataPayload,
          ...(wireguardListenPort !== undefined ? { wireguardListenPort } : {}),
          ...(routerOsPassword ? { routerOsPassword } : {}),
        },
      });

      await createActivity(
        organizationId,
        ctx.session.user.id!,
        `Updated device "${updated.name}"`
      );

      return {
        success: true,
        message: "Device updated successfully",
        device: sanitizeDevice(updated),
      };
    }),

  delete: protectedProcedure
    .input(deleteDeviceSchema)
    .mutation(async ({ input, ctx }) => {
      await ensureManagePermission(input.organizationId);

      const device = await prisma.organizationDevice.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      if (device.wireguardPublicKey) {
        try {
          await removeDeviceFromCentralVpn(device);
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to remove device from central VPN",
            cause: error,
          });
        }
      }

      await prisma.organizationDevice.delete({
        where: { id: device.id },
      });

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Removed device "${device.name}"`
      );

      return {
        success: true,
        message: "Device deleted successfully",
      };
    }),

  submitPublicKey: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Device ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
        wireguardPublicKey: z
          .string()
          .trim()
          .min(40, "WireGuard public key is required")
          .max(60, "WireGuard public key looks invalid"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await ensureManagePermission(input.organizationId);

      const device = await prisma.organizationDevice.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      const publicKey = input.wireguardPublicKey.trim();

      const updated = await prisma.organizationDevice.update({
        where: { id: device.id },
        data: {
          wireguardPublicKey: publicKey,
        },
      });

      try {
        await registerDeviceOnCentralVpn(updated);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to provision WireGuard peer on central VPN",
          cause: error,
        });
      }

      await createActivity(
        input.organizationId,
        ctx.session.user.id!,
        `Provided WireGuard public key for "${updated.name}"`
      );

      return {
        success: true,
        device: sanitizeDevice(updated),
      };
    }),

  fetchStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1, "Device ID is required"),
        organizationId: z.string().min(1, "Organization ID is required"),
        queries: z.array(routerQueryEnum).default(routerQueryValues),
        rawCommands: z
          .array(
            z.object({
              command: z.string().min(1),
              args: z.array(z.string()).optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureViewPermission(input.organizationId);

      const device = await prisma.organizationDevice.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });

      if (!device) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found",
        });
      }

      try {
        const response = await RouterOsApi.queryDevice({
          deviceId: device.id,
          address: device.routerOsHost,
          username: device.routerOsUsername,
          password: device.routerOsPassword,
          port: device.routerOsPort,
          queries: input.queries as RouterOsQueryName[],
          rawCommands: input.rawCommands,
        });

        await prisma.organizationDevice.update({
          where: { id: device.id },
          data: {
            status: OrganizationDeviceStatus.ONLINE,
            lastSeenAt: new Date(),
            lastSyncAt: new Date(),
          },
        });

        return response;
      } catch (error) {
        await prisma.organizationDevice.update({
          where: { id: device.id },
          data: {
            status: OrganizationDeviceStatus.OFFLINE,
            lastSyncAt: new Date(),
          },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error
              ? error.message
              : "Unable to communicate with RouterOS device",
        });
      }
    }),
});

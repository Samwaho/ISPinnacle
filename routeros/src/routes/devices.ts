import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  ROUTEROS_QUERIES,
  type RouterOsQueryKey,
  executeRouterQueries,
  testRouterConnection,
} from "../routeros-client";

const ROUTER_QUERY_KEYS = Object.keys(ROUTEROS_QUERIES) as [RouterOsQueryKey, ...RouterOsQueryKey[]];
const routerQueryEnum = z.enum(ROUTER_QUERY_KEYS);

const rawCommandSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()).optional(),
});

const credentialsSchema = z.object({
  deviceId: z.string().min(1),
  address: z.string().min(1),
  port: z.number().int().positive().max(65535).optional(),
  username: z.string().min(1),
  password: z.string().min(1),
  useSsl: z.boolean().optional(),
  queries: z.array(routerQueryEnum).default(ROUTER_QUERY_KEYS),
  rawCommands: z.array(rawCommandSchema).optional(),
});

export const registerDeviceRoutes = async (app: FastifyInstance) => {
  app.post("/api/devices/query", async (request, reply) => {
    const payload = credentialsSchema.parse(request.body);
    request.log.info(
      {
        deviceId: payload.deviceId,
        address: payload.address,
        queries: payload.queries,
        rawCommandsCount: payload.rawCommands?.length ?? 0,
      },
      "Executing RouterOS queries",
    );

    try {
      const result = await executeRouterQueries(
        {
          address: payload.address,
          username: payload.username,
          password: payload.password,
          port: payload.port,
          useSsl: payload.useSsl,
        },
        payload.queries,
        payload.rawCommands,
      );

      reply.send({
        deviceId: payload.deviceId,
        ...result,
      });
    } catch (error) {
      request.log.error(
        {
          deviceId: payload.deviceId,
          address: payload.address,
          err: error,
        },
        "RouterOS query failed",
      );
      throw error;
    }
  });

  app.post("/api/devices/ping", async (request, reply) => {
    const payload = credentialsSchema.omit({ queries: true, rawCommands: true }).parse(request.body);
    request.log.info(
      {
        deviceId: payload.deviceId,
        address: payload.address,
      },
      "Pinging RouterOS device",
    );

    try {
      await testRouterConnection({
        address: payload.address,
        username: payload.username,
        password: payload.password,
        port: payload.port,
        useSsl: payload.useSsl,
      });
    } catch (error) {
      request.log.error(
        {
          deviceId: payload.deviceId,
          address: payload.address,
          err: error,
        },
        "RouterOS ping failed",
      );
      throw error;
    }

    reply.send({
      deviceId: payload.deviceId,
      reachable: true,
      checkedAt: new Date().toISOString(),
    });
  });
};

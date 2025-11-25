import type { FastifyInstance } from "fastify";
import type { RawData } from "ws";
import { z } from "zod";
import {
  ROUTEROS_QUERIES,
  type RouterOsQueryKey,
  executeRouterQueries,
  testRouterConnection,
} from "../routeros-client";
import { config } from "../config";

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

const streamHandshakeSchema = credentialsSchema.extend({
  intervalMs: z.number().int().positive().max(30000).optional(),
});

const deletePeerSchema = z.object({
  deviceId: z.string().min(1),
  address: z.string().min(1),
  port: z.number().int().positive().max(65535).optional(),
  username: z.string().min(1),
  password: z.string().min(1),
  useSsl: z.boolean().optional(),
  peerComment: z.string().min(1).optional(),
});

export const registerDeviceRoutes = async (app: FastifyInstance) => {
  app.get("/devices/:deviceId/stream", { websocket: true }, (connection, request) => {
    const params = request.params as { deviceId?: string } | undefined;
    const deviceId = params?.deviceId;
    const token = (request.query as Record<string, string | undefined> | undefined)?.token;
    if (config.apiKey && token !== config.apiKey) {
      request.log.warn(
        { path: request.url, method: request.method, deviceId, reason: "invalid_api_key" },
        "Unauthorized websocket request",
      );
      connection.socket.close(4401, "Unauthorized");
      return;
    }

    request.log.info(
      { path: request.url, deviceId },
      "WebSocket connected",
    );

    let closed = false;
    let timer: NodeJS.Timeout | null = null;
    const shutdown = (code = 1000, reason?: string) => {
      if (closed) return;
      closed = true;
      if (timer) clearInterval(timer);
      connection.socket.close(code, reason);
    };

    const handleMessage = async (data: RawData) => {
      if (closed) return;
      try {
        const payload = JSON.parse(data.toString());
        const creds = streamHandshakeSchema.parse(payload);
        const interval = creds.intervalMs ?? 5000;

        const runQuery = async () => {
          try {
            const result = await executeRouterQueries(
              {
                address: creds.address,
                username: creds.username,
                password: creds.password,
                port: creds.port,
                useSsl: creds.useSsl,
              },
              creds.queries,
              creds.rawCommands,
            );
            connection.socket.send(
              JSON.stringify({
                type: "data",
                deviceId: creds.deviceId,
                results: {
                  deviceId: creds.deviceId,
                  ...result,
                },
              }),
            );
          } catch (error) {
            request.log.error(
              { deviceId: creds.deviceId, address: creds.address, err: error },
              "RouterOS stream query failed",
            );
            connection.socket.send(
              JSON.stringify({
                type: "error",
                message: error instanceof Error ? error.message : "RouterOS stream error",
              }),
            );
          }
        };

        await runQuery();
        timer = setInterval(runQuery, interval);
        connection.socket.send(JSON.stringify({ type: "ready", intervalMs: interval }));
        connection.socket.off("message", handleMessage);
      } catch (err) {
        connection.socket.send(
          JSON.stringify({
            type: "error",
            message: err instanceof Error ? err.message : "Invalid stream payload",
          }),
        );
      }
    };

    connection.socket.on("message", handleMessage);
    connection.socket.on("close", () => {
      shutdown();
    });
    connection.socket.on("error", () => {
      shutdown(1011, "stream error");
    });
  });

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

  app.post("/api/devices/remove-peer", async (request, reply) => {
    const payload = deletePeerSchema.parse(request.body);
    const comment = payload.peerComment?.trim() || payload.deviceId;
    request.log.info(
      {
        deviceId: payload.deviceId,
        address: payload.address,
        comment,
      },
      "Removing RouterOS WireGuard peer",
    );

    try {
      const lookup = await executeRouterQueries(
        {
          address: payload.address,
          username: payload.username,
          password: payload.password,
          port: payload.port,
          useSsl: payload.useSsl,
        },
        [],
        [
          {
            command: "/interface/wireguard/peers/print",
            args: [`?comment=${comment}`],
          },
        ],
      );

      const peerRows = lookup.rawResults?.[0]?.result;
      const peerIds = Array.isArray(peerRows)
        ? (peerRows as Record<string, unknown>[])
            .map((row) => row?.[".id"])
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        : [];

      if (peerIds.length === 0) {
        request.log.info(
          { deviceId: payload.deviceId, comment },
          "No WireGuard peer found; skipping removal",
        );
        reply.send({ deviceId: payload.deviceId, removed: 0 });
        return;
      }

      const removalCommands = peerIds.map((peerId) => ({
        command: "/interface/wireguard/peers/remove",
        args: [`=numbers=${peerId}`],
      }));

      await executeRouterQueries(
        {
          address: payload.address,
          username: payload.username,
          password: payload.password,
          port: payload.port,
          useSsl: payload.useSsl,
        },
        [],
        removalCommands,
      );

      reply.send({ deviceId: payload.deviceId, removed: peerIds.length });
    } catch (error) {
      request.log.error(
        {
          deviceId: payload.deviceId,
          address: payload.address,
          err: error,
        },
        "Failed to remove WireGuard peer",
      );
      throw error;
    }
  });
};

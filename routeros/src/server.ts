import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { config } from "./config";
import { registerDeviceRoutes } from "./routes/devices";

const buildServer = () => {
  const logRequests = process.env.LOG_REQUESTS === "true";
  const logWsDebug = process.env.LOG_WS_DEBUG === "true";
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport: process.env.LOG_PRETTY === "true" ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: true,
        },
      } : undefined,
    },
    disableRequestLogging: !logRequests,
  });

  app.register(cors, {
    origin: config.allowedOrigins ?? true,
  });
  app.register(websocket);

  app.addHook("onRequest", (request, reply, done) => {
    if (!config.apiKey) {
      return done();
    }

    const headerKey = request.headers["x-api-key"];
    const tokenParam = request.query && typeof request.query === "object" ? (request.query as Record<string, string | undefined>)["token"] : undefined;
    const apiKey = headerKey ?? tokenParam;

    if (apiKey !== config.apiKey) {
      request.log.warn(
        {
          path: request.url,
          method: request.method,
          reason: "invalid_api_key",
          hasHeader: Boolean(headerKey),
          hasToken: Boolean(tokenParam),
        },
        "Unauthorized request"
      );
      reply.code(401).send({ error: "Unauthorized" });
      return;
    }

    done();
  });

  app.addHook("onRequest", (request, _, done) => {
    if (logWsDebug && (request.headers["upgrade"]?.toString().toLowerCase() === "websocket")) {
      request.log.info(
        {
          path: request.url,
          origin: request.headers.origin,
          connection: request.headers.connection,
          upgrade: request.headers.upgrade,
          query: request.query,
        },
        "WebSocket handshake attempt",
      );
    }
    done();
  });

  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.register(registerDeviceRoutes);

  return app;
};

const start = async () => {
  const app = buildServer();
  try {
    await app.listen({ port: config.port, host: "0.0.0.0" });
    app.log.info(`RouterOS API listening on port ${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();

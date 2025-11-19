import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config";
import { registerDeviceRoutes } from "./routes/devices";

const buildServer = () => {
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
  });

  app.register(cors, {
    origin: config.allowedOrigins ?? true,
  });

  app.addHook("onRequest", (request, reply, done) => {
    if (!config.apiKey) {
      return done();
    }

    const apiKey = request.headers["x-api-key"];

    if (apiKey !== config.apiKey) {
      reply.code(401).send({ error: "Unauthorized" });
      return;
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

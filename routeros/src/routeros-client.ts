import { RouterOSAPI } from "node-routeros";
import { config } from "./config";
// node-routeros throws on `!empty` replies via Channel.onUnknown; patch to swallow.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Channel } = require("node-routeros/dist/Channel");
  if (Channel && Channel.prototype && !Channel.prototype.__patchedIgnoreUnknown) {
    const originalOnUnknown = Channel.prototype.onUnknown;
    Channel.prototype.onUnknown = function onUnknownPatched(reply: unknown) {
      console.warn("[routeros-client] ignoring unknown/empty reply", { reply });
      // emit an event so awaiting promises can resolve gracefully
      this.emit("unknown", reply);
    };
    Channel.prototype.__patchedIgnoreUnknown = true;
    Channel.prototype._originalOnUnknown = originalOnUnknown;
  }
} catch (err) {
  console.warn("[routeros-client] failed to patch Channel.onUnknown", { err });
}

export const ROUTEROS_QUERIES = {
  systemResources: "/system/resource/print",
  interfaces: "/interface/print",
  wireguardInterfaces: "/interface/wireguard/print",
  pppActive: "/ppp/active/print",
  hotspotActive: "/ip/hotspot/active/print",
} as const;

export type RouterOsQueryKey = keyof typeof ROUTEROS_QUERIES;

export type RouterCredentials = {
  address: string;
  username: string;
  password: string;
  port?: number;
  useSsl?: boolean;
};

export type RouterOsQueryResult = {
  executedAt: string;
  results: Record<string, unknown>;
  rawResults: { command: string; result: unknown }[];
};

export type RouterOsRawCommand = {
  command: string;
  args?: string[];
};

const createClient = (credentials: RouterCredentials) =>
  new RouterOSAPI({
    host: credentials.address,
    user: credentials.username,
    password: credentials.password,
    port: credentials.port ?? 8728,
    timeout: config.requestTimeoutMs,
    keepalive: false,
    tls: credentials.useSsl ? {} : undefined,
  });

// Some RouterOS versions respond with `!empty` which node-routeros treats as an
// unknown reply and throws. Treat that as "no rows" instead of failing the stream.
const safeWrite = async (client: RouterOSAPI, command: string, args: string[] = []) => {
  try {
    return await client.write(command, args);
  } catch (err) {
    const message = (err as { message?: string }).message ?? "";
    const errno = (err as { errno?: string }).errno;
    const isUnknownEmpty =
      errno === "UNKNOWNREPLY" ||
      message.includes("UNKNOWNREPLY") ||
      message.includes("!empty") ||
      message.includes("unknown reply");
    if (isUnknownEmpty) {
      console.warn("[routeros-client] ignoring empty reply", { command });
      return [];
    }
    throw err;
  }
};

export const executeRouterQueries = async (
  credentials: RouterCredentials,
  queryKeys: RouterOsQueryKey[],
  rawCommands: RouterOsRawCommand[] = []
): Promise<RouterOsQueryResult> => {
  console.log("[routeros-client] connecting", {
    host: credentials.address,
    port: credentials.port ?? 8728,
    queries: queryKeys,
    rawCommandsCount: rawCommands.length,
  });
  const client = createClient(credentials);
  await client.connect();

  try {
    const results: Record<string, unknown> = {};
    for (const key of queryKeys) {
      const command = ROUTEROS_QUERIES[key];
      results[key] = await safeWrite(client, command);
    }

    const rawResults = [];
    for (const command of rawCommands) {
      const result = await safeWrite(client, command.command, command.args ?? []);
      rawResults.push({
        command: command.command,
        result,
      });
    }

    const result = {
      executedAt: new Date().toISOString(),
      results,
      rawResults,
    };
    console.log("[routeros-client] completed queries", {
      host: credentials.address,
      port: credentials.port ?? 8728,
      queryCount: queryKeys.length,
    });
    return result;
  } finally {
    await client.close().catch(() => undefined);
  }
};

export const testRouterConnection = async (credentials: RouterCredentials) => {
  await executeRouterQueries(credentials, ["systemResources"]);
};

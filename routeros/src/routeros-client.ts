import { RouterOSAPI } from "node-routeros";
import { config } from "./config";

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
    const isUnknownEmpty =
      (err as { errno?: string; message?: string }).errno === "UNKNOWNREPLY" ||
      (err as { message?: string }).message?.includes("UNKNOWNREPLY");
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

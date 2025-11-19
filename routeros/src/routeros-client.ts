import { RouterOSAPI } from "node-routeros";
import { config } from "./config";

export const ROUTEROS_QUERIES = {
  systemResources: "/system/resource/print",
  interfaces: "/interface/print",
  wireguardInterfaces: "/interface/wireguard/print",
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
      results[key] = await client.write(command);
    }

    const rawResults = [];
    for (const command of rawCommands) {
      const result = await client.write(command.command, command.args ?? []);
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

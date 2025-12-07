import MikroNode from "mikronode-ng2";
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

type MikroConnection = ReturnType<typeof MikroNode.getConnection>;

const createConnection = (credentials: RouterCredentials) =>
  MikroNode.getConnection(credentials.address, credentials.username, credentials.password, {
    port: credentials.port ?? 8728,
    timeout: Math.max(1, Math.ceil(config.requestTimeoutMs / 1000)), // mikronode expects seconds
    closeOnDone: false,
    closeOnTimeout: true,
    tls: credentials.useSsl ? {} : false,
  });

const runCommand = async (connection: MikroConnection, command: string, args: string[] = []) => {
  // getCommandPromise parses replies into arrays of objects automatically.
  const parameters = args.length > 0 ? args : undefined;
  return connection.getCommandPromise(command, parameters, { closeOnDone: true });
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
  const connection = createConnection(credentials);
  const session = await connection.getConnectPromise();

  try {
    const results: Record<string, unknown> = {};
    for (const key of queryKeys) {
      const command = ROUTEROS_QUERIES[key];
      results[key] = await runCommand(session, command);
    }

    const rawResults = [];
    for (const command of rawCommands) {
      const result = await runCommand(session, command.command, command.args ?? []);
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
    try {
      session.close();
    } catch {
      /* noop */
    }
  }
};

export const testRouterConnection = async (credentials: RouterCredentials) => {
  await executeRouterQueries(credentials, ["systemResources"]);
};

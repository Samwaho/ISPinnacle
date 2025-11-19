const QUERY_KEYS = ["systemResources", "interfaces", "wireguardInterfaces"] as const;

export type RouterOsQueryName = typeof QUERY_KEYS[number];

export type RouterOsQueryResponse = {
  deviceId: string;
  executedAt: string;
  results: Record<string, unknown>;
  rawResults: { command: string; result: unknown }[];
};

export type RouterOsRawCommand = {
  command: string;
  args?: string[];
};

type DeviceQueryRequest = {
  deviceId: string;
  address: string;
  username: string;
  password: string;
  port?: number;
  useSsl?: boolean;
  queries: RouterOsQueryName[];
  rawCommands?: RouterOsRawCommand[];
};

const baseUrl = process.env.ROUTEROS_API_BASE_URL;
const apiKey = process.env.ROUTEROS_API_KEY;

const assertConfig = () => {
  if (!baseUrl) {
    throw new Error("ROUTEROS_API_BASE_URL is not configured");
  }

  if (!apiKey) {
    throw new Error("ROUTEROS_API_KEY is not configured");
  }
};

export const RouterOsApi = {
  supportedQueries: QUERY_KEYS,
  async queryDevice(payload: DeviceQueryRequest): Promise<RouterOsQueryResponse> {
    assertConfig();

    const response = await fetch(`${baseUrl}/api/devices/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey!,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `RouterOS API request failed with status ${response.status}: ${errorBody}`
      );
    }

    return (await response.json()) as RouterOsQueryResponse;
  },
};

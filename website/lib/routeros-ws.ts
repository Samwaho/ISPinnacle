export const getDeviceWebSocketUrl = (deviceId: string) => {
  const base = process.env.NEXT_PUBLIC_ROUTEROS_WS_URL;
  if (!base) return null;
  const token = process.env.NEXT_PUBLIC_ROUTEROS_WS_TOKEN;

  const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
  const initial = new URL(`${normalized}/devices/${deviceId}/stream`);
  // If someone provides http/https, upgrade to ws/wss so browsers can connect.
  if (initial.protocol === "http:") initial.protocol = "ws:";
  if (initial.protocol === "https:") initial.protocol = "wss:";

  if (token) {
    initial.searchParams.set("token", token);
  }

  return initial.toString();
};

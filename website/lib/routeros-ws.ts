export const getDeviceWebSocketUrl = (deviceId: string) => {
  const rawBase = process.env.NEXT_PUBLIC_ROUTEROS_WS_URL?.trim();
  if (!rawBase) return null;
  const token = process.env.NEXT_PUBLIC_ROUTEROS_WS_TOKEN;

  let initial: URL;
  try {
    const normalized = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
    initial = new URL(`${normalized}/devices/${deviceId}/stream`);
  } catch (error) {
    console.warn("[routeros] invalid websocket base URL", { base: rawBase, error });
    return null;
  }

  // Upgrade to ws/wss for browsers; also force wss if the page is served over https to avoid mixed content.
  if (initial.protocol === "http:") initial.protocol = "ws:";
  if (initial.protocol === "https:") initial.protocol = "wss:";
  if (typeof window !== "undefined" && window.location.protocol === "https:" && initial.protocol === "ws:") {
    initial.protocol = "wss:";
  }

  if (token) {
    initial.searchParams.set("token", token);
  }

  return initial.toString();
};

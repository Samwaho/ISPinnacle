import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOrigins = (value: string | undefined) =>
  value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const config = {
  port: parseNumber(process.env.PORT, 4001),
  apiKey: process.env.ROUTEROS_API_KEY,
  allowedOrigins: normalizeOrigins(process.env.ROUTEROS_ALLOWED_ORIGINS),
  requestTimeoutMs: parseNumber(process.env.REQUEST_TIMEOUT_MS, 10000),
};

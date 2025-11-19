import type { Prisma, PrismaClient } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

export const VPN_NETWORK_CIDR = "10.20.0.0/16";
export const VPN_POOL_START = "10.20.0.10";
export const VPN_POOL_END = "10.20.255.254";
export const DEFAULT_DEVICE_VPN_MASK = 32;

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

const poolStartInt = ipToNumber(VPN_POOL_START);
const poolEndInt = ipToNumber(VPN_POOL_END);

export function ipToNumber(ip: string): number {
  const octets = ip.split(".").map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }

  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
}

export function numberToIp(value: number): string {
  if (value < 0 || value > 0xffffffff) {
    throw new Error(`Invalid IPv4 integer: ${value}`);
  }

  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

export function isIpInVpnPool(ip: string): boolean {
  try {
    const numericValue = ipToNumber(ip);
    return numericValue >= poolStartInt && numericValue <= poolEndInt;
  } catch {
    return false;
  }
}

export async function allocateNextVpnIp(db: PrismaDbClient = prisma): Promise<string> {
  const existingIps = await db.organizationDevice.findMany({
    select: { vpnIpAddress: true },
  });

  const usedNumbers = existingIps
    .map((device) => ipToNumber(device.vpnIpAddress))
    .sort((a, b) => a - b);

  let candidate = poolStartInt;

  for (const used of usedNumbers) {
    if (used < candidate) {
      continue;
    }

    if (used === candidate) {
      candidate += 1;
      if (candidate > poolEndInt) break;
      continue;
    }

    break;
  }

  if (candidate > poolEndInt) {
    throw new Error(`The shared VPN network ${VPN_NETWORK_CIDR} is fully allocated`);
  }

  return numberToIp(candidate);
}

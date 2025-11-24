import type { Prisma, PrismaClient } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

export const DEFAULT_VPN_NETWORK_CIDR = "10.20.0.0/16";
export const DEFAULT_VPN_HOST_OFFSET = 10;
export const DEFAULT_DEVICE_VPN_MASK = 32;

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

type SubnetRange = {
  cidr: string;
  start: number;
  end: number;
};

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

export const calculateSubnetRange = (
  cidr: string,
  preferredOffset: number = DEFAULT_VPN_HOST_OFFSET
): SubnetRange => {
  const [baseIp, prefixRaw] = cidr.split("/");
  const prefix = Number.parseInt(prefixRaw ?? "", 10);

  if (!baseIp || !Number.isInteger(prefix) || prefix < 1 || prefix > 32) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }

  const baseValue = ipToNumber(baseIp);
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const network = baseValue & mask;
  const hostCount = prefix === 32 ? 1 : 2 ** (32 - prefix);
  const broadcast = network + hostCount - 1;

  const firstUsable = network + 1;
  const end = broadcast - 1;

  if (end < firstUsable) {
    throw new Error(`Subnet ${cidr} is too small for allocations`);
  }

  const preferredStart = network + preferredOffset;
  const start = Math.min(Math.max(preferredStart, firstUsable), end);

  return {
    cidr: `${numberToIp(network)}/${prefix}`,
    start: start >>> 0,
    end: end >>> 0,
  };
};

export function isIpInVpnPool(ip: string, cidr: string = DEFAULT_VPN_NETWORK_CIDR): boolean {
  try {
    const range = calculateSubnetRange(cidr);
    const numericValue = ipToNumber(ip);
    return numericValue >= range.start && numericValue <= range.end;
  } catch {
    return false;
  }
}

export async function allocateNextVpnIp(
  organizationId: string,
  db: PrismaDbClient = prisma
): Promise<string> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { vpnSubnetCidr: true, name: true },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const subnetCidr = (organization.vpnSubnetCidr ?? DEFAULT_VPN_NETWORK_CIDR).trim();
  const subnetRange = calculateSubnetRange(subnetCidr);

  const existingIps = await db.organizationDevice.findMany({
    select: { vpnIpAddress: true },
  });

  const usedNumbers = existingIps
    .map((device) => ({
      value: ipToNumber(device.vpnIpAddress),
    }))
    .filter(({ value }) => value >= subnetRange.start && value <= subnetRange.end)
    .map(({ value }) => value)
    .sort((a, b) => a - b);

  let candidate = subnetRange.start;

  for (const used of usedNumbers) {
    if (used < candidate) {
      continue;
    }

    if (used === candidate) {
      candidate += 1;
      if (candidate > subnetRange.end) break;
      continue;
    }

    break;
  }

  if (candidate > subnetRange.end) {
    throw new Error(`The VPN subnet ${subnetRange.cidr} is fully allocated for this organization`);
  }

  return numberToIp(candidate);
}

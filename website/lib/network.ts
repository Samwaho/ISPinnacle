import type { Prisma, PrismaClient } from "@/lib/generated/prisma";
import { prisma } from "@/lib/db";

export const DEFAULT_VPN_NETWORK_CIDR = "10.20.0.0/16";
export const DEFAULT_VPN_HOST_OFFSET = 10;
export const DEFAULT_DEVICE_VPN_MASK = 32;
export const DEFAULT_ORG_SUBNET_PREFIX: number = 24;

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
    select: {
      vpnSubnetCidr: true,
      name: true,
      devices: { select: { vpnIpAddress: true }, take: 1 },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const deriveSubnetFromIp = (ip: string) => {
    const prefixMask = DEFAULT_ORG_SUBNET_PREFIX === 0
      ? 0
      : ((0xffffffff << (32 - DEFAULT_ORG_SUBNET_PREFIX)) >>> 0);
    const start = ipToNumber(ip) & prefixMask;
    return `${numberToIp(start)}/${DEFAULT_ORG_SUBNET_PREFIX}`;
  };

  const allocateOrgSubnetFromPool = async (): Promise<string> => {
    const [poolBaseIp, poolPrefixRaw] = DEFAULT_VPN_NETWORK_CIDR.split("/");
    const poolPrefix = Number.parseInt(poolPrefixRaw ?? "", 10);
    if (!poolBaseIp || !Number.isInteger(poolPrefix) || poolPrefix < 1 || poolPrefix > 32) {
      throw new Error("Invalid default VPN network CIDR");
    }
    if (poolPrefix > DEFAULT_ORG_SUBNET_PREFIX) {
      throw new Error("Default VPN pool is smaller than the per-organization subnet size");
    }

    const poolMask = poolPrefix === 0 ? 0 : ((0xffffffff << (32 - poolPrefix)) >>> 0);
    const poolStart = ipToNumber(poolBaseIp) & poolMask;
    const subnetSize = 2 ** (32 - DEFAULT_ORG_SUBNET_PREFIX);
    const maxSubnets = 2 ** (DEFAULT_ORG_SUBNET_PREFIX - poolPrefix);

    const usedSubnetStarts = new Set<number>();

    const organizations = await db.organization.findMany({
      select: { vpnSubnetCidr: true },
    });

    for (const org of organizations) {
      if (!org.vpnSubnetCidr) continue;
      const [cidrBase, cidrPrefixRaw] = org.vpnSubnetCidr.split("/");
      const cidrPrefix = Number.parseInt(cidrPrefixRaw ?? "", 10);
      if (!cidrBase || !Number.isInteger(cidrPrefix) || cidrPrefix < 1 || cidrPrefix > 32) continue;

      const normalizedPrefix = Math.min(cidrPrefix, DEFAULT_ORG_SUBNET_PREFIX);
      const normalizedMask = normalizedPrefix === 0 ? 0 : ((0xffffffff << (32 - normalizedPrefix)) >>> 0);
      const normalizedStart = ipToNumber(cidrBase) & normalizedMask;

      const blocks = cidrPrefix <= DEFAULT_ORG_SUBNET_PREFIX ? 2 ** (DEFAULT_ORG_SUBNET_PREFIX - cidrPrefix) : 1;
      for (let i = 0; i < blocks; i++) {
        usedSubnetStarts.add((normalizedStart + i * subnetSize) >>> 0);
      }
    }

    const legacyDevices = await db.organizationDevice.findMany({
      where: { organization: { vpnSubnetCidr: null } },
      select: { vpnIpAddress: true },
    });

    for (const device of legacyDevices) {
      try {
        const legacyStart = ipToNumber(device.vpnIpAddress) & ((0xffffffff << (32 - DEFAULT_ORG_SUBNET_PREFIX)) >>> 0);
        usedSubnetStarts.add(legacyStart >>> 0);
      } catch {
        // ignore malformed legacy addresses
      }
    }

    for (let i = 0; i < maxSubnets; i++) {
      const candidateStart = poolStart + i * subnetSize;
      if (!usedSubnetStarts.has(candidateStart >>> 0)) {
        return `${numberToIp(candidateStart >>> 0)}/${DEFAULT_ORG_SUBNET_PREFIX}`;
      }
    }

    throw new Error(`No available /${DEFAULT_ORG_SUBNET_PREFIX} subnets left in ${DEFAULT_VPN_NETWORK_CIDR}`);
  };

  let subnetCidr = organization.vpnSubnetCidr?.trim();
  if (!subnetCidr) {
    const inferredSubnet = organization.devices[0]?.vpnIpAddress
      ? deriveSubnetFromIp(organization.devices[0].vpnIpAddress)
      : null;
    subnetCidr = inferredSubnet ?? (await allocateOrgSubnetFromPool());
    await db.organization.update({
      where: { id: organizationId },
      data: { vpnSubnetCidr: subnetCidr },
    });
  }

  const subnetRange = calculateSubnetRange(subnetCidr);

  const existingIps = await db.organizationDevice.findMany({
    where: { organizationId },
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

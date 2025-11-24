-- Add per-organization VPN subnet configuration for device IP allocation
ALTER TABLE "Organization"
ADD COLUMN "vpnSubnetCidr" TEXT;

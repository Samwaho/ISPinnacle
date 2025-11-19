-- AlterEnum
ALTER TYPE "public"."OrganizationPermission" ADD VALUE 'VIEW_DEVICES';
ALTER TYPE "public"."OrganizationPermission" ADD VALUE 'MANAGE_DEVICES';

-- CreateEnum
CREATE TYPE "public"."OrganizationDeviceType" AS ENUM ('MIKROTIK', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OrganizationDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "public"."OrganizationDevice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "deviceType" "public"."OrganizationDeviceType" NOT NULL DEFAULT 'MIKROTIK',
    "vendor" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "routerOsHost" TEXT NOT NULL,
    "routerOsPort" INTEGER NOT NULL DEFAULT 8728,
    "routerOsUsername" TEXT NOT NULL,
    "routerOsPassword" TEXT NOT NULL,
    "vpnIpAddress" TEXT NOT NULL,
    "vpnCidr" INTEGER NOT NULL DEFAULT 32,
    "wireguardPublicKey" TEXT NOT NULL,
    "wireguardPrivateKey" TEXT NOT NULL,
    "wireguardPresharedKey" TEXT,
    "wireguardEndpoint" TEXT,
    "wireguardListenPort" INTEGER,
    "status" "public"."OrganizationDeviceStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDevice_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrganizationDevice_vpnIpAddress_key" UNIQUE ("vpnIpAddress")
);

-- CreateIndex
CREATE INDEX "OrganizationDevice_organizationId_idx" ON "public"."OrganizationDevice"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."OrganizationDevice" ADD CONSTRAINT "OrganizationDevice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

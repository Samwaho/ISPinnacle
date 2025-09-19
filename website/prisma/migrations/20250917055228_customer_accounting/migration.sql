-- CreateEnum
CREATE TYPE "public"."ConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."OrganizationCustomer" ADD COLUMN     "connectionStatus" "public"."ConnectionStatus" NOT NULL DEFAULT 'OFFLINE';

-- CreateTable
CREATE TABLE "public"."OrganizationCustomerConnection" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "nasIpAddress" TEXT,
    "nasPort" TEXT,
    "framedIpAddress" TEXT,
    "callingStationId" TEXT,
    "calledStationId" TEXT,
    "connectionType" TEXT,
    "sessionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sessionStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionStopTime" TIMESTAMP(3),
    "sessionDuration" INTEGER,
    "lastUpdateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputOctets" BIGINT NOT NULL DEFAULT 0,
    "outputOctets" BIGINT NOT NULL DEFAULT 0,
    "inputPackets" BIGINT NOT NULL DEFAULT 0,
    "outputPackets" BIGINT NOT NULL DEFAULT 0,
    "inputGigawords" INTEGER NOT NULL DEFAULT 0,
    "outputGigawords" INTEGER NOT NULL DEFAULT 0,
    "terminateCause" TEXT,
    "acctAuthentic" TEXT,
    "acctDelayTime" INTEGER,
    "acctLinkCount" INTEGER,
    "serviceType" TEXT,
    "framedProtocol" TEXT,
    "framedMtu" INTEGER,
    "connectInfo" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationCustomerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomerConnection_sessionId_key" ON "public"."OrganizationCustomerConnection"("sessionId");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_customerId_idx" ON "public"."OrganizationCustomerConnection"("customerId");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_sessionId_idx" ON "public"."OrganizationCustomerConnection"("sessionId");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_nasIpAddress_idx" ON "public"."OrganizationCustomerConnection"("nasIpAddress");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_sessionStartTime_idx" ON "public"."OrganizationCustomerConnection"("sessionStartTime");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_sessionStatus_idx" ON "public"."OrganizationCustomerConnection"("sessionStatus");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_framedIpAddress_idx" ON "public"."OrganizationCustomerConnection"("framedIpAddress");

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomerConnection" ADD CONSTRAINT "OrganizationCustomerConnection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."OrganizationCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

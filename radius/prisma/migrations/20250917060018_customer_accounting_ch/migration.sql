/*
  Warnings:

  - You are about to drop the column `acctDelayTime` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `acctLinkCount` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `inputGigawords` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `inputOctets` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `inputPackets` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `outputGigawords` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `outputOctets` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `outputPackets` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `sessionDuration` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `sessionStartTime` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `sessionStopTime` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - You are about to drop the column `terminateCause` on the `OrganizationCustomerConnection` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customerId]` on the table `OrganizationCustomerConnection` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."OrganizationCustomerConnection_framedIpAddress_idx";

-- DropIndex
DROP INDEX "public"."OrganizationCustomerConnection_nasIpAddress_idx";

-- DropIndex
DROP INDEX "public"."OrganizationCustomerConnection_sessionId_idx";

-- DropIndex
DROP INDEX "public"."OrganizationCustomerConnection_sessionId_key";

-- DropIndex
DROP INDEX "public"."OrganizationCustomerConnection_sessionStartTime_idx";

-- AlterTable
ALTER TABLE "public"."OrganizationCustomerConnection" DROP COLUMN "acctDelayTime",
DROP COLUMN "acctLinkCount",
DROP COLUMN "inputGigawords",
DROP COLUMN "inputOctets",
DROP COLUMN "inputPackets",
DROP COLUMN "outputGigawords",
DROP COLUMN "outputOctets",
DROP COLUMN "outputPackets",
DROP COLUMN "sessionDuration",
DROP COLUMN "sessionId",
DROP COLUMN "sessionStartTime",
DROP COLUMN "sessionStopTime",
DROP COLUMN "terminateCause",
ADD COLUMN     "currentInputGigawords" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentInputOctets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "currentInputPackets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "currentOutputGigawords" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentOutputOctets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "currentOutputPackets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "currentSessionDuration" INTEGER,
ADD COLUMN     "currentSessionId" TEXT,
ADD COLUMN     "currentSessionStartTime" TIMESTAMP(3),
ADD COLUMN     "lastSessionDuration" INTEGER,
ADD COLUMN     "lastSessionStopTime" TIMESTAMP(3),
ADD COLUMN     "lastTerminateCause" TEXT,
ADD COLUMN     "totalInputOctets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "totalInputPackets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "totalOutputOctets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "totalOutputPackets" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessionTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessions" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "sessionStatus" SET DEFAULT 'OFFLINE';

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomerConnection_customerId_key" ON "public"."OrganizationCustomerConnection"("customerId");

-- CreateIndex
CREATE INDEX "OrganizationCustomerConnection_currentSessionId_idx" ON "public"."OrganizationCustomerConnection"("currentSessionId");

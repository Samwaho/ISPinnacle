-- CreateEnum
CREATE TYPE "public"."MpesaTransactionType" AS ENUM ('PAYBILL', 'BUYGOODS');

-- CreateTable
CREATE TABLE "public"."MpesaConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "passKey" TEXT NOT NULL,
    "transactionType" "public"."MpesaTransactionType" NOT NULL DEFAULT 'PAYBILL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MpesaConfiguration_organizationId_idx" ON "public"."MpesaConfiguration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaConfiguration_organizationId_key" ON "public"."MpesaConfiguration"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."MpesaConfiguration" ADD CONSTRAINT "MpesaConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

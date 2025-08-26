/*
  Warnings:

  - You are about to drop the column `isPaid` on the `OrganizationCustomerPayment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."MpesaTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "public"."OrganizationCustomerPayment" DROP COLUMN "isPaid";

-- CreateTable
CREATE TABLE "public"."MpesaTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transactionType" "public"."MpesaTransactionType" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "billReferenceNumber" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "name" TEXT,
    "transactionDateTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MpesaTransaction_organizationId_idx" ON "public"."MpesaTransaction"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

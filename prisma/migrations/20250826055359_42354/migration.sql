/*
  Warnings:

  - The values [KOPOKOPO] on the enum `PaymentGateway` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[organizationId]` on the table `OrganizationCustomer` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentGateway_new" AS ENUM ('MPESA');
ALTER TABLE "public"."Organization" ALTER COLUMN "paymentGateway" TYPE "public"."PaymentGateway_new" USING ("paymentGateway"::text::"public"."PaymentGateway_new");
ALTER TYPE "public"."PaymentGateway" RENAME TO "PaymentGateway_old";
ALTER TYPE "public"."PaymentGateway_new" RENAME TO "PaymentGateway";
DROP TYPE "public"."PaymentGateway_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."OrganizationCustomer_organizationId_email_idx";

-- DropIndex
DROP INDEX "public"."OrganizationCustomer_organizationId_email_key";

-- CreateIndex
CREATE INDEX "OrganizationCustomer_organizationId_idx" ON "public"."OrganizationCustomer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomer_organizationId_key" ON "public"."OrganizationCustomer"("organizationId");

/*
  Warnings:

  - Made the column `phone` on table `OrganizationCustomer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."OrganizationCustomer" ALTER COLUMN "phone" SET NOT NULL;

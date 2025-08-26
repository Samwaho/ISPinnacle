/*
  Warnings:

  - A unique constraint covering the columns `[pppoeUsername,hotspotUsername]` on the table `OrganizationCustomer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."OrganizationCustomer_organizationId_key";

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomer_pppoeUsername_hotspotUsername_key" ON "public"."OrganizationCustomer"("pppoeUsername", "hotspotUsername");

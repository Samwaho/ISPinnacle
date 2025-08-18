/*
  Warnings:

  - A unique constraint covering the columns `[name,organizationId]` on the table `OrganizationRole` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."OrganizationRole_name_key";

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_userId_idx" ON "public"."OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRole_name_organizationId_key" ON "public"."OrganizationRole"("name", "organizationId");

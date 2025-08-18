/*
  Warnings:

  - The values [MANAGE_USERS,MANAGE_INVITATIONS,MANAGE_PERMISSIONS,MANAGE_ORGANIZATION_MEMBERS,MANAGE_ORGANIZATION_ROLES] on the enum `OrganizationPermission` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."OrganizationPermission_new" AS ENUM ('VIEW_ORGANIZATION_DETAILS', 'MANAGE_ORGANIZATION_DETAILS', 'MANAGE_MEMBERS', 'MANAGE_SETTINGS', 'MANAGE_ROLES');
ALTER TABLE "public"."OrganizationRole" ALTER COLUMN "permissions" TYPE "public"."OrganizationPermission_new"[] USING ("permissions"::text::"public"."OrganizationPermission_new"[]);
ALTER TYPE "public"."OrganizationPermission" RENAME TO "OrganizationPermission_old";
ALTER TYPE "public"."OrganizationPermission_new" RENAME TO "OrganizationPermission";
DROP TYPE "public"."OrganizationPermission_old";
COMMIT;

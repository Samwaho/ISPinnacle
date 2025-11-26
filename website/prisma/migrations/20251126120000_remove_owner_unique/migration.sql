-- Allow multiple organizations per owner by removing the unique constraint
DROP INDEX IF EXISTS "Organization_ownerId_key";

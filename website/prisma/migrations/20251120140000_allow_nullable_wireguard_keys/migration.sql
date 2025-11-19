-- Allow devices to be created before their WireGuard keys are provided
ALTER TABLE "public"."OrganizationDevice"
  ALTER COLUMN "wireguardPublicKey" DROP NOT NULL,
  ALTER COLUMN "wireguardPrivateKey" DROP NOT NULL;

-- Generalize MpesaTransaction by adding gateway and source classification
-- and prepare for future non-M-Pesa methods without breaking existing code.

-- Create enums if they don't already exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentGateway') THEN
    CREATE TYPE "public"."PaymentGateway" AS ENUM ('MPESA', 'KOPOKOPO', 'OTHER');
  ELSE
    -- Ensure 'OTHER' exists on existing enum
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'PaymentGateway' AND e.enumlabel = 'OTHER'
    ) THEN
      ALTER TYPE "public"."PaymentGateway" ADD VALUE 'OTHER';
    END IF;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionSource') THEN
    CREATE TYPE "public"."TransactionSource" AS ENUM ('PPPOE', 'HOTSPOT', 'OTHER');
  END IF;
END $$;

-- Add columns to MpesaTransaction for gateway and source (nullable for backfill)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'MpesaTransaction'
  ) THEN
    ALTER TABLE "public"."MpesaTransaction"
      ADD COLUMN IF NOT EXISTS "paymentGateway" "public"."PaymentGateway",
      ADD COLUMN IF NOT EXISTS "source" "public"."TransactionSource";
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Transaction'
  ) THEN
    ALTER TABLE "public"."Transaction"
      ADD COLUMN IF NOT EXISTS "paymentGateway" "public"."PaymentGateway",
      ADD COLUMN IF NOT EXISTS "source" "public"."TransactionSource";
  END IF;
END $$;

-- Optional: Backfill known KopoKopo rows by invoice prefix heuristic
-- This is safe and reversible; adjust if you track gateway differently.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'MpesaTransaction'
  ) THEN
    UPDATE "public"."MpesaTransaction"
    SET "paymentGateway" = 'KOPOKOPO'
    WHERE "invoiceNumber" LIKE 'K2-%' AND "paymentGateway" IS NULL;

    UPDATE "public"."MpesaTransaction"
    SET "paymentGateway" = 'MPESA'
    WHERE ("invoiceNumber" IS NULL OR "invoiceNumber" NOT LIKE 'K2-%') AND "paymentGateway" IS NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Transaction'
  ) THEN
    UPDATE "public"."Transaction"
    SET "paymentGateway" = 'KOPOKOPO'
    WHERE "invoiceNumber" LIKE 'K2-%' AND "paymentGateway" IS NULL;

    UPDATE "public"."Transaction"
    SET "paymentGateway" = 'MPESA'
    WHERE ("invoiceNumber" IS NULL OR "invoiceNumber" NOT LIKE 'K2-%') AND "paymentGateway" IS NULL;
  END IF;
END $$;

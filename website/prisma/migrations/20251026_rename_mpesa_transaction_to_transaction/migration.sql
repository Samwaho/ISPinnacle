-- Rename underlying table MpesaTransaction -> Transaction
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'MpesaTransaction'
  ) THEN
    ALTER TABLE "public"."MpesaTransaction" RENAME TO "Transaction";
  END IF;
END $$;


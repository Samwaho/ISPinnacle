-- AlterTable
ALTER TABLE "public"."Transaction" RENAME CONSTRAINT "MpesaTransaction_pkey" TO "Transaction_pkey";

-- RenameForeignKey
ALTER TABLE "public"."Transaction" RENAME CONSTRAINT "MpesaTransaction_organizationId_fkey" TO "Transaction_organizationId_fkey";

-- RenameIndex
ALTER INDEX "public"."MpesaTransaction_organizationId_idx" RENAME TO "Transaction_organizationId_idx";

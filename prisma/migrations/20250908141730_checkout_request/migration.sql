-- AlterTable
ALTER TABLE "public"."MpesaPaymentLink" ADD COLUMN     "merchantRequestId" TEXT;

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_merchantRequestId_idx" ON "public"."MpesaPaymentLink"("merchantRequestId");

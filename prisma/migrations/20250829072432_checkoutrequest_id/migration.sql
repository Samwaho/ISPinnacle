-- AlterTable
ALTER TABLE "public"."MpesaPaymentLink" ADD COLUMN     "checkoutRequestId" TEXT;

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_checkoutRequestId_idx" ON "public"."MpesaPaymentLink"("checkoutRequestId");

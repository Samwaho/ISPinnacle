-- CreateTable
CREATE TABLE "public"."MpesaPaymentLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaPaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MpesaPaymentLink_token_key" ON "public"."MpesaPaymentLink"("token");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_token_idx" ON "public"."MpesaPaymentLink"("token");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_organizationId_idx" ON "public"."MpesaPaymentLink"("organizationId");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_customerId_idx" ON "public"."MpesaPaymentLink"("customerId");

-- AddForeignKey
ALTER TABLE "public"."MpesaPaymentLink" ADD CONSTRAINT "MpesaPaymentLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MpesaPaymentLink" ADD CONSTRAINT "MpesaPaymentLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."OrganizationCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

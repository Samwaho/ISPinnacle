-- CreateEnum
CREATE TYPE "public"."VoucherStatus" AS ENUM ('PENDING', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."HotspotVoucher" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "voucherCode" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "public"."VoucherStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "paymentGateway" "public"."PaymentGateway",
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotspotVoucher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotspotVoucher_voucherCode_key" ON "public"."HotspotVoucher"("voucherCode");

-- CreateIndex
CREATE INDEX "HotspotVoucher_voucherCode_idx" ON "public"."HotspotVoucher"("voucherCode");

-- CreateIndex
CREATE INDEX "HotspotVoucher_organizationId_idx" ON "public"."HotspotVoucher"("organizationId");

-- CreateIndex
CREATE INDEX "HotspotVoucher_status_idx" ON "public"."HotspotVoucher"("status");

-- CreateIndex
CREATE INDEX "HotspotVoucher_expiresAt_idx" ON "public"."HotspotVoucher"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."HotspotVoucher" ADD CONSTRAINT "HotspotVoucher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HotspotVoucher" ADD CONSTRAINT "HotspotVoucher_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."OrganizationPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

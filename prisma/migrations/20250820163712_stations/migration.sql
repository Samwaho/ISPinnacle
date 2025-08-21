-- CreateEnum
CREATE TYPE "public"."OrganizationCustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."OrganizationStationType" AS ENUM ('APARTMENT', 'HOUSE', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OrganizationPackageDurationType" AS ENUM ('MONTH', 'YEAR', 'WEEK', 'DAY', 'HOUR', 'MINUTE');

-- CreateEnum
CREATE TYPE "public"."OrganizationPackageType" AS ENUM ('PPPOE', 'HOTSPOT');

-- CreateEnum
CREATE TYPE "public"."RecurringIntervalType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "public"."OrganizationCustomer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "expiryDate" TIMESTAMP(3),
    "pppoeUsername" TEXT,
    "pppoePassword" TEXT,
    "hotspotUsername" TEXT,
    "hotspotPassword" TEXT,
    "status" "public"."OrganizationCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "stationId" TEXT,
    "packageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationStation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "type" "public"."OrganizationStationType" NOT NULL DEFAULT 'APARTMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationPackage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL,
    "durationType" "public"."OrganizationPackageDurationType" NOT NULL DEFAULT 'MONTH',
    "type" "public"."OrganizationPackageType" NOT NULL DEFAULT 'PPPOE',
    "addressPool" TEXT NOT NULL,
    "maxDevices" INTEGER,
    "downloadSpeed" INTEGER NOT NULL,
    "uploadSpeed" INTEGER NOT NULL,
    "burstDownloadSpeed" INTEGER,
    "burstUploadSpeed" INTEGER,
    "burstThresholdDownload" INTEGER,
    "burstThresholdUpload" INTEGER,
    "burstDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationExpense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" INTEGER,
    "recurringIntervalType" "public"."RecurringIntervalType",
    "recurringStartDate" TIMESTAMP(3),
    "recurringEndDate" TIMESTAMP(3),
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationCustomerPayment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationCustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationCustomer_organizationId_email_idx" ON "public"."OrganizationCustomer"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomer_organizationId_email_key" ON "public"."OrganizationCustomer"("organizationId", "email");

-- CreateIndex
CREATE INDEX "OrganizationCustomerPayment_organizationId_customerId_idx" ON "public"."OrganizationCustomerPayment"("organizationId", "customerId");

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomer" ADD CONSTRAINT "OrganizationCustomer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomer" ADD CONSTRAINT "OrganizationCustomer_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."OrganizationStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomer" ADD CONSTRAINT "OrganizationCustomer_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."OrganizationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationStation" ADD CONSTRAINT "OrganizationStation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationPackage" ADD CONSTRAINT "OrganizationPackage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationExpense" ADD CONSTRAINT "OrganizationExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomerPayment" ADD CONSTRAINT "OrganizationCustomerPayment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomerPayment" ADD CONSTRAINT "OrganizationCustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."OrganizationCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationCustomerPayment" ADD CONSTRAINT "OrganizationCustomerPayment_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "public"."OrganizationPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

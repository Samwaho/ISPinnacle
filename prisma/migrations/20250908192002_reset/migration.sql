-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "public"."OrganizationPermission" AS ENUM ('VIEW_ORGANIZATION_DETAILS', 'MANAGE_ORGANIZATION_DETAILS', 'MANAGE_MEMBERS', 'MANAGE_SETTINGS', 'MANAGE_ROLES', 'VIEW_STATIONS', 'MANAGE_STATIONS', 'VIEW_PACKAGES', 'MANAGE_PACKAGES', 'VIEW_EXPENSES', 'MANAGE_EXPENSES', 'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS');

-- CreateEnum
CREATE TYPE "public"."OrganizationInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."PaymentGateway" AS ENUM ('MPESA');

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

-- CreateEnum
CREATE TYPE "public"."SMSProvider" AS ENUM ('TEXT_SMS', 'ZETATEL');

-- CreateEnum
CREATE TYPE "public"."MpesaTransactionType" AS ENUM ('PAYBILL', 'BUYGOODS');

-- CreateEnum
CREATE TYPE "public"."MpesaTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TwoFactorToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TwoFactorConfirmation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TwoFactorConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "logo" TEXT,
    "description" TEXT,
    "website" TEXT,
    "paymentGateway" "public"."PaymentGateway",
    "smsProvider" "public"."SMSProvider",
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "permissions" "public"."OrganizationPermission"[],
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "status" "public"."OrganizationInvitationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationActivity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationActivity_pkey" PRIMARY KEY ("id")
);

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationCustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MpesaConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "passKey" TEXT NOT NULL,
    "transactionType" "public"."MpesaTransactionType" NOT NULL DEFAULT 'PAYBILL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MpesaTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "transactionType" "public"."MpesaTransactionType" NOT NULL,
    "transactionId" TEXT NOT NULL,
    "billReferenceNumber" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "name" TEXT,
    "transactionDateTime" TIMESTAMP(3) NOT NULL,
    "orgAccountBalance" DOUBLE PRECISION,
    "invoiceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MpesaPaymentLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "checkoutRequestId" TEXT,
    "merchantRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaPaymentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SMSConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apiKey" TEXT,
    "senderId" TEXT,
    "partnerId" TEXT,
    "userId" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_email_token_key" ON "public"."VerificationToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_email_token_key" ON "public"."PasswordResetToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorToken_token_key" ON "public"."TwoFactorToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorToken_email_token_key" ON "public"."TwoFactorToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorConfirmation_userId_key" ON "public"."TwoFactorConfirmation"("userId");

-- CreateIndex
CREATE INDEX "Organization_ownerId_idx" ON "public"."Organization"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_ownerId_key" ON "public"."Organization"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationRole_name_organizationId_key" ON "public"."OrganizationRole"("name", "organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_userId_idx" ON "public"."OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "public"."OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_organizationId_token_idx" ON "public"."OrganizationInvitation"("email", "organizationId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_email_organizationId_token_key" ON "public"."OrganizationInvitation"("email", "organizationId", "token");

-- CreateIndex
CREATE INDEX "OrganizationCustomer_organizationId_idx" ON "public"."OrganizationCustomer"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationCustomer_pppoeUsername_hotspotUsername_key" ON "public"."OrganizationCustomer"("pppoeUsername", "hotspotUsername");

-- CreateIndex
CREATE INDEX "OrganizationCustomerPayment_organizationId_customerId_idx" ON "public"."OrganizationCustomerPayment"("organizationId", "customerId");

-- CreateIndex
CREATE INDEX "MpesaConfiguration_organizationId_idx" ON "public"."MpesaConfiguration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaConfiguration_organizationId_key" ON "public"."MpesaConfiguration"("organizationId");

-- CreateIndex
CREATE INDEX "MpesaTransaction_organizationId_idx" ON "public"."MpesaTransaction"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaPaymentLink_token_key" ON "public"."MpesaPaymentLink"("token");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_token_idx" ON "public"."MpesaPaymentLink"("token");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_organizationId_idx" ON "public"."MpesaPaymentLink"("organizationId");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_customerId_idx" ON "public"."MpesaPaymentLink"("customerId");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_checkoutRequestId_idx" ON "public"."MpesaPaymentLink"("checkoutRequestId");

-- CreateIndex
CREATE INDEX "MpesaPaymentLink_merchantRequestId_idx" ON "public"."MpesaPaymentLink"("merchantRequestId");

-- CreateIndex
CREATE INDEX "SMSConfiguration_organizationId_idx" ON "public"."SMSConfiguration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SMSConfiguration_organizationId_key" ON "public"."SMSConfiguration"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TwoFactorConfirmation" ADD CONSTRAINT "TwoFactorConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationRole" ADD CONSTRAINT "OrganizationRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."OrganizationRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."OrganizationRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationActivity" ADD CONSTRAINT "OrganizationActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationActivity" ADD CONSTRAINT "OrganizationActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "public"."MpesaConfiguration" ADD CONSTRAINT "MpesaConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MpesaPaymentLink" ADD CONSTRAINT "MpesaPaymentLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MpesaPaymentLink" ADD CONSTRAINT "MpesaPaymentLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."OrganizationCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SMSConfiguration" ADD CONSTRAINT "SMSConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

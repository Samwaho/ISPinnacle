-- Add Jenga payment gateway support
ALTER TYPE "PaymentGateway" ADD VALUE IF NOT EXISTS 'JENGA';

CREATE TABLE "JengaConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "merchantCode" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "baseUrl" TEXT,
    "callbackUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JengaConfiguration_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "JengaConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "JengaConfiguration_organizationId_key" ON "JengaConfiguration"("organizationId");
CREATE INDEX "JengaConfiguration_organizationId_idx" ON "JengaConfiguration"("organizationId");

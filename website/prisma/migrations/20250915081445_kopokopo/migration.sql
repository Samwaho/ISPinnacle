-- AlterEnum
ALTER TYPE "public"."PaymentGateway" ADD VALUE 'KOPOKOPO';

-- CreateTable
CREATE TABLE "public"."KopokopoConfiguration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "tillNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KopokopoConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KopokopoConfiguration_organizationId_idx" ON "public"."KopokopoConfiguration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "KopokopoConfiguration_organizationId_key" ON "public"."KopokopoConfiguration"("organizationId");

-- AddForeignKey
ALTER TABLE "public"."KopokopoConfiguration" ADD CONSTRAINT "KopokopoConfiguration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

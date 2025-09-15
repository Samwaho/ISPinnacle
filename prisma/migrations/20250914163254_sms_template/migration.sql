-- CreateTable
CREATE TABLE "public"."SMSTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SMSTemplate_organizationId_idx" ON "public"."SMSTemplate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SMSTemplate_name_organizationId_key" ON "public"."SMSTemplate"("name", "organizationId");

-- AddForeignKey
ALTER TABLE "public"."SMSTemplate" ADD CONSTRAINT "SMSTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

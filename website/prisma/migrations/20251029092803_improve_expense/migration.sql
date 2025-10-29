-- AlterTable
ALTER TABLE "public"."OrganizationExpense" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "public"."OrganizationExpenseTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "intervalType" "public"."RecurringIntervalType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoMarkAsPaid" BOOLEAN NOT NULL DEFAULT false,
    "lastGeneratedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationExpenseTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationExpenseTemplate_organizationId_nextRunDate_idx" ON "public"."OrganizationExpenseTemplate"("organizationId", "nextRunDate");

-- AddForeignKey
ALTER TABLE "public"."OrganizationExpense" ADD CONSTRAINT "OrganizationExpense_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."OrganizationExpenseTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationExpenseTemplate" ADD CONSTRAINT "OrganizationExpenseTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

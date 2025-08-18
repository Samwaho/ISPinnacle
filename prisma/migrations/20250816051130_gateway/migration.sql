-- AlterTable
ALTER TABLE "public"."Organization" ALTER COLUMN "paymentGateway" DROP NOT NULL,
ALTER COLUMN "paymentGateway" DROP DEFAULT,
ALTER COLUMN "smsGateway" DROP NOT NULL,
ALTER COLUMN "smsGateway" DROP DEFAULT;

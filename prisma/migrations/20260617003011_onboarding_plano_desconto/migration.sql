-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "billing_configs" ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValueBp" INTEGER,
ADD COLUMN     "discountValueCents" INTEGER,
ADD COLUMN     "isBeta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planId" TEXT NOT NULL DEFAULT 'basico',
ADD COLUMN     "planPriceCents" INTEGER NOT NULL DEFAULT 39900;

-- CreateEnum
CREATE TYPE "DunningAction" AS ENUM ('NEGATIVATION', 'CANCELLATION');

-- CreateEnum
CREATE TYPE "DunningStatus" AS ENUM ('NEGATIVATED', 'REGULARIZED');

-- CreateEnum
CREATE TYPE "DunningLogResult" AS ENUM ('SUCCESS', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'NEGATIVATED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'REGULARIZED';

-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "dunningOptOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "dunning_logs" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "action" "DunningAction" NOT NULL,
    "result" "DunningLogResult" NOT NULL,
    "errorDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dunning_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dunnings" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "asaasDunningId" TEXT,
    "status" "DunningStatus" NOT NULL DEFAULT 'NEGATIVATED',
    "valueCents" INTEGER,
    "feeCents" INTEGER,
    "warningSentAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dunnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dunning_logs_unitId_idx" ON "dunning_logs"("unitId");

-- CreateIndex
CREATE INDEX "dunning_logs_invoiceId_action_idx" ON "dunning_logs"("invoiceId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "dunnings_invoiceId_key" ON "dunnings"("invoiceId");

-- CreateIndex
CREATE INDEX "dunnings_unitId_idx" ON "dunnings"("unitId");

-- CreateIndex
CREATE INDEX "dunnings_unitId_status_idx" ON "dunnings"("unitId", "status");

-- CreateIndex
CREATE INDEX "invoices_unitId_dueDate_idx" ON "invoices"("unitId", "dueDate");

-- AddForeignKey
ALTER TABLE "dunning_logs" ADD CONSTRAINT "dunning_logs_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunning_logs" ADD CONSTRAINT "dunning_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunnings" ADD CONSTRAINT "dunnings_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dunnings" ADD CONSTRAINT "dunnings_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'BLOCKED', 'ERROR');

-- CreateEnum
CREATE TYPE "FirstChargeMode" AS ENUM ('PROPORTIONAL', 'FREE_FIRST_MONTH');

-- AlterTable
ALTER TABLE "billing_configs" ADD COLUMN     "firstChargeMode" "FirstChargeMode" NOT NULL DEFAULT 'PROPORTIONAL';

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "netAmountCents" INTEGER NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "asaasPaymentId" TEXT,
    "asaasPaymentUrl" TEXT,
    "asaasBankSlipUrl" TEXT,
    "asaasBarCode" TEXT,
    "emittedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmountCents" INTEGER,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "asaasPaymentId" TEXT NOT NULL,
    "asaasEvent" TEXT NOT NULL,
    "asaasStatus" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "clientPaidAt" TIMESTAMP(3),
    "webhookEventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_idempotencyKey_key" ON "invoices"("idempotencyKey");

-- CreateIndex
CREATE INDEX "invoices_unitId_idx" ON "invoices"("unitId");

-- CreateIndex
CREATE INDEX "invoices_enrollmentId_idx" ON "invoices"("enrollmentId");

-- CreateIndex
CREATE INDEX "invoices_asaasPaymentId_idx" ON "invoices"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "invoices_referenceMonth_idx" ON "invoices"("referenceMonth");

-- CreateIndex
CREATE UNIQUE INDEX "payments_webhookEventId_key" ON "payments"("webhookEventId");

-- CreateIndex
CREATE INDEX "payments_unitId_idx" ON "payments"("unitId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_asaasPaymentId_idx" ON "payments"("asaasPaymentId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


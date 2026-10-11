-- Fails loudly if legacy data already has two Invoices sharing an asaasPaymentId.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "invoices" WHERE "asaasPaymentId" IS NOT NULL
    GROUP BY "asaasPaymentId" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate invoices.asaasPaymentId found; resolve them before adding the unique index';
  END IF;
END $$;

-- DropIndex
DROP INDEX "invoices_asaasPaymentId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "invoices_asaasPaymentId_key" ON "invoices"("asaasPaymentId");

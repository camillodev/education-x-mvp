-- Fails loudly (instead of silently losing data) if any Invoice is still BLOCKED.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "invoices" WHERE "status" = 'BLOCKED') THEN
    RAISE EXCEPTION 'Invoices with status BLOCKED exist; resolve them before removing the enum value';
  END IF;
END $$;

ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'ERROR', 'NEGATIVATED', 'REGULARIZED');
ALTER TABLE "invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus" USING ("status"::text::"InvoiceStatus");
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'PENDING';
DROP TYPE "InvoiceStatus_old";

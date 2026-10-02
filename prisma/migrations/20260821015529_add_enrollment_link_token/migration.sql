-- AlterTable
ALTER TABLE "units" ADD COLUMN     "enrollmentLinkToken" TEXT;

-- Backfill: escolas já existentes ganham um token estável (senão o link /m/[token] nunca funciona pra elas)
UPDATE "units" SET "enrollmentLinkToken" = gen_random_uuid()::text WHERE "enrollmentLinkToken" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "units_enrollmentLinkToken_key" ON "units"("enrollmentLinkToken");

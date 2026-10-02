-- AlterTable
ALTER TABLE "terms_versions" ADD COLUMN     "unitId" TEXT;

-- CreateIndex
CREATE INDEX "terms_versions_unitId_kind_createdAt_idx" ON "terms_versions"("unitId", "kind", "createdAt");


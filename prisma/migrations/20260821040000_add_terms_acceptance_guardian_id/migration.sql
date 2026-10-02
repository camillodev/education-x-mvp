-- AlterTable
ALTER TABLE "terms_acceptances" ADD COLUMN     "guardianId" TEXT;

-- CreateIndex
CREATE INDEX "terms_acceptances_guardianId_idx" ON "terms_acceptances"("guardianId");

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;


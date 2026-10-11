-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN "asaasSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_asaasSubscriptionId_key" ON "enrollments"("asaasSubscriptionId");

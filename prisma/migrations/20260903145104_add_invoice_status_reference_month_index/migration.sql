-- CreateIndex
CREATE INDEX "invoices_unitId_status_idx" ON "invoices"("unitId", "status");

-- CreateIndex
CREATE INDEX "invoices_unitId_referenceMonth_idx" ON "invoices"("unitId", "referenceMonth");

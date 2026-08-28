-- CreateIndex
CREATE INDEX "enrollments_unitId_subjectId_status_idx" ON "enrollments"("unitId", "subjectId", "status");

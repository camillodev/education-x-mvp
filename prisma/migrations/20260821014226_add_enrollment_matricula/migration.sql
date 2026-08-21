-- CreateEnum
CREATE TYPE "GuardianType" AS ENUM ('FATHER', 'MOTHER', 'LEGAL_GUARDIAN');

-- CreateEnum
CREATE TYPE "EnrollmentPlan" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_CONFIRMATION', 'PENDING_SCHOOL_APPROVAL', 'ACTIVE', 'CANCELLED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "guardians" ADD COLUMN     "selfPayer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" "GuardianType";

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "nameEnc" TEXT NOT NULL,
    "birthDateEnc" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "plan" "EnrollmentPlan" NOT NULL,
    "agreedPriceCents" INTEGER NOT NULL,
    "discountType" "DiscountType",
    "discountValueBp" INTEGER,
    "discountValueCents" INTEGER,
    "finalPriceCents" INTEGER NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "confirmationToken" TEXT,
    "customDueDay" INTEGER,
    "isFirstChargeDone" BOOLEAN NOT NULL DEFAULT false,
    "dunningPaused" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_unitId_idx" ON "students"("unitId");

-- CreateIndex
CREATE INDEX "students_guardianId_idx" ON "students"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_confirmationToken_key" ON "enrollments"("confirmationToken");

-- CreateIndex
CREATE INDEX "enrollments_unitId_status_idx" ON "enrollments"("unitId", "status");

-- CreateIndex
CREATE INDEX "enrollments_unitId_cancelledAt_idx" ON "enrollments"("unitId", "cancelledAt");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


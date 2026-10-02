-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FeePayer" AS ENUM ('RESPONSAVEL', 'ESCOLA');

-- CreateEnum
CREATE TYPE "TermsKind" AS ENUM ('IX_ESCOLA', 'ESCOLA_RESPONSAVEL', 'PRIVACY');

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "complement" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isFranchise" BOOLEAN NOT NULL DEFAULT false,
    "franchiseParent" TEXT,
    "status" "UnitStatus" NOT NULL DEFAULT 'PENDING',
    "responsibleName" TEXT NOT NULL,
    "responsibleCpfEnc" TEXT NOT NULL,
    "responsibleEmail" TEXT NOT NULL,
    "responsiblePhone" TEXT NOT NULL,
    "confirmationToken" TEXT,
    "confirmationTokenExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "asaasAccountId" TEXT,
    "asaasApiKeyEnc" TEXT,
    "asaasWalletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_configs" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "closingDay" INTEGER NOT NULL,
    "lateFeePercent" INTEGER NOT NULL,
    "monthlyInterestBp" INTEGER NOT NULL,
    "enablesSpc" BOOLEAN NOT NULL DEFAULT false,
    "autoBilling" BOOLEAN NOT NULL DEFAULT true,
    "acceptsCard" BOOLEAN NOT NULL DEFAULT false,
    "cardFeePayer" "FeePayer" NOT NULL DEFAULT 'RESPONSAVEL',
    "negativacaoFeePayer" "FeePayer" NOT NULL DEFAULT 'RESPONSAVEL',
    "municipalRegistration" TEXT NOT NULL,
    "requireSignedContract" BOOLEAN NOT NULL DEFAULT false,
    "contractFileName" TEXT,
    "asaasWebhookTokenEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nfseServiceCode" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpfEnc" TEXT,
    "emailEnc" TEXT,
    "phoneEnc" TEXT,
    "asaasCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_versions" (
    "id" TEXT NOT NULL,
    "kind" "TermsKind" NOT NULL,
    "version" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_acceptances" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "termsVersionId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "units_cnpj_key" ON "units"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "units_confirmationToken_key" ON "units"("confirmationToken");

-- CreateIndex
CREATE UNIQUE INDEX "billing_configs_unitId_key" ON "billing_configs"("unitId");

-- CreateIndex
CREATE INDEX "subjects_unitId_idx" ON "subjects"("unitId");

-- CreateIndex
CREATE INDEX "guardians_unitId_idx" ON "guardians"("unitId");

-- CreateIndex
CREATE INDEX "terms_acceptances_unitId_idx" ON "terms_acceptances"("unitId");

-- AddForeignKey
ALTER TABLE "billing_configs" ADD CONSTRAINT "billing_configs_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "terms_acceptances" ADD CONSTRAINT "terms_acceptances_termsVersionId_fkey" FOREIGN KEY ("termsVersionId") REFERENCES "terms_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

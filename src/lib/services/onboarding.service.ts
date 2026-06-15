import { getMasterAsaasClient } from '../integration/asaas/client'
import { encrypt } from '../crypto'
import { prisma } from '../db'
import { CreateSchoolSchema, type CreateSchoolInput } from '../validations/unit'
import type { Unit } from '@prisma/client'

// ─── Erros do domínio ────────────────────────────────────────────────────────

export class DuplicateCnpjError extends Error {
  constructor() {
    super('CNPJ já cadastrado')
    this.name = 'DuplicateCnpjError'
  }
}

export class AsaasProvisionError extends Error {
  constructor(cause?: unknown) {
    super('Falha ao criar subconta Asaas')
    this.name = 'AsaasProvisionError'
    if (cause instanceof Error) this.cause = cause
  }
}

export class TermsVersionNotFoundError extends Error {
  constructor() {
    super('Versão dos termos não encontrada')
    this.name = 'TermsVersionNotFoundError'
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createSchool(input: CreateSchoolInput, ip: string): Promise<Unit> {
  // 1. Validar input
  const data = CreateSchoolSchema.parse(input)

  // 2. Verificar CNPJ duplicado
  const existing = await prisma.unit.findUnique({ where: { cnpj: data.cnpj } })
  if (existing) throw new DuplicateCnpjError()

  // 3. Verificar que o termsVersionId existe
  const termsVersion = await prisma.termsVersion.findUnique({
    where: { id: data.termsVersionId },
  })
  if (!termsVersion) throw new TermsVersionNotFoundError()

  // 4. Criar Unit + BillingConfig + Subjects em transação atômica
  const unit = await prisma.$transaction(async (tx) => {
    const newUnit = await tx.unit.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone,
        cep: data.cep,
        address: data.address,
        number: data.number,
        neighborhood: data.neighborhood,
        complement: data.complement,
        city: data.city,
        state: data.state,
        isFranchise: data.isFranchise,
        franchiseParent: data.franchiseParent,
        status: 'PENDING',
      },
    })

    await tx.billingConfig.create({
      data: {
        unitId: newUnit.id,
        dueDay: data.billing.dueDay,
        closingDay: data.billing.closingDay,
        lateFeePercent: data.billing.lateFeePercent,
        monthlyInterestBp: data.billing.monthlyInterestBp,
        enablesSpc: data.billing.enablesSpc,
        autoBilling: data.billing.autoBilling,
        acceptsCard: data.billing.acceptsCard,
        cardFeePayer: data.billing.cardFeePayer,
        negativacaoFeePayer: data.billing.negativacaoFeePayer,
        municipalRegistration: data.billing.municipalRegistration,
      },
    })

    await tx.subject.createMany({
      data: data.subjects.map((s) => ({
        unitId: newUnit.id,
        name: s.name,
        nfseServiceCode: s.nfseServiceCode,
        priceCents: s.priceCents,
      })),
    })

    return newUnit
  })

  // 5. Criar subconta Asaas (fora da transaction — se falhar, Unit fica em PENDING)
  const asaasClient = getMasterAsaasClient()
  let asaasAccountId: string | undefined
  let asaasApiKeyEnc: string | undefined
  let asaasWalletId: string | undefined

  try {
    const subAccount = await asaasClient.createSubAccount({
      name: data.name,
      email: data.email,
      cpfCnpj: data.cnpj,
      mobilePhone: data.phone,
      address: data.address,
      addressNumber: data.number,
      province: data.neighborhood,
      postalCode: data.cep,
    })

    asaasAccountId = subAccount.id
    asaasWalletId = subAccount.walletId ?? undefined
    // Criptografar antes de persistir
    asaasApiKeyEnc = await encrypt(subAccount.apiKey)
  } catch (err) {
    throw new AsaasProvisionError(err)
  }

  // 6. Salvar dados da subconta na Unit
  const updatedUnit = await prisma.unit.update({
    where: { id: unit.id },
    data: {
      asaasAccountId,
      asaasApiKeyEnc,
      asaasWalletId,
      status: 'ACTIVE',
    },
  })

  // 7. Registrar aceite dos termos
  await prisma.termsAcceptance.create({
    data: {
      unitId: unit.id,
      termsVersionId: data.termsVersionId,
      ip,
      acceptedAt: new Date(),
    },
  })

  return updatedUnit
}

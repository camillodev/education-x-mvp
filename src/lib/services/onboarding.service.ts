import { randomUUID } from 'node:crypto'
import { getMasterAsaasClient } from '../integration/asaas/client'
import { encrypt } from '../crypto'
import { prisma } from '../db'
import { CreateSchoolSchema, type CreateSchoolInput } from '../validations/unit'
import { sendConfirmationEmail } from '../email/confirmation-email'
import { inviteUnitResponsible } from '../auth/invite'
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

// Token de confirmação válido por 7 dias.
const CONFIRMATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// ─── Service ──────────────────────────────────────────────────────────────────

export async function createSchool(
  input: CreateSchoolInput,
  baseUrl: string
): Promise<Unit> {
  // 1. Validar input
  const data = CreateSchoolSchema.parse(input)

  // 2. Verificar CNPJ duplicado
  const existing = await prisma.unit.findUnique({ where: { cnpj: data.cnpj } })
  if (existing) throw new DuplicateCnpjError()

  // 3. Criptografar PII do responsável (CPF) + gerar token de confirmação
  const responsibleCpfEnc = await encrypt(data.responsibleCpf)
  const confirmationToken = randomUUID()
  const confirmationTokenExpiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS)

  // 4. Criar Unit + BillingConfig + Subjects em transação atômica (status PENDING)
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
        responsibleName: data.responsibleName,
        responsibleCpfEnc,
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
        confirmationToken,
        confirmationTokenExpiresAt,
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
        cardFeePayer: data.billing.cardFeePayer,
        negativacaoFeePayer: data.billing.negativacaoFeePayer,
        municipalRegistration: data.billing.municipalRegistration,
        // autoBilling/enablesSpc/acceptsCard usam o default do schema (todos ligados no MVP)
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
  let asaasAccountId: string | undefined
  let asaasApiKeyEnc: string | undefined
  let asaasWalletId: string | undefined

  try {
    const subAccount = await getMasterAsaasClient().createSubAccount({
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
    asaasApiKeyEnc = await encrypt(subAccount.apiKey)
  } catch (err) {
    throw new AsaasProvisionError(err)
  }

  // 6. Salvar dados da subconta. Status segue PENDING até o aceite via link.
  const updatedUnit = await prisma.unit.update({
    where: { id: unit.id },
    data: { asaasAccountId, asaasApiKeyEnc, asaasWalletId },
  })

  // 7. Enviar e-mail de confirmação ao responsável (não bloqueia se falhar)
  const confirmUrl = `${baseUrl.replace(/\/$/, '')}/confirmar/${confirmationToken}`
  await sendConfirmationEmail({
    to: data.responsibleEmail,
    responsibleName: data.responsibleName,
    schoolName: data.name,
    confirmUrl,
  })

  return updatedUnit
}

// ─── Aceite via link de confirmação ───────────────────────────────────────────

export class InvalidConfirmationTokenError extends Error {
  constructor() {
    super('Token de confirmação inválido ou expirado')
    this.name = 'InvalidConfirmationTokenError'
  }
}

export class AlreadyConfirmedError extends Error {
  constructor() {
    super('Cadastro já confirmado')
    this.name = 'AlreadyConfirmedError'
  }
}

export class NoTermsVersionError extends Error {
  constructor() {
    super('Nenhuma versão de termos cadastrada — rode o seed antes de confirmar')
    this.name = 'NoTermsVersionError'
  }
}

/**
 * Confirms the school terms acceptance via the email link token.
 * No login required — the token proves the recipient. Records IP + timestamp,
 * registers a TermsAcceptance for each active terms version, activates the unit.
 */
export async function confirmSchool(token: string, ip: string): Promise<Unit> {
  const unit = await prisma.unit.findUnique({ where: { confirmationToken: token } })
  if (!unit) throw new InvalidConfirmationTokenError()
  if (unit.confirmedAt) throw new AlreadyConfirmedError()
  if (
    !unit.confirmationTokenExpiresAt ||
    unit.confirmationTokenExpiresAt.getTime() < Date.now()
  ) {
    throw new InvalidConfirmationTokenError()
  }

  // Pegar a versão mais recente de CADA kind de termo.
  const allVersions = await prisma.termsVersion.findMany({
    orderBy: { createdAt: 'desc' },
  })
  const latestByKind = new Map<string, (typeof allVersions)[number]>()
  for (const tv of allVersions) {
    if (!latestByKind.has(tv.kind)) latestByKind.set(tv.kind, tv)
  }
  const termsToAccept = [...latestByKind.values()]

  // Nunca ativar sem registrar aceite — é a prova legal (LGPD) que justifica o fluxo.
  if (termsToAccept.length === 0) throw new NoTermsVersionError()

  const activated = await prisma.$transaction(async (tx) => {
    for (const tv of termsToAccept) {
      await tx.termsAcceptance.create({
        data: { unitId: unit.id, termsVersionId: tv.id, ip, acceptedAt: new Date() },
      })
    }

    return tx.unit.update({
      where: { id: unit.id },
      data: {
        status: 'ACTIVE',
        confirmedAt: new Date(),
        confirmationToken: null, // single-use
      },
    })
  })

  // Convidar o responsável a acessar a plataforma (Clerk). Não bloqueia o aceite.
  await inviteUnitResponsible({ email: unit.responsibleEmail, unitId: unit.id })

  return activated
}

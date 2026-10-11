import { randomUUID } from 'node:crypto'
import { getMasterAsaasClient } from '../integration/asaas/client'
import { buildSubAccountWebhook } from '../integration/asaas/webhook-config'
import { encrypt } from '../crypto'
import { prisma } from '../db'
import { CreateSchoolSchema, UpdateSchoolSchema, type CreateSchoolInput, type UpdateSchoolInput } from '../validations/unit'
import { getPlan } from '../data/plans'
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

export class InvalidPlanError extends Error {
  constructor() {
    super('Plano inválido ou desconto maior que o preço')
    this.name = 'InvalidPlanError'
  }
}

export class DueDayImmutableError extends Error {
  readonly status = 400
  constructor() {
    super('BillingConfig.dueDay cannot change after the school is created')
    this.name = 'DueDayImmutableError'
  }
}

export class UnitNotFoundError extends Error {
  readonly status = 404
  constructor() {
    super('Escola não encontrada')
    this.name = 'UnitNotFoundError'
  }
}

// Token de confirmação válido por 7 dias.
const CONFIRMATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

// ─── Service ──────────────────────────────────────────────────────────────────

// Unit + BillingConfig + Subjects in one transaction (status PENDING); the sub-account comes after.
async function createPendingUnit(
  data: CreateSchoolInput,
  planPriceCents: number
): Promise<{ id: string; confirmationToken: string }> {
  const confirmationToken = randomUUID()
  const confirmationTokenExpiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS)
  const enrollmentLinkToken = randomUUID()

  // 4. Criar Unit + BillingConfig + Subjects em transação atômica (status PENDING)
  const unit = await prisma.$transaction(async (tx) => {
    const newUnit = await tx.unit.create({
      data: {
        name: data.name,
        cnpj: data.cnpj,
        legalName: data.legalName ?? null,
        tradeName: data.tradeName ?? null,
        cnpjStatus: data.cnpjStatus ?? null,
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
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
        confirmationToken,
        confirmationTokenExpiresAt,
        enrollmentLinkToken,
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
        planId: data.plan.planId,
        planPriceCents,
        isBeta: data.plan.isBeta,
        discountType: data.plan.discountType ?? null,
        discountValueBp: data.plan.discountValueBp ?? null,
        discountValueCents: data.plan.discountValueCents ?? null,
      },
    })

    await tx.subject.createMany({
      data: data.subjects.map((s) => ({
        unitId: newUnit.id,
        name: s.name,
        nfseServiceCode: s.nfseServiceCode,
        priceCents: s.priceCents,
        quarterlyPriceCents: s.quarterlyPriceCents ?? null,
        semiannualPriceCents: s.semiannualPriceCents ?? null,
        annualPriceCents: s.annualPriceCents ?? null,
      })),
    })

    return newUnit
  })
  return { id: unit.id, confirmationToken }
}

// A failed provisioning leaves a PENDING Unit with no sub-account; the same CNPJ may retry it.
function isResumable<T extends { status: string; asaasAccountId: string | null; confirmationToken: string | null }>(
  unit: T
): unit is T & { confirmationToken: string } {
  return unit.status === 'PENDING' && unit.asaasAccountId === null && unit.confirmationToken !== null
}

export async function createSchool(
  input: CreateSchoolInput,
  baseUrl: string
): Promise<Unit> {
  // 1. Validar input
  const data = CreateSchoolSchema.parse(input)

  // 2. Verificar CNPJ duplicado
  const existing = await prisma.unit.findUnique({
    where: { cnpj: data.cnpj },
    select: {
      id: true,
      status: true,
      asaasAccountId: true,
      confirmationToken: true,
      name: true,
      cnpj: true,
      email: true,
      phone: true,
      cep: true,
      address: true,
      number: true,
      neighborhood: true,
      responsibleName: true,
      responsibleEmail: true,
    },
  })
  if (existing && !isResumable(existing)) throw new DuplicateCnpjError()
  const resumable = existing && isResumable(existing) ? existing : null

  // A resume only retries the provisioning: what is stored wins over the resubmitted payload.
  const identity = resumable ?? data

  // Before any write: the webhook is created together with the sub-account and its token is unreadable later
  const webhook = buildSubAccountWebhook(baseUrl, identity.email)

  let unit: { id: string; confirmationToken: string }
  if (resumable) {
    // Two concurrent resumes would each create a sub-account and one apiKey would be lost for good.
    const claim = await prisma.unit.updateMany({
      where: { id: resumable.id, asaasAccountId: null },
      data: { asaasAccountId: claimToken(resumable.id) },
    })
    if (claim.count === 0) throw new DuplicateCnpjError()
    unit = { id: resumable.id, confirmationToken: resumable.confirmationToken }
  } else {
    // 2b. Resolver preço do plano (snapshot) e validar desconto vs preço
    const plan = getPlan(data.plan.planId)
    if (!plan) throw new InvalidPlanError()
    if (data.plan.discountValueCents !== undefined && data.plan.discountValueCents >= plan.priceCents) {
      throw new InvalidPlanError()
    }
    unit = await createPendingUnit(data, plan.priceCents)
  }

  // 5. Criar subconta Asaas (fora da transaction — se falhar, Unit fica em PENDING)
  let asaasAccountId: string | undefined
  let asaasApiKeyEnc: string | undefined
  let asaasWalletId: string | undefined

  try {
    const subAccount = await getMasterAsaasClient().createSubAccount({
      name: identity.name,
      email: identity.email,
      cpfCnpj: identity.cnpj,
      mobilePhone: identity.phone,
      address: identity.address,
      addressNumber: identity.number,
      province: identity.neighborhood,
      postalCode: identity.cep,
      webhooks: [webhook],
    })

    asaasAccountId = subAccount.id
    asaasWalletId = subAccount.walletId ?? undefined
    asaasApiKeyEnc = await encrypt(subAccount.apiKey)
  } catch (err) {
    // Only while no sub-account exists: releasing after it was created would allow a duplicate.
    if (resumable && !asaasAccountId) await releaseClaim(unit.id)
    throw new AsaasProvisionError(err)
  }

  // 6. Salvar dados da subconta. Status segue PENDING até o aceite via link.
  let updatedUnit: Unit
  try {
    updatedUnit = await prisma.unit.update({
      where: resumable ? { id: unit.id, asaasAccountId: claimToken(unit.id) } : { id: unit.id },
      data: {
        asaasAccountId,
        asaasApiKeyEnc,
        asaasWalletId,
        ...(resumable && { confirmationTokenExpiresAt: new Date(Date.now() + CONFIRMATION_TTL_MS) }),
      },
    })
  } catch (err) {
    // The apiKey is only returned at creation: the ids are all that is left to recover the account.
    console.error(`[onboarding] sub-account created but not saved — unitId=${unit.id} asaasAccountId=${asaasAccountId}`, err)
    throw err
  }

  // 7. Enviar e-mail de confirmação ao responsável (não bloqueia se falhar)
  const confirmUrl = `${baseUrl.replace(/\/$/, '')}/confirmar/${unit.confirmationToken}`
  await sendConfirmationEmail({
    to: identity.responsibleEmail,
    responsibleName: identity.responsibleName,
    schoolName: identity.name,
    confirmUrl,
  })

  return updatedUnit
}

const claimToken = (unitId: string) => `claim:${unitId}`

async function releaseClaim(unitId: string): Promise<void> {
  try {
    await prisma.unit.updateMany({
      where: { id: unitId, asaasAccountId: claimToken(unitId) },
      data: { asaasAccountId: null },
    })
  } catch (err) {
    console.error(`[onboarding] could not release the provisioning claim — unitId=${unitId}`, err)
  }
}

/**
 * Atualiza uma escola existente (admin). Edita Unit + BillingConfig + Subjects
 * numa transação atômica. NÃO toca cnpj, Asaas, status nem e-mail —
 * são imutáveis/fora do escopo desta operação. Matérias usam delete-all + create
 * (mesmo padrão do create), então a lista enviada é a verdade final.
 */
export async function updateSchool(unitId: string, input: UpdateSchoolInput): Promise<Unit> {
  const data = UpdateSchoolSchema.parse(input)

  const existing = await prisma.unit.findUnique({
    where: { id: unitId },
    include: { billingConfig: { select: { dueDay: true } } },
  })
  if (!existing) throw new UnitNotFoundError()
  // Subscriptions are aligned to dueDay, so it never changes. See ADR-0007.
  if (existing.billingConfig && data.billing.dueDay !== existing.billingConfig.dueDay) {
    throw new DueDayImmutableError()
  }

  const plan = getPlan(data.plan.planId)
  if (!plan) throw new InvalidPlanError()
  const planPriceCents = plan.priceCents
  if (data.plan.discountValueCents !== undefined && data.plan.discountValueCents >= planPriceCents) {
    throw new InvalidPlanError()
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.unit.update({
      where: { id: unitId },
      data: {
        name: data.name,
        legalName: data.legalName ?? null,
        tradeName: data.tradeName ?? null,
        cnpjStatus: data.cnpjStatus ?? null,
        email: data.email,
        phone: data.phone,
        cep: data.cep,
        address: data.address,
        number: data.number,
        neighborhood: data.neighborhood,
        complement: data.complement ?? null,
        city: data.city,
        state: data.state,
        isFranchise: data.isFranchise,
        franchiseParent: data.franchiseParent ?? null,
        responsibleName: data.responsibleName,
        responsibleEmail: data.responsibleEmail,
        responsiblePhone: data.responsiblePhone,
      },
    })

    await tx.billingConfig.update({
      where: { unitId },
      data: {
        closingDay: data.billing.closingDay,
        lateFeePercent: data.billing.lateFeePercent,
        monthlyInterestBp: data.billing.monthlyInterestBp,
        cardFeePayer: data.billing.cardFeePayer,
        negativacaoFeePayer: data.billing.negativacaoFeePayer,
        municipalRegistration: data.billing.municipalRegistration,
        planId: data.plan.planId,
        planPriceCents,
        isBeta: data.plan.isBeta,
        discountType: data.plan.discountType ?? null,
        discountValueBp: data.plan.discountValueBp ?? null,
        discountValueCents: data.plan.discountValueCents ?? null,
      },
    })

    await tx.subject.deleteMany({ where: { unitId } })
    await tx.subject.createMany({
      data: data.subjects.map((s) => ({
        unitId,
        name: s.name,
        nfseServiceCode: s.nfseServiceCode,
        priceCents: s.priceCents,
        quarterlyPriceCents: s.quarterlyPriceCents ?? null,
        semiannualPriceCents: s.semiannualPriceCents ?? null,
        annualPriceCents: s.annualPriceCents ?? null,
        isActive: s.isActive,
      })),
    })

    return updated
  })
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

  // Pegar a versão mais recente de CADA kind de termo global da plataforma (unitId null).
  // Contratos por-escola (ESCOLA_RESPONSAVEL, unitId preenchido) não entram aqui —
  // são aceitos pelo responsável no fluxo de matrícula, não pela escola no onboarding.
  const allVersions = await prisma.termsVersion.findMany({
    where: { unitId: null },
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

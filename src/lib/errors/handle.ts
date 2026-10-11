import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  DuplicateCnpjError,
  DueDayImmutableError,
  UnitNotFoundError,
  InvalidPlanError,
  AsaasProvisionError,
} from '@/lib/services/onboarding.service'
import { EnrollmentNotFoundError, EnrollmentNotCancellableError } from '@/lib/services/subscription.service'
import { GuardianNotFoundError } from '@/lib/services/approval.service'
import { EnrollmentNotStartedError, GuardianNotRegisteredError, MissingAsaasKeyError, SubscriptionManagedError } from '@/lib/services/billing.service'
import { InvoiceNotFoundError, InvoiceInvalidStateError } from '@/lib/services/invoice-detail.service'

export interface ErrorContext {
  /** Identificação da origem, ex: 'PATCH /api/schools/[unitId]'. */
  route: string
  unitId?: string
  /** Sobrescreve a mensagem amigável padrão, se quiser algo específico. */
  userMessage?: string
  /**
   * true só em rota admin-only (Admin IX). Rota tenant-facing (orientador/responsável)
   * nunca deve setar isso — `detail` (causa técnica real: erro do Prisma, do decrypt, etc.)
   * fica de fora da resposta HTTP, mesmo inspecionável via DevTools de rede.
   */
  exposeDetail?: boolean
}

export interface HandledError {
  message: string
  code: string
  status: number
  /** Causa técnica real (ex: "connection refused at 5432"). Volta na resposta da API. */
  detail: string
}

/** Extrai a mensagem técnica de qualquer valor lançado (Error, string, objeto). */
function extractDetail(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/**
 * Padrão único de tratamento de erro do projeto:
 *  1. console.error com a CAUSA REAL (erro técnico) + contexto estruturado;
 *  2. devolve { message, code, status, detail } — `detail` carrega a causa técnica
 *     real para a resposta da API (ferramenta interna admin); o front loga `detail`
 *     no console e mostra `message` ao usuário.
 * Toda rota/handler deve usar isto em vez de inventar o próprio formato.
 */
export function handleError(error: unknown, ctx: ErrorContext): HandledError {
  const known = mapKnown(error)
  const detail = extractDetail(error)

  // Log estruturado: contexto + causa real (nunca engolir o erro técnico).
  console.error(
    `[${ctx.route}]${ctx.unitId ? ` unit=${ctx.unitId}` : ''} code=${known.code}`,
    error
  )

  return {
    message: ctx.userMessage ?? known.message,
    code: known.code,
    status: known.status,
    detail,
  }
}

/**
 * Atalho: trata o erro e já devolve o NextResponse padronizado.
 * Resposta sempre inclui `error` (amigável) e `code`. `detail` (causa técnica real)
 * só entra no corpo quando `ctx.exposeDetail` for true — reservado para rota admin.
 * Use nas rotas: `return errorResponse(err, { route: '...' })`.
 */
export function errorResponse(error: unknown, ctx: ErrorContext): NextResponse {
  const h = handleError(error, ctx)
  return NextResponse.json(
    { error: h.message, code: h.code, ...(ctx.exposeDetail ? { detail: h.detail } : {}) },
    { status: h.status }
  )
}

function mapKnown(error: unknown): Omit<HandledError, 'detail'> {
  if (error instanceof DuplicateCnpjError) {
    return { message: 'CNPJ já cadastrado.', code: 'DUPLICATE_CNPJ', status: 409 }
  }
  if (error instanceof DueDayImmutableError) {
    return { message: 'O dia de vencimento não pode ser alterado depois que a escola é criada.', code: 'DUE_DAY_IMMUTABLE', status: 400 }
  }
  if (error instanceof UnitNotFoundError) {
    return { message: 'Escola não encontrada.', code: 'NOT_FOUND', status: 404 }
  }
  if (error instanceof GuardianNotFoundError) {
    return { message: 'Matrícula não encontrada.', code: 'NOT_FOUND', status: 404 }
  }
  if (error instanceof EnrollmentNotFoundError) {
    return { message: 'Matrícula não encontrada.', code: 'NOT_FOUND', status: 404 }
  }
  if (error instanceof EnrollmentNotCancellableError) {
    return { message: 'Matrícula pendente deve ser recusada, não cancelada.', code: 'ENROLLMENT_NOT_CANCELLABLE', status: 409 }
  }
  if (error instanceof InvalidPlanError) {
    return { message: 'Plano inválido ou desconto maior que o preço.', code: 'INVALID_PLAN', status: 400 }
  }
  if (error instanceof AsaasProvisionError) {
    return { message: 'Falha ao provisionar subconta de pagamento.', code: 'ASAAS_PROVISION', status: 502 }
  }
  if (error instanceof EnrollmentNotStartedError) {
    return { message: 'Matrícula sem data de início — não é possível calcular a 1ª cobrança.', code: 'ENROLLMENT_NOT_STARTED', status: 422 }
  }
  if (error instanceof GuardianNotRegisteredError) {
    return { message: 'Responsável ainda sem cadastro na Asaas — aprove a matrícula antes de cobrar.', code: 'GUARDIAN_NOT_REGISTERED', status: 409 }
  }
  if (error instanceof SubscriptionManagedError) {
    return { message: 'Esta matrícula é cobrada por assinatura — a Asaas gera as cobranças dos próximos ciclos.', code: 'SUBSCRIPTION_MANAGED', status: 409 }
  }
  if (error instanceof MissingAsaasKeyError) {
    return { message: 'Escola sem chave Asaas configurada — não é possível emitir cobrança.', code: 'MISSING_ASAAS_KEY', status: 409 }
  }
  if (error instanceof InvoiceNotFoundError) {
    return { message: 'Cobrança não encontrada.', code: 'NOT_FOUND', status: 404 }
  }
  if (error instanceof InvoiceInvalidStateError) {
    return { message: 'Cobrança não pode ser cancelada neste status.', code: 'INVOICE_INVALID_STATE', status: 409 }
  }
  if (error instanceof ZodError) {
    return { message: 'Dados inválidos. Confira os campos destacados.', code: 'VALIDATION', status: 400 }
  }
  return { message: 'Erro inesperado. Tente novamente.', code: 'INTERNAL', status: 500 }
}

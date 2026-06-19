import { ZodError } from 'zod'
import {
  DuplicateCnpjError,
  UnitNotFoundError,
  InvalidPlanError,
  AsaasProvisionError,
} from '@/lib/services/onboarding.service'

export interface ErrorContext {
  /** Identificação da origem, ex: 'PATCH /api/escolas/[unitId]'. */
  route: string
  unitId?: string
  /** Sobrescreve a mensagem amigável padrão, se quiser algo específico. */
  userMessage?: string
}

export interface HandledError {
  message: string
  code: string
  status: number
}

/**
 * Padrão único de tratamento de erro do projeto:
 *  1. console.error com a CAUSA REAL (erro técnico) + contexto estruturado;
 *  2. devolve { message, code, status } amigável para a UI montar um toast.
 * Toda rota/handler deve usar isto em vez de inventar o próprio formato.
 */
export function handleError(error: unknown, ctx: ErrorContext): HandledError {
  const known = mapKnown(error)

  // Log estruturado: contexto + causa real (nunca engolir o erro técnico).
  console.error(
    `[${ctx.route}]${ctx.unitId ? ` unit=${ctx.unitId}` : ''} code=${known.code}`,
    error
  )

  return {
    message: ctx.userMessage ?? known.message,
    code: known.code,
    status: known.status,
  }
}

function mapKnown(error: unknown): HandledError {
  if (error instanceof DuplicateCnpjError) {
    return { message: 'CNPJ já cadastrado.', code: 'DUPLICATE_CNPJ', status: 409 }
  }
  if (error instanceof UnitNotFoundError) {
    return { message: 'Escola não encontrada.', code: 'NOT_FOUND', status: 404 }
  }
  if (error instanceof InvalidPlanError) {
    return { message: 'Plano inválido ou desconto maior que o preço.', code: 'INVALID_PLAN', status: 400 }
  }
  if (error instanceof AsaasProvisionError) {
    return { message: 'Falha ao provisionar subconta de pagamento.', code: 'ASAAS_PROVISION', status: 502 }
  }
  if (error instanceof ZodError) {
    return { message: 'Dados inválidos. Confira os campos destacados.', code: 'VALIDATION', status: 400 }
  }
  return { message: 'Erro inesperado. Tente novamente.', code: 'INTERNAL', status: 500 }
}

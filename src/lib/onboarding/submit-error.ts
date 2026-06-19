/**
 * Mapeia respostas de erro do POST /api/setup/escola para mensagens
 * user-friendly em pt-BR. Pure function — sem side effects, testável.
 *
 * O backend responde `{ error, code?, issues? }`. Preferimos a mensagem do
 * backend quando ela é específica; caímos em mensagens por status quando não.
 */

export interface ApiErrorBody {
  error?: string
  code?: string
  issues?: {
    formErrors?: string[]
    fieldErrors?: Record<string, string[] | undefined>
  }
}

const FALLBACK = 'Erro inesperado ao cadastrar escola. Tente novamente ou contate o suporte.'

/** Extrai a primeira mensagem de erro de campo do flatten do Zod, se houver. */
function firstFieldError(issues: ApiErrorBody['issues']): string | null {
  if (!issues) return null
  if (issues.formErrors?.length) return issues.formErrors[0]
  for (const messages of Object.values(issues.fieldErrors ?? {})) {
    if (messages?.length) return messages[0]
  }
  return null
}

/**
 * Mensagem amigável para o usuário a partir do status HTTP + corpo da resposta.
 * `status === 0` representa erro de rede / fetch que nunca completou.
 */
export function mapSubmitError(status: number, body: ApiErrorBody | null): string {
  const b = body ?? {}

  switch (status) {
    case 0:
      return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
    case 401:
      return b.error ?? 'Sessão expirada. Faça login novamente.'
    case 403:
      return b.error ?? 'Você não tem permissão para cadastrar escolas. Contate o suporte.'
    case 400: {
      const field = firstFieldError(b.issues)
      if (field) return `Dados inválidos: ${field}`
      return b.error ?? 'Dados inválidos. Confira os campos do formulário.'
    }
    case 409:
      return b.error ?? 'CNPJ já cadastrado.'
    case 502:
      return b.error ?? 'Falha ao provisionar a subconta de pagamento. Tente novamente.'
    case 500:
    default:
      return b.error ?? FALLBACK
  }
}

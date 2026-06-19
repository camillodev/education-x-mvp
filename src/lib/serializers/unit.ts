/**
 * Serializer seguro para Unit — remove todos os campos PII/secrets antes de
 * enviar ao cliente. Nunca expõe dados criptografados ou tokens internos.
 */

type SensitiveFields =
  | 'responsibleCpfEnc'
  | 'asaasApiKeyEnc'
  | 'asaasWalletId'
  | 'asaasAccountId'
  | 'confirmationToken'
  | 'confirmationTokenExpiresAt'

type BillingConfigSensitiveFields = 'asaasWebhookTokenEnc'

/**
 * Remove os 6 campos sensíveis de um objeto Unit (ou similar).
 * Preserva todas as relações (billingConfig, subjects, etc.) e demais campos.
 */
export function toSafeUnit<T extends Record<string, unknown>>(
  unit: T
): Omit<T, SensitiveFields> {
  const {
    responsibleCpfEnc: _cpf,
    asaasApiKeyEnc: _key,
    asaasWalletId: _wallet,
    asaasAccountId: _account,
    confirmationToken: _token,
    confirmationTokenExpiresAt: _tokenExp,
    ...safe
  } = unit as T & Record<SensitiveFields, unknown>
  return safe as Omit<T, SensitiveFields>
}

/**
 * Remove campos sensíveis do BillingConfig antes de enviar ao cliente.
 * Auditado contra o schema Prisma (BillingConfig em prisma/schema.prisma):
 * - asaasWebhookTokenEnc (AES-256-GCM) — REMOVIDO
 * Todos os demais campos do model são não-sensíveis (configurações de cobrança, flags, plano).
 * Subject não possui campos sensíveis (*Enc ou secrets) — auditado.
 */
export function toSafeBillingConfig<T extends Record<string, unknown>>(
  billingConfig: T
): Omit<T, BillingConfigSensitiveFields> {
  const { asaasWebhookTokenEnc: _webhookToken, ...safe } =
    billingConfig as T & Record<BillingConfigSensitiveFields, unknown>
  return safe as Omit<T, BillingConfigSensitiveFields>
}

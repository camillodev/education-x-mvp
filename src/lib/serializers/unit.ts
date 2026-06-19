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

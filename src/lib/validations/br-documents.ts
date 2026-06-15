// Brazilian document & contact validators.
// Pure functions, no I/O — receive already-stripped (digits-only) strings.

/**
 * Validates a CNPJ by its two check digits (Receita Federal algorithm).
 * Expects 14 digits, punctuation already stripped.
 */
export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false
  // Reject known invalid sequences (all same digit, e.g. 00000000000000)
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calcDigit = (base: string, weights: number[]): number => {
    const sum = base
      .split('')
      .reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0)
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigit(cnpj.slice(0, 12), firstWeights)
  if (d1 !== Number(cnpj[12])) return false

  const d2 = calcDigit(cnpj.slice(0, 13), secondWeights)
  return d2 === Number(cnpj[13])
}

/**
 * Validates a CPF by its two check digits.
 * Expects 11 digits, punctuation already stripped.
 */
export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcDigit = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += Number(cpf[i]) * (length + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  if (calcDigit(9) !== Number(cpf[9])) return false
  return calcDigit(10) === Number(cpf[10])
}

// Valid Brazilian area codes (DDD). Source: Anatel plan.
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

/**
 * Validates a Brazilian phone number (digits only, no punctuation).
 * Accepts 10 digits (landline) or 11 digits (mobile, leading 9 after DDD).
 * Validates the DDD against the Anatel area-code plan.
 */
export function isValidBrPhone(phone: string): boolean {
  if (!/^\d{10,11}$/.test(phone)) return false
  const ddd = Number(phone.slice(0, 2))
  if (!VALID_DDDS.has(ddd)) return false
  // Mobile (11 digits): the digit after the DDD must be 9.
  if (phone.length === 11 && phone[2] !== '9') return false
  return true
}

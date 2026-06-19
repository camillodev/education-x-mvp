// Pure money math for discounts. No I/O — fully testable.
// All amounts in cents (Int). Percent discounts use basis points (200 = 2%).

export type DiscountType = 'PERCENT' | 'FIXED'

export interface DiscountResult {
  discountCents: number
  finalCents: number
}

/**
 * Parses a user-typed pt-BR value ("10", "10,5", "1.234,56") into a number.
 * Strips thousands separators (.) and uses comma as decimal.
 */
export function parsePtBrNumber(value: string): number {
  const cleaned = value.replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/**
 * Computes the discount over a base price (cents).
 * - PERCENT: `value` is a percentage (e.g. "10" = 10%). Clamped to [0, 100].
 * - FIXED: `value` is reais (e.g. "50,00" = R$ 50). Converted to cents.
 * Discount never exceeds the base; final never goes below 0.
 */
export function computeDiscountedCents(
  baseCents: number,
  type: DiscountType,
  value: string
): DiscountResult {
  const n = parsePtBrNumber(value)
  if (n <= 0 || baseCents <= 0) {
    return { discountCents: 0, finalCents: Math.max(0, baseCents) }
  }

  let discountCents: number
  if (type === 'PERCENT') {
    const pct = Math.min(n, 100)
    discountCents = Math.round((baseCents * pct) / 100)
  } else {
    discountCents = Math.round(n * 100)
  }

  discountCents = Math.min(discountCents, baseCents) // nunca passa do preço
  return { discountCents, finalCents: baseCents - discountCents }
}

/**
 * Retorna o percentual de desconto (inteiro, arredondado) de um plano de fidelidade
 * em relação ao valor mensal base.
 * Ex: mensal 45000, trimestral 43000 → 4 (%)
 * Retorna 0 se base <= 0 ou tier >= base (sem desconto ou preço maior).
 */
export function planDiscountPercent(monthlyCents: number, tierMonthlyCents: number): number {
  if (monthlyCents <= 0 || tierMonthlyCents >= monthlyCents) return 0
  return Math.round(((monthlyCents - tierMonthlyCents) / monthlyCents) * 100)
}

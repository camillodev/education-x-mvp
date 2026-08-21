import { z } from 'zod'

export const EnrollmentPlanSchema = z.enum(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL'])
export type EnrollmentPlanValue = z.infer<typeof EnrollmentPlanSchema>

export const PlanStepSchema = z.object({
  plan: EnrollmentPlanSchema,
})

const PLAN_TO_SUBJECT_FIELD = {
  MONTHLY: 'priceCents',
  QUARTERLY: 'quarterlyPriceCents',
  SEMIANNUAL: 'semiannualPriceCents',
  ANNUAL: 'annualPriceCents',
} as const

export interface SubjectPricing {
  priceCents: number
  quarterlyPriceCents: number | null
  semiannualPriceCents: number | null
  annualPriceCents: number | null
}

// R5a — agreedPriceCents deriva do campo de Subject correspondente ao plano (snapshot).
// Retorna null se o Subject não tem esse plano configurado (R3 — plano não selecionável).
export function priceCentsForPlan(subject: SubjectPricing, plan: EnrollmentPlanValue): number | null {
  return subject[PLAN_TO_SUBJECT_FIELD[plan]]
}

// Planos disponíveis pra um conjunto de Subjects: só aparece se TODOS os subjects
// selecionados têm preço configurado para aquele plano (R3 — 1 plano cobre todas as matérias).
export function availablePlans(subjects: SubjectPricing[]): EnrollmentPlanValue[] {
  const plans: EnrollmentPlanValue[] = ['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']
  return plans.filter((plan) => subjects.every((s) => priceCentsForPlan(s, plan) !== null))
}

// Economia percentual do plano vs. mensal, arredondada — só faz sentido pra planos != MONTHLY.
export function economyPercent(monthlyCents: number, planCents: number): number {
  if (monthlyCents <= 0) return 0
  return Math.round(((monthlyCents - planCents) / monthlyCents) * 100)
}

'use client'

import type { SubjectInput } from '@/lib/validations/unit'
import { formatBRL } from '@/lib/format'
import { planDiscountPercent } from '@/lib/pricing'
import { Badge } from '@/components/ui/badge'

/**
 * Cards de plano de fidelidade para o cadastro de uma matéria.
 * Cada plano (Mensal/Trimestral/Semestral/Anual) é um card onde a escola digita o
 * VALOR MENSAL daquele plano — o período é fidelidade, a cobrança é sempre mensal.
 * O % de desconto é calculado vs. o mensal (base). O maior desconto ganha "Melhor preço".
 *
 * Não é seleção (isso é a matrícula do responsável) — aqui é entrada de dados + preview.
 */

type PlanKey = 'priceCents' | 'quarterlyPriceCents' | 'semiannualPriceCents' | 'annualPriceCents'

interface PlanDef {
  key: PlanKey
  label: string
  required: boolean
}

const PLANS: PlanDef[] = [
  { key: 'priceCents', label: 'Mensal', required: true },
  { key: 'quarterlyPriceCents', label: 'Trimestral', required: false },
  { key: 'semiannualPriceCents', label: 'Semestral', required: false },
  { key: 'annualPriceCents', label: 'Anual', required: true },
]

function parseBRL(value: string): number {
  const numeric = value.replace(/\D/g, '')
  return parseInt(numeric || '0', 10)
}

interface Props {
  subject: SubjectInput
  onChange: (patch: Partial<SubjectInput>) => void
  /** prefixo único pra aria-labels quando há mais de um formulário na tela */
  idPrefix?: string
}

export function SubjectPlanFields({ subject, onChange, idPrefix = 'novo' }: Props) {
  const monthly = subject.priceCents

  // Qual plano tem o maior desconto (entre os preenchidos > 0)? Ganha "Melhor preço".
  const bestKey = PLANS.reduce<PlanKey | null>((best, p) => {
    if (p.key === 'priceCents') return best
    const cents = subject[p.key] as number | undefined
    if (!cents || cents <= 0) return best
    const pct = planDiscountPercent(monthly, cents)
    if (pct <= 0) return best
    const bestPct = best ? planDiscountPercent(monthly, subject[best] as number) : 0
    return pct > bestPct ? p.key : best
  }, null)

  const annualCents = subject.annualPriceCents

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-subtle)]">
        Valor <strong>mensal</strong> cobrado em cada plano. Quanto mais longo o período, maior o desconto.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {PLANS.map((p) => {
          const cents = (subject[p.key] as number | undefined) ?? 0
          const pct = p.key === 'priceCents' ? 0 : planDiscountPercent(monthly, cents)
          const isBest = bestKey === p.key
          const filled = cents > 0
          return (
            <div
              key={p.key}
              className={`rounded-md border-2 p-3 transition-colors ${
                isBest
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-softer)]'
                  : 'border-[var(--color-border)] bg-white'
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {p.label}
                  {p.required && <span className="ml-0.5 text-red-500">*</span>}
                </span>
                <span className="flex items-center gap-1.5">
                  {p.key === 'priceCents' && (
                    <Badge variant="neutral" size="sm">base</Badge>
                  )}
                  {filled && pct > 0 && (
                    <Badge variant="primary" size="sm">−{pct}%</Badge>
                  )}
                  {isBest && (
                    <Badge variant="success" size="sm">Melhor preço</Badge>
                  )}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={p.required ? 'R$ 0,00 *' : 'opcional'}
                  value={filled ? formatBRL(cents) : ''}
                  onChange={(e) => {
                    const v = parseBRL(e.target.value)
                    // Anual é obrigatório → mantém number; opcionais limpam pra undefined quando vazios.
                    onChange({ [p.key]: p.required ? v : v || undefined } as Partial<SubjectInput>)
                  }}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  aria-label={`Valor mensal do plano ${p.label}`}
                  id={`${idPrefix}-${p.key}`}
                />
                <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">/mês</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Card-resumo: economia do plano de maior desconto vs. mensal (preview p/ o responsável). */}
      {bestKey && monthly > 0 && (annualCents ?? 0) > 0 && (
        <div className="rounded-md bg-[var(--color-primary)] p-3 text-white">
          <div className="text-xs font-medium opacity-85">
            Plano mais econômico: {PLANS.find((p) => p.key === bestKey)?.label}
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {formatBRL(subject[bestKey] as number)}
            </span>
            <span className="text-sm opacity-85">/mês</span>
          </div>
          <div className="mt-1 text-xs opacity-90">
            Economia de {formatBRL(monthly - (subject[bestKey] as number))}/mês vs. o plano mensal.
          </div>
        </div>
      )}
    </div>
  )
}

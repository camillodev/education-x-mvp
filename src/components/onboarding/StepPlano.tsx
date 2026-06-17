'use client'

import type { PlanoState } from '@/hooks/use-onboarding'
import { SCHOOL_PLANS, getPlan } from '@/lib/data/plans'
import { formatBRL } from '@/lib/format'
import { DiscountField } from '@/components/patterns/DiscountField'
import type { DiscountType } from '@/lib/pricing'

interface Props {
  plano: PlanoState
  onChange: (plano: Partial<PlanoState>) => void
}

export function StepPlano({ plano, onChange }: Props) {
  const selected = getPlan(plano.planId)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-primary)]">Plano da escola</h2>
        <p className="mt-1 text-sm text-gray-500">
          O que a escola paga à Impact X pela plataforma. Acompanha o volume de cobranças por mês.
        </p>
      </div>

      {/* Cards de plano (radio) */}
      <div role="radiogroup" aria-label="Plano da escola" className="space-y-3">
        {SCHOOL_PLANS.map((p) => {
          const active = plano.planId === p.id
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ planId: p.id })}
              className={`flex w-full items-center gap-3 rounded-md border-2 p-4 text-left transition-colors ${
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-softer)]'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? 'border-[var(--color-primary)]' : 'border-gray-300'
                }`}
              >
                {active && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-gray-800">{p.name}</div>
                <div className="mt-0.5 text-xs text-gray-500">{p.limit}</div>
                <div className="mt-0.5 text-xs text-gray-400">{p.desc}</div>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-base font-bold text-gray-800">{formatBRL(p.priceCents)}</div>
                <div className="text-xs text-gray-400">/mês</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Toggle beta */}
      <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border border-gray-200 p-4">
        <span>
          <span className="block text-sm font-medium text-gray-700">Escola no plano beta</span>
          <span className="mt-0.5 block text-xs text-gray-400">
            Condição especial de parceria durante o período beta.
          </span>
        </span>
        <input
          type="checkbox"
          checked={plano.isBeta}
          onChange={(e) => onChange({ isBeta: e.target.checked })}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          aria-label="Escola no plano beta"
        />
      </label>

      {/* Desconto comercial */}
      <DiscountField
        baseCents={selected?.priceCents ?? 0}
        enabled={plano.discountEnabled}
        onEnabledChange={(b) => onChange({ discountEnabled: b })}
        type={plano.discountType}
        onTypeChange={(t: DiscountType) => onChange({ discountType: t })}
        value={plano.discountValue}
        onValueChange={(v) => onChange({ discountValue: v })}
        label="Aplicar desconto comercial"
      />
    </div>
  )
}

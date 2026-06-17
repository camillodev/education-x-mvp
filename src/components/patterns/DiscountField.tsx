'use client'

import { formatBRL } from '@/lib/format'
import { computeDiscountedCents, type DiscountType } from '@/lib/pricing'

interface DiscountFieldProps {
  baseCents: number
  enabled: boolean
  onEnabledChange: (b: boolean) => void
  type: DiscountType
  onTypeChange: (t: DiscountType) => void
  value: string
  onValueChange: (v: string) => void
  label?: string
}

/**
 * Reusable discount control: toggle + segmented (% / R$) + value input +
 * live calculation card (full price → discount → final).
 * Pure money math lives in `src/lib/pricing.ts`. Reused by onboarding (plan)
 * and enrollment (Tarefa 2) — keep it generic.
 */
export function DiscountField({
  baseCents,
  enabled,
  onEnabledChange,
  type,
  onTypeChange,
  value,
  onValueChange,
  label = 'Aplicar desconto',
}: DiscountFieldProps) {
  const { discountCents, finalCents } = computeDiscountedCents(baseCents, type, value)

  return (
    <div className="border-t border-gray-100 pt-4">
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          aria-label={label}
        />
      </label>

      {enabled && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            {/* Segmented %/R$ */}
            <div
              role="radiogroup"
              aria-label="Tipo de desconto"
              className="flex overflow-hidden rounded-md border border-gray-300"
            >
              {(['PERCENT', 'FIXED'] as DiscountType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  onClick={() => onTypeChange(t)}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'PERCENT' ? '%' : 'R$'}
                </button>
              ))}
            </div>

            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={type === 'PERCENT' ? '10' : '50,00'}
              aria-label="Valor do desconto"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          {/* Card de cálculo */}
          <div className="overflow-hidden rounded-md border border-gray-200">
            <Row label="Preço cheio" value={formatBRL(baseCents)} />
            <Row label="Desconto" value={`− ${formatBRL(discountCents)}`} />
            <Row label="Valor final" value={formatBRL(finalCents)} highlight />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`flex justify-between px-4 py-2.5 text-sm ${
        highlight ? 'border-t border-gray-200 bg-[var(--color-primary-softer)]' : 'bg-white'
      }`}
    >
      <span className={highlight ? 'font-semibold text-gray-800' : 'text-gray-500'}>{label}</span>
      <span
        className={
          highlight ? 'font-bold text-[var(--color-primary)]' : 'font-medium text-gray-700'
        }
      >
        {value}
      </span>
    </div>
  )
}

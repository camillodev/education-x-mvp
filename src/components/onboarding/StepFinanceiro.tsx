'use client'

import type { CobrancaState, PlanoState } from '@/hooks/use-onboarding'
import { SCHOOL_PLANS, getPlan } from '@/lib/data/plans'
import { formatBRL } from '@/lib/format'
import { DiscountField } from '@/components/patterns/DiscountField'
import type { DiscountType } from '@/lib/pricing'

interface Props {
  cobranca: CobrancaState
  plano: PlanoState
  onCobrancaChange: (c: Partial<CobrancaState>) => void
  onPlanoChange: (p: Partial<PlanoState>) => void
}

function bpToPercent(bp: number): string {
  return (bp / 100).toFixed(2)
}

function percentToBp(percent: string): number {
  return Math.round(parseFloat(percent || '0') * 100)
}

export function StepFinanceiro({
  cobranca,
  plano,
  onCobrancaChange,
  onPlanoChange,
}: Props) {
  const inputCls =
    'mt-1 block w-full rounded-md border border-[var(--color-border-input)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-ring)]'

  const selected = getPlan(plano.planId)

  return (
    <div className="space-y-6">
      {/* Eyebrow */}
      <div>
        <p className="label">PASSO 2 DE 3</p>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Financeiro</h1>
      </div>

      {/* Card 1: Cobrança aos responsáveis */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="label">COBRANÇA AOS RESPONSÁVEIS</div>
        <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
          Como a escola cobra as mensalidades dos responsáveis financeiros. Isto não é o pagamento
          da escola à Impact X.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 [&>div]:min-w-0">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]" htmlFor="closingDay">
              Dia de fechamento *
            </label>
            <p className="text-xs text-[var(--color-text-subtle)]">Quando a mensalidade é apurada (1 a 28)</p>
            <input
              id="closingDay"
              type="number"
              min={1}
              max={28}
              value={cobranca.closingDay}
              onChange={(e) => onCobrancaChange({ closingDay: parseInt(e.target.value) || 1 })}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)]" htmlFor="dueDay">
              Dia de vencimento do boleto *
            </label>
            <p className="text-xs text-[var(--color-text-subtle)]">Quando o responsável deve pagar (1 a 28)</p>
            <input
              id="dueDay"
              type="number"
              min={1}
              max={28}
              value={cobranca.dueDay}
              onChange={(e) => onCobrancaChange({ dueDay: parseInt(e.target.value) || 1 })}
              className={inputCls}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-[var(--color-text)]"
              htmlFor="lateFee"
            >
              Multa por atraso (%)
            </label>
            <input
              id="lateFee"
              type="number"
              min={0}
              max={5}
              step={0.01}
              value={bpToPercent(cobranca.lateFeePercent)}
              onChange={(e) => onCobrancaChange({ lateFeePercent: percentToBp(e.target.value) })}
              className={inputCls}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-[var(--color-text)]"
              htmlFor="monthlyInterest"
            >
              Juros mensais (% a.m.)
            </label>
            <input
              id="monthlyInterest"
              type="number"
              min={0}
              max={3}
              step={0.01}
              value={bpToPercent(cobranca.monthlyInterestBp)}
              onChange={(e) => onCobrancaChange({ monthlyInterestBp: percentToBp(e.target.value) })}
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              className="block text-sm font-medium text-[var(--color-text)]"
              htmlFor="municipalReg"
            >
              Inscrição municipal *
            </label>
            <input
              id="municipalReg"
              type="text"
              value={cobranca.municipalRegistration}
              onChange={(e) => onCobrancaChange({ municipalRegistration: e.target.value })}
              placeholder="Número da inscrição municipal para NFS-e"
              className={inputCls}
            />
          </div>
        </div>

        {/* Quem paga as taxas */}
        <div className="border-t border-[var(--color-border)] pt-4 mt-4">
          <h3 className="text-sm font-medium text-[var(--color-text)]">Quem paga as taxas</h3>
          <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
            Define quem arca com a taxa do cartão e a taxa de negativação.
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 [&>div]:min-w-0">
            <div>
              <label
                className="block text-sm font-medium text-[var(--color-text)]"
                htmlFor="cardFeePayer"
              >
                Taxa do cartão
              </label>
              <select
                id="cardFeePayer"
                value={cobranca.cardFeePayer}
                onChange={(e) =>
                  onCobrancaChange({ cardFeePayer: e.target.value as 'RESPONSAVEL' | 'ESCOLA' })
                }
                className={inputCls}
              >
                <option value="RESPONSAVEL">Responsável</option>
                <option value="ESCOLA">Escola</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium text-[var(--color-text)]"
                htmlFor="negativacaoFeePayer"
              >
                Taxa de negativação
              </label>
              <select
                id="negativacaoFeePayer"
                value={cobranca.negativacaoFeePayer}
                onChange={(e) =>
                  onCobrancaChange({ negativacaoFeePayer: e.target.value as 'RESPONSAVEL' | 'ESCOLA' })
                }
                className={inputCls}
              >
                <option value="RESPONSAVEL">Responsável</option>
                <option value="ESCOLA">Escola</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2: Plano da escola */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="label">PLANO DA ESCOLA</div>
        <p className="mt-2 text-sm text-[var(--color-text-subtle)]">
          O que a escola paga à Impact X pela plataforma. Acompanha o volume de cobranças por mês.
        </p>

        {/* Cards de plano (radio) */}
        <div role="radiogroup" aria-label="Plano da escola" className="mt-6 space-y-3">
          {SCHOOL_PLANS.map((p) => {
            const active = plano.planId === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPlanoChange({ planId: p.id })}
                className={`flex w-full items-center gap-3 rounded-md border-2 p-4 text-left transition-colors ${
                  active
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-softer)]'
                    : 'border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-muted)]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'
                  }`}
                >
                  {active && (
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">{p.name}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-subtle)]">{p.limit}</div>
                  <div className="mt-0.5 text-xs text-[var(--color-text-subtle)]">{p.desc}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-base font-bold text-[var(--color-text)]">
                    {formatBRL(p.priceCents)}
                  </div>
                  <div className="text-xs text-[var(--color-text-subtle)]">/mês</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Toggle beta */}
        <label className="mt-6 flex cursor-pointer items-start justify-between gap-3 rounded-md border border-[var(--color-border)] p-4">
          <span>
            <span className="block text-sm font-medium text-[var(--color-text)]">
              Escola no plano beta
            </span>
            <span className="mt-0.5 block text-xs text-[var(--color-text-subtle)]">
              Condição especial de parceria durante o período beta.
            </span>
          </span>
          <input
            type="checkbox"
            checked={plano.isBeta}
            onChange={(e) => onPlanoChange({ isBeta: e.target.checked })}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]"
            aria-label="Escola no plano beta"
          />
        </label>

        {/* Desconto comercial */}
        <div className="mt-6">
          <DiscountField
            baseCents={selected?.priceCents ?? 0}
            enabled={plano.discountEnabled}
            onEnabledChange={(b) => onPlanoChange({ discountEnabled: b })}
            type={plano.discountType}
            onTypeChange={(t: DiscountType) => onPlanoChange({ discountType: t })}
            value={plano.discountValue}
            onValueChange={(v) => onPlanoChange({ discountValue: v })}
            label="Aplicar desconto comercial"
          />
        </div>
      </div>
    </div>
  )
}

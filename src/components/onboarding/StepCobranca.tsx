'use client'

import type { CobrancaState } from '@/hooks/use-onboarding'

interface Props {
  cobranca: CobrancaState
  onChange: (cobranca: Partial<CobrancaState>) => void
}

function bpToPercent(bp: number): string {
  return (bp / 100).toFixed(2)
}

function percentToBp(percent: string): number {
  return Math.round(parseFloat(percent || '0') * 100)
}

export function StepCobranca({ cobranca, onChange }: Props) {
  const inputCls =
    'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          Cobrança aos responsáveis
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Como a escola cobra as mensalidades dos responsáveis financeiros. Isto não é o
          pagamento da escola à Impact X.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="closingDay">
            Dia de fechamento *
          </label>
          <p className="text-xs text-gray-400">Quando a mensalidade é apurada (1 a 28)</p>
          <input
            id="closingDay"
            type="number"
            min={1}
            max={28}
            value={cobranca.closingDay}
            onChange={(e) => onChange({ closingDay: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="dueDay">
            Dia de vencimento do boleto *
          </label>
          <p className="text-xs text-gray-400">Quando o responsável deve pagar (1 a 28)</p>
          <input
            id="dueDay"
            type="number"
            min={1}
            max={28}
            value={cobranca.dueDay}
            onChange={(e) => onChange({ dueDay: parseInt(e.target.value) || 1 })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="lateFee">
            Multa por atraso (%)
          </label>
          <input
            id="lateFee"
            type="number"
            min={0}
            max={5}
            step={0.01}
            value={bpToPercent(cobranca.lateFeePercent)}
            onChange={(e) => onChange({ lateFeePercent: percentToBp(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="monthlyInterest">
            Juros mensais (% a.m.)
          </label>
          <input
            id="monthlyInterest"
            type="number"
            min={0}
            max={3}
            step={0.01}
            value={bpToPercent(cobranca.monthlyInterestBp)}
            onChange={(e) => onChange({ monthlyInterestBp: percentToBp(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="municipalReg">
            Inscrição municipal *
          </label>
          <input
            id="municipalReg"
            type="text"
            value={cobranca.municipalRegistration}
            onChange={(e) => onChange({ municipalRegistration: e.target.value })}
            placeholder="Número da inscrição municipal para NFS-e"
            className={inputCls}
          />
        </div>
      </div>

      {/* Quem paga as taxas */}
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-medium text-gray-700">Quem paga as taxas</h3>
        <p className="mt-0.5 text-xs text-gray-400">
          Define quem arca com a taxa do cartão e a taxa de negativação.
        </p>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="cardFeePayer">
              Taxa do cartão
            </label>
            <select
              id="cardFeePayer"
              value={cobranca.cardFeePayer}
              onChange={(e) =>
                onChange({ cardFeePayer: e.target.value as 'RESPONSAVEL' | 'ESCOLA' })
              }
              className={inputCls}
            >
              <option value="RESPONSAVEL">Responsável</option>
              <option value="ESCOLA">Escola</option>
            </select>
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700"
              htmlFor="negativacaoFeePayer"
            >
              Taxa de negativação
            </label>
            <select
              id="negativacaoFeePayer"
              value={cobranca.negativacaoFeePayer}
              onChange={(e) =>
                onChange({ negativacaoFeePayer: e.target.value as 'RESPONSAVEL' | 'ESCOLA' })
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
  )
}

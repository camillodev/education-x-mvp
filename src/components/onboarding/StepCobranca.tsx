'use client'

import type { CobrancaState } from '@/hooks/use-onboarding'

interface Props {
  cobranca: CobrancaState
  onChange: (cobranca: Partial<CobrancaState>) => void
}

function BpToPercent(bp: number): string {
  return (bp / 100).toFixed(2)
}

function percentToBp(percent: string): number {
  return Math.round(parseFloat(percent || '0') * 100)
}

export function StepCobranca({ cobranca, onChange }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Configuração de cobrança</h2>

      {/* Dias */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="dueDay">
            Dia de vencimento *
          </label>
          <p className="text-xs text-gray-400">Entre 1 e 28</p>
          <input
            id="dueDay"
            type="number"
            min={1}
            max={28}
            value={cobranca.dueDay}
            onChange={(e) => onChange({ dueDay: parseInt(e.target.value) || 1 })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="closingDay">
            Dia de fechamento *
          </label>
          <p className="text-xs text-gray-400">Entre 1 e 28</p>
          <input
            id="closingDay"
            type="number"
            min={1}
            max={28}
            value={cobranca.closingDay}
            onChange={(e) => onChange({ closingDay: parseInt(e.target.value) || 1 })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
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
            value={BpToPercent(cobranca.lateFeePercent)}
            onChange={(e) => onChange({ lateFeePercent: percentToBp(e.target.value) })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
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
            value={BpToPercent(cobranca.monthlyInterestBp)}
            onChange={(e) => onChange({ monthlyInterestBp: percentToBp(e.target.value) })}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
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
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-sm font-medium text-gray-700">Opções</h3>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={cobranca.enablesSpc}
            onChange={(e) => onChange({ enablesSpc: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)]"
          />
          Habilitar negativação no SPC/Serasa
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={cobranca.autoBilling}
            onChange={(e) => onChange({ autoBilling: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)]"
          />
          Cobrança automática (gerar boletos automaticamente)
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={cobranca.acceptsCard}
            onChange={(e) => onChange({ acceptsCard: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)]"
          />
          Aceitar pagamento por cartão de crédito
        </label>
      </div>

      {/* FeePayors */}
      {cobranca.acceptsCard && (
        <div className="grid gap-4 sm:grid-cols-2 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="cardFeePayer">
              Quem paga a taxa do cartão?
            </label>
            <select
              id="cardFeePayer"
              value={cobranca.cardFeePayer}
              onChange={(e) =>
                onChange({ cardFeePayer: e.target.value as 'RESPONSAVEL' | 'ESCOLA' })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="RESPONSAVEL">Responsável</option>
              <option value="ESCOLA">Escola</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="negativacaoFeePayer">
              Quem paga a taxa de negativação?
            </label>
            <select
              id="negativacaoFeePayer"
              value={cobranca.negativacaoFeePayer}
              onChange={(e) =>
                onChange({ negativacaoFeePayer: e.target.value as 'RESPONSAVEL' | 'ESCOLA' })
              }
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="RESPONSAVEL">Responsável</option>
              <option value="ESCOLA">Escola</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

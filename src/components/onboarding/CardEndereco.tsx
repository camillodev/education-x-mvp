'use client'

import type { DadosState } from '@/hooks/use-onboarding'
import { maskCep } from './dados-masks'
import { inputBase, okBorder } from './dados-styles'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
  onCepBlur: (cep: string) => void
  loadingCep: boolean
}

export function CardEndereco({ dados, onChange, onCepBlur, loadingCep }: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="label mb-4">ENDEREÇO</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="cep">
            CEP *
          </label>
          <input
            id="cep"
            type="text"
            value={maskCep(dados.cep)}
            onChange={(e) => onChange({ cep: e.target.value.replace(/\D/g, '') })}
            onBlur={(e) => onCepBlur(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            aria-required="true"
            inputMode="numeric"
            className={`${inputBase} ${okBorder}`}
          />
          {loadingCep && (
            <p role="status" aria-live="polite" className="mt-1 text-xs text-[var(--color-text-subtle)]">Buscando endereço...</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="address">
            Logradouro *
          </label>
          <input
            id="address"
            type="text"
            value={dados.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Rua das Flores"
            aria-required="true"
            autoComplete="address-line1"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="number">
            Número *
          </label>
          <input
            id="number"
            type="text"
            value={dados.number}
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="123"
            aria-required="true"
            inputMode="numeric"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="neighborhood">
            Bairro *
          </label>
          <input
            id="neighborhood"
            type="text"
            value={dados.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            placeholder="Centro"
            aria-required="true"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="city">
            Cidade *
          </label>
          <input
            id="city"
            type="text"
            value={dados.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Belo Horizonte"
            aria-required="true"
            autoComplete="address-level2"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="state">
            UF *
          </label>
          <input
            id="state"
            type="text"
            value={dados.state}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="MG"
            maxLength={2}
            aria-required="true"
            autoComplete="address-level1"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="complement">
            Complemento <span className="font-normal text-[var(--color-text-subtle)]">(opcional)</span>
          </label>
          <input
            id="complement"
            type="text"
            value={dados.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
            placeholder="Sala 2, Andar 3..."
            className={`${inputBase} ${okBorder}`}
          />
        </div>
      </div>
    </div>
  )
}

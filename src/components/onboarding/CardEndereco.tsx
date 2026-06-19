'use client'

import { MapPin } from 'lucide-react'
import type { DadosState } from '@/hooks/use-onboarding'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { maskCep } from './dados-masks'

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
          <Field
            label="CEP"
            htmlFor="cep"
            required
            hint={loadingCep ? 'Buscando endereço…' : undefined}
          >
            <Input
              id="cep"
              value={maskCep(dados.cep)}
              onChange={(e) => onChange({ cep: e.target.value.replace(/\D/g, '') })}
              onBlur={(e) => onCepBlur(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              inputMode="numeric"
              aria-required="true"
              leadingIcon={<MapPin size={18} />}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Logradouro" htmlFor="address" required>
            <Input
              id="address"
              value={dados.address}
              onChange={(e) => onChange({ address: e.target.value })}
              placeholder="Rua das Flores"
              aria-required="true"
              autoComplete="address-line1"
            />
          </Field>
        </div>

        <div>
          <Field label="Número" htmlFor="number" required>
            <Input
              id="number"
              value={dados.number}
              onChange={(e) => onChange({ number: e.target.value })}
              placeholder="123"
              aria-required="true"
              inputMode="numeric"
            />
          </Field>
        </div>

        <div>
          <Field label="Bairro" htmlFor="neighborhood" required>
            <Input
              id="neighborhood"
              value={dados.neighborhood}
              onChange={(e) => onChange({ neighborhood: e.target.value })}
              placeholder="Centro"
              aria-required="true"
            />
          </Field>
        </div>

        <div>
          <Field label="Cidade" htmlFor="city" required>
            <Input
              id="city"
              value={dados.city}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Belo Horizonte"
              aria-required="true"
              autoComplete="address-level2"
            />
          </Field>
        </div>

        <div>
          <Field label="UF" htmlFor="state" required>
            <Input
              id="state"
              value={dados.state}
              onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
              placeholder="MG"
              maxLength={2}
              aria-required="true"
              autoComplete="address-level1"
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Complemento (opcional)" htmlFor="complement">
            <Input
              id="complement"
              value={dados.complement}
              onChange={(e) => onChange({ complement: e.target.value })}
              placeholder="Sala 2, Andar 3..."
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

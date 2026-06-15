'use client'

import { useState } from 'react'
import type { DadosState } from '@/hooks/use-onboarding'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
}

function maskCnpj(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function maskPhone(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function maskCep(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')
}

export function StepDados({ dados, onChange }: Props) {
  const [loadingCep, setLoadingCep] = useState(false)

  async function handleCepBlur(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return

    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        onChange({
          address: data.logradouro,
          city: data.localidade,
          state: data.uf,
        })
      }
    } catch {
      // silencia erro de ViaCEP — usuário preenche manualmente
    } finally {
      setLoadingCep(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Dados da escola</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="name">
            Nome da escola *
          </label>
          <input
            id="name"
            type="text"
            value={dados.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Kumon Camargos"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="cnpj">
            CNPJ *
          </label>
          <input
            id="cnpj"
            type="text"
            value={maskCnpj(dados.cnpj)}
            onChange={(e) => onChange({ cnpj: e.target.value.replace(/\D/g, '') })}
            placeholder="00.000.000/0000-00"
            maxLength={18}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="phone">
            Telefone *
          </label>
          <input
            id="phone"
            type="tel"
            value={maskPhone(dados.phone)}
            onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, '') })}
            placeholder="(31) 99999-0000"
            maxLength={15}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            E-mail *
          </label>
          <input
            id="email"
            type="email"
            value={dados.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="contato@escola.com"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="cep">
            CEP *
          </label>
          <input
            id="cep"
            type="text"
            value={maskCep(dados.cep)}
            onChange={(e) => onChange({ cep: e.target.value.replace(/\D/g, '') })}
            onBlur={(e) => handleCepBlur(e.target.value)}
            placeholder="00000-000"
            maxLength={9}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {loadingCep && (
            <p className="mt-1 text-xs text-gray-400">Buscando endereço...</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700" htmlFor="address">
            Endereço *
          </label>
          <input
            id="address"
            type="text"
            value={dados.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Rua das Flores, 123"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="complement">
            Complemento
          </label>
          <input
            id="complement"
            type="text"
            value={dados.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
            placeholder="Sala 2, Andar 3..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="city">
            Cidade *
          </label>
          <input
            id="city"
            type="text"
            value={dados.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Belo Horizonte"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="state">
            UF *
          </label>
          <input
            id="state"
            type="text"
            value={dados.state}
            onChange={(e) => onChange({ state: e.target.value.toUpperCase().slice(0, 2) })}
            placeholder="MG"
            maxLength={2}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={dados.isFranchise}
              onChange={(e) => onChange({ isFranchise: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            É uma unidade franqueada
          </label>
        </div>

        {dados.isFranchise && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="franchiseParent">
              Rede franqueadora
            </label>
            <input
              id="franchiseParent"
              type="text"
              value={dados.franchiseParent}
              onChange={(e) => onChange({ franchiseParent: e.target.value })}
              placeholder="Ex: Kumon Brasil"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>
        )}
      </div>
    </div>
  )
}

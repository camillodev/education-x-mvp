'use client'

import { useState } from 'react'
import type { DadosState } from '@/hooks/use-onboarding'
import { isValidCnpj, isValidCpf, isValidBrPhone } from '@/lib/validations/br-documents'
import { FRANCHISE_NETWORKS } from '@/lib/data/franchise-networks'

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

function maskCpf(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function StepDados({ dados, onChange }: Props) {
  const [loadingCep, setLoadingCep] = useState(false)

  // Inline validation — only surfaced after the user typed something.
  const cnpjError = dados.cnpj.length > 0 && !isValidCnpj(dados.cnpj) ? 'CNPJ inválido' : ''
  const emailError = dados.email.length > 0 && !EMAIL_RE.test(dados.email) ? 'E-mail inválido' : ''
  const phoneError = dados.phone.length > 0 && !isValidBrPhone(dados.phone) ? 'Telefone inválido' : ''
  const respCpfError =
    dados.responsibleCpf.length > 0 && !isValidCpf(dados.responsibleCpf) ? 'CPF inválido' : ''
  const respEmailError =
    dados.responsibleEmail.length > 0 && !EMAIL_RE.test(dados.responsibleEmail) ? 'E-mail inválido' : ''
  const respPhoneError =
    dados.responsiblePhone.length > 0 && !isValidBrPhone(dados.responsiblePhone) ? 'Telefone inválido' : ''
  const errorBorder = 'border-red-400 focus:border-red-500 focus:ring-red-500'
  const inputBase =
    'mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1'
  const okBorder = 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'

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
          neighborhood: data.bairro,
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
            aria-invalid={!!cnpjError}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              cnpjError
                ? errorBorder
                : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            }`}
          />
          {cnpjError && <p className="mt-1 text-xs text-red-500">{cnpjError}</p>}
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
            aria-invalid={!!phoneError}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              phoneError
                ? errorBorder
                : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            }`}
          />
          {phoneError && <p className="mt-1 text-xs text-red-500">{phoneError}</p>}
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
            aria-invalid={!!emailError}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              emailError
                ? errorBorder
                : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            }`}
          />
          {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
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
            Logradouro (rua/avenida) *
          </label>
          <input
            id="address"
            type="text"
            value={dados.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Rua das Flores"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="number">
            Número *
          </label>
          <input
            id="number"
            type="text"
            value={dados.number}
            onChange={(e) => onChange({ number: e.target.value })}
            placeholder="123"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="neighborhood">
            Bairro *
          </label>
          <input
            id="neighborhood"
            type="text"
            value={dados.neighborhood}
            onChange={(e) => onChange({ neighborhood: e.target.value })}
            placeholder="Centro"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
        </div>

        <div className="sm:col-span-2">
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
              list="franchise-networks"
              value={dados.franchiseParent}
              onChange={(e) => onChange({ franchiseParent: e.target.value })}
              placeholder="Digite ou selecione (ex: Kumon Brasil)"
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <datalist id="franchise-networks">
              {FRANCHISE_NETWORKS.map((network) => (
                <option key={network} value={network} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-gray-400">
              Selecione uma rede conhecida para evitar agrupamento duplicado. Não está na lista? Digite o nome.
            </p>
          </div>
        )}
      </div>

      {/* Responsável da unidade */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-base font-semibold text-gray-800">Responsável da unidade</h3>
        <p className="mt-1 text-sm text-gray-500">
          A pessoa que vai confirmar o cadastro e aceitar os termos. O e-mail abaixo recebe o
          link de confirmação.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="responsibleName">
              Nome completo *
            </label>
            <input
              id="responsibleName"
              type="text"
              value={dados.responsibleName}
              onChange={(e) => onChange({ responsibleName: e.target.value })}
              placeholder="Nome do responsável"
              className={`${inputBase} ${okBorder}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="responsibleCpf">
              CPF *
            </label>
            <input
              id="responsibleCpf"
              type="text"
              value={maskCpf(dados.responsibleCpf)}
              onChange={(e) => onChange({ responsibleCpf: e.target.value.replace(/\D/g, '') })}
              placeholder="000.000.000-00"
              maxLength={14}
              aria-invalid={!!respCpfError}
              className={`${inputBase} ${respCpfError ? errorBorder : okBorder}`}
            />
            {respCpfError && <p className="mt-1 text-xs text-red-500">{respCpfError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="responsiblePhone">
              Telefone *
            </label>
            <input
              id="responsiblePhone"
              type="tel"
              value={maskPhone(dados.responsiblePhone)}
              onChange={(e) => onChange({ responsiblePhone: e.target.value.replace(/\D/g, '') })}
              placeholder="(31) 99999-0000"
              maxLength={15}
              aria-invalid={!!respPhoneError}
              className={`${inputBase} ${respPhoneError ? errorBorder : okBorder}`}
            />
            {respPhoneError && <p className="mt-1 text-xs text-red-500">{respPhoneError}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700" htmlFor="responsibleEmail">
              E-mail *{' '}
              <span className="font-normal text-gray-400">(recebe o link de confirmação)</span>
            </label>
            <input
              id="responsibleEmail"
              type="email"
              value={dados.responsibleEmail}
              onChange={(e) => onChange({ responsibleEmail: e.target.value })}
              placeholder="responsavel@escola.com"
              aria-invalid={!!respEmailError}
              className={`${inputBase} ${respEmailError ? errorBorder : okBorder}`}
            />
            {respEmailError && <p className="mt-1 text-xs text-red-500">{respEmailError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

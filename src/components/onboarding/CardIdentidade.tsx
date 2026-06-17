'use client'

import type { DadosState } from '@/hooks/use-onboarding'
import { FRANCHISE_NETWORKS } from '@/lib/data/franchise-networks'
import { Combobox } from '@/components/patterns/Combobox'
import { maskCnpj, maskPhone } from './dados-masks'
import { inputBase, okBorder, errorBorder, cnpjStatusBadge } from './dados-styles'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
  cnpjError: string
  emailError: string
  phoneError: string
  loadingCnpj: boolean
}

export function CardIdentidade({
  dados,
  onChange,
  cnpjError,
  emailError,
  phoneError,
  loadingCnpj,
}: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="label mb-4">IDENTIDADE</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="cnpj">
            CNPJ *
          </label>
          <div className="flex items-center gap-2">
            <input
              id="cnpj"
              type="text"
              value={maskCnpj(dados.cnpj)}
              onChange={(e) => onChange({ cnpj: e.target.value.replace(/\D/g, '') })}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              aria-invalid={!!cnpjError}
              aria-required="true"
              inputMode="numeric"
              aria-describedby={cnpjError ? 'cnpj-error' : undefined}
              className={`${inputBase} flex-1 ${cnpjError ? errorBorder : okBorder}`}
            />
            {dados.cnpjStatus && !loadingCnpj && (() => {
              const badge = cnpjStatusBadge(dados.cnpjStatus)
              return (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                  {dados.cnpjStatus}
                </span>
              )
            })()}
          </div>
          {cnpjError && <p id="cnpj-error" className="mt-1 text-xs text-red-500">{cnpjError}</p>}
          {loadingCnpj && (
            <p role="status" aria-live="polite" className="mt-1 text-xs text-[var(--color-text-subtle)]">
              Consultando CNPJ...
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="legalName">
            Razão social
          </label>
          <p className="text-xs text-[var(--color-text-subtle)]">Vem do CNPJ — pode ajustar</p>
          <input
            id="legalName"
            type="text"
            value={dados.legalName}
            onChange={(e) => onChange({ legalName: e.target.value })}
            placeholder="Razão social conforme CNPJ"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        {dados.tradeName !== undefined && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="tradeName">
              Nome fantasia
            </label>
            <input
              id="tradeName"
              type="text"
              value={dados.tradeName}
              onChange={(e) => onChange({ tradeName: e.target.value })}
              placeholder="Nome fantasia conforme CNPJ"
              className={`${inputBase} ${okBorder}`}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="name">
            Apelido (como aparece no sistema) *
          </label>
          <input
            id="name"
            type="text"
            value={dados.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ex: Kumon Camargos"
            aria-required="true"
            autoComplete="organization"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="email">
            E-mail *
          </label>
          <input
            id="email"
            type="email"
            value={dados.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="contato@escola.com"
            aria-invalid={!!emailError}
            aria-required="true"
            autoComplete="email"
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`${inputBase} ${emailError ? errorBorder : okBorder}`}
          />
          {emailError && <p id="email-error" className="mt-1 text-xs text-red-500">{emailError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="phone">
            Celular *
          </label>
          <input
            id="phone"
            type="tel"
            value={maskPhone(dados.phone)}
            onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, '') })}
            placeholder="(31) 99999-0000"
            maxLength={15}
            aria-invalid={!!phoneError}
            aria-required="true"
            inputMode="tel"
            aria-describedby={phoneError ? 'phone-error' : undefined}
            className={`${inputBase} ${phoneError ? errorBorder : okBorder}`}
          />
          {phoneError && <p id="phone-error" className="mt-1 text-xs text-red-500">{phoneError}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-muted-strong)]">
            <input
              type="checkbox"
              checked={dados.isFranchise}
              onChange={(e) => onChange({ isFranchise: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary-ring)]"
            />
            É uma unidade franqueada
          </label>
        </div>

        {dados.isFranchise && (
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="franchiseParent">
              Rede franqueadora
            </label>
            <Combobox
              id="franchiseParent"
              options={FRANCHISE_NETWORKS}
              value={dados.franchiseParent}
              onChange={(v) => onChange({ franchiseParent: v })}
              placeholder="Selecione a rede"
              searchPlaceholder="Buscar rede (ex: Kumon Brasil)"
              allowCustom
            />
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              Selecione uma rede conhecida para evitar agrupamento duplicado. Não está na lista? Digite e use o nome.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

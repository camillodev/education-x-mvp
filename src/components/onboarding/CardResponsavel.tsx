'use client'

import type { DadosState } from '@/hooks/use-onboarding'
import { maskCpf, maskPhone } from './dados-masks'
import { inputBase, okBorder, errorBorder } from './dados-styles'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
  respCpfError: string
  respEmailError: string
  respPhoneError: string
}

export function CardResponsavel({
  dados,
  onChange,
  respCpfError,
  respEmailError,
  respPhoneError,
}: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="label mb-1">RESPONSÁVEL DA UNIDADE</div>
      <p className="mb-4 text-sm text-[var(--color-text-subtle)]">
        Recebe o link de confirmação e aceita os termos.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="responsibleName">
            Nome completo *
          </label>
          <input
            id="responsibleName"
            type="text"
            value={dados.responsibleName}
            onChange={(e) => onChange({ responsibleName: e.target.value })}
            placeholder="Nome do responsável"
            aria-required="true"
            autoComplete="name"
            className={`${inputBase} ${okBorder}`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="responsibleCpf">
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
            aria-required="true"
            inputMode="numeric"
            aria-describedby={respCpfError ? 'resp-cpf-error' : undefined}
            className={`${inputBase} ${respCpfError ? errorBorder : okBorder}`}
          />
          {respCpfError && <p id="resp-cpf-error" className="mt-1 text-xs text-red-500">{respCpfError}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="responsiblePhone">
            Celular *
          </label>
          <input
            id="responsiblePhone"
            type="tel"
            value={maskPhone(dados.responsiblePhone)}
            onChange={(e) => onChange({ responsiblePhone: e.target.value.replace(/\D/g, '') })}
            placeholder="(31) 99999-0000"
            maxLength={15}
            aria-invalid={!!respPhoneError}
            aria-required="true"
            inputMode="tel"
            aria-describedby={respPhoneError ? 'resp-phone-error' : undefined}
            className={`${inputBase} ${respPhoneError ? errorBorder : okBorder}`}
          />
          {respPhoneError && <p id="resp-phone-error" className="mt-1 text-xs text-red-500">{respPhoneError}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-[var(--color-text-muted-strong)]" htmlFor="responsibleEmail">
            E-mail *
          </label>
          <input
            id="responsibleEmail"
            type="email"
            value={dados.responsibleEmail}
            onChange={(e) => onChange({ responsibleEmail: e.target.value })}
            placeholder="responsavel@escola.com"
            aria-invalid={!!respEmailError}
            aria-required="true"
            autoComplete="email"
            aria-describedby={respEmailError ? 'resp-email-error' : undefined}
            className={`${inputBase} ${respEmailError ? errorBorder : okBorder}`}
          />
          {respEmailError && <p id="resp-email-error" className="mt-1 text-xs text-red-500">{respEmailError}</p>}
        </div>
      </div>
    </div>
  )
}

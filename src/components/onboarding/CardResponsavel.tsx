'use client'

import { Copy, Mail, Phone, User } from 'lucide-react'
import type { DadosState } from '@/hooks/use-onboarding'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { maskCpf, maskPhone } from './dados-masks'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
  respCpfError: string
  respEmailError: string
  respPhoneError: string
  /** Desabilita edição do CPF (modo edição de escola existente). */
  cpfDisabled?: boolean
}

export function CardResponsavel({
  dados,
  onChange,
  respCpfError,
  respEmailError,
  respPhoneError,
  cpfDisabled,
}: Props) {
  // Copia o contato da unidade pros campos do responsável.
  function duplicateUnitContact() {
    onChange({
      responsibleEmail: dados.email,
      responsiblePhone: dados.phone,
    })
    document.getElementById('responsibleName')?.focus()
  }

  // Só faz sentido oferecer a cópia se a unidade já tem algum contato.
  const canDuplicate = Boolean(dados.email || dados.phone)

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label mb-1">RESPONSÁVEL DA UNIDADE</div>
          <p className="mb-4 text-sm text-[var(--color-text-subtle)]">
            Recebe o link de confirmação e aceita os termos.
          </p>
        </div>
        {canDuplicate && (
          <button
            type="button"
            onClick={duplicateUnitContact}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-softer)]"
          >
            <Copy size={13} />
            Usar mesmo contato da unidade
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nome completo" htmlFor="responsibleName" required>
            <Input
              id="responsibleName"
              value={dados.responsibleName}
              onChange={(e) => onChange({ responsibleName: e.target.value })}
              placeholder="Nome do responsável"
              aria-required="true"
              autoComplete="name"
              leadingIcon={<User size={18} />}
            />
          </Field>
        </div>

        <div>
          <Field label="CPF" htmlFor="responsibleCpf" required error={respCpfError || undefined}>
            <Input
              id="responsibleCpf"
              value={maskCpf(dados.responsibleCpf)}
              onChange={(e) => onChange({ responsibleCpf: e.target.value.replace(/\D/g, '') })}
              placeholder="000.000.000-00"
              maxLength={14}
              inputMode="numeric"
              error={!!respCpfError}
              aria-required="true"
              disabled={cpfDisabled}
            />
          </Field>
        </div>

        <div>
          <Field label="Celular" htmlFor="responsiblePhone" required error={respPhoneError || undefined}>
            <Input
              id="responsiblePhone"
              type="tel"
              value={maskPhone(dados.responsiblePhone)}
              onChange={(e) => onChange({ responsiblePhone: e.target.value.replace(/\D/g, '') })}
              placeholder="(31) 99999-0000"
              maxLength={15}
              inputMode="tel"
              error={!!respPhoneError}
              aria-required="true"
              leadingIcon={<Phone size={18} />}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="E-mail" htmlFor="responsibleEmail" required error={respEmailError || undefined}>
            <Input
              id="responsibleEmail"
              type="email"
              value={dados.responsibleEmail}
              onChange={(e) => onChange({ responsibleEmail: e.target.value })}
              placeholder="responsavel@escola.com"
              error={!!respEmailError}
              aria-required="true"
              autoComplete="email"
              leadingIcon={<Mail size={18} />}
            />
          </Field>
        </div>
      </div>
    </div>
  )
}

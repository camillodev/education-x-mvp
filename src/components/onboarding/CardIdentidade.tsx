'use client'

import { Building2, Mail, Phone } from 'lucide-react'
import type { DadosState } from '@/hooks/use-onboarding'
import { FRANCHISE_NETWORKS } from '@/lib/data/franchise-networks'
import { Combobox } from '@/components/patterns/Combobox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Badge } from '@/components/ui/badge'
import { maskCnpj, maskPhone } from './dados-masks'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
  cnpjError: string
  emailError: string
  phoneError: string
  loadingCnpj: boolean
  /** Quando false, só o campo CNPJ aparece (CNPJ-first). */
  revealed: boolean
  /** Revela os campos manualmente (escape do CNPJ-first). */
  onRevealManual: () => void
}

/** Mapeia a situação cadastral do CNPJ para a variante do Badge. */
function statusVariant(status: string): 'success' | 'danger' | 'warning' {
  const s = status.toUpperCase()
  if (s === 'ATIVA') return 'success'
  if (s === 'BAIXADA' || s === 'INAPTA') return 'danger'
  return 'warning'
}

export function CardIdentidade({
  dados,
  onChange,
  cnpjError,
  emailError,
  phoneError,
  loadingCnpj,
  revealed,
  onRevealManual,
}: Props) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
      <div className="label mb-4">IDENTIDADE</div>

      {/* CNPJ em destaque — sempre visível, é o ponto de partida. */}
      <Field
        label="CNPJ"
        htmlFor="cnpj"
        required
        error={cnpjError || undefined}
        hint={!cnpjError ? 'Usado para criar a subconta de pagamentos — preenche o resto automaticamente' : undefined}
      >
        <Input
          id="cnpj"
          value={maskCnpj(dados.cnpj)}
          onChange={(e) => onChange({ cnpj: e.target.value.replace(/\D/g, '') })}
          placeholder="00.000.000/0000-00"
          maxLength={18}
          inputMode="numeric"
          error={!!cnpjError}
          aria-required="true"
          leadingIcon={<Building2 size={18} />}
          trailing={
            loadingCnpj ? (
              <span className="text-xs text-[var(--color-text-subtle)]">Consultando…</span>
            ) : dados.cnpjStatus ? (
              <Badge variant={statusVariant(dados.cnpjStatus)} dot>
                {dados.cnpjStatus}
              </Badge>
            ) : null
          }
        />
      </Field>

      {/* Escape manual — só aparece enquanto os campos estão escondidos. */}
      {!revealed && (
        <button
          type="button"
          onClick={onRevealManual}
          className="mt-3 text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Não tenho CNPJ / preencher manualmente
        </button>
      )}

      {/* Demais campos — revelados após o lookup ou via escape manual. */}
      {revealed && (
        <div className="mt-5 grid animate-[ex-fade-up_.3s_ease] gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Razão social" htmlFor="legalName" hint="Vem do CNPJ — pode ajustar">
              <Input
                id="legalName"
                value={dados.legalName}
                onChange={(e) => onChange({ legalName: e.target.value })}
                placeholder="Razão social conforme CNPJ"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Nome fantasia" htmlFor="tradeName">
              <Input
                id="tradeName"
                value={dados.tradeName}
                onChange={(e) => onChange({ tradeName: e.target.value })}
                placeholder="Nome fantasia conforme CNPJ"
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Apelido (como aparece no sistema)" htmlFor="name" required>
              <Input
                id="name"
                value={dados.name}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="Ex: Kumon Camargos"
                aria-required="true"
                autoComplete="organization"
                leadingIcon={<Building2 size={18} />}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="E-mail" htmlFor="email" required error={emailError || undefined}>
              <Input
                id="email"
                type="email"
                value={dados.email}
                onChange={(e) => onChange({ email: e.target.value })}
                placeholder="contato@escola.com"
                error={!!emailError}
                aria-required="true"
                autoComplete="email"
                leadingIcon={<Mail size={18} />}
              />
            </Field>
          </div>

          <div>
            <Field label="Celular" htmlFor="phone" required error={phoneError || undefined}>
              <Input
                id="phone"
                type="tel"
                value={maskPhone(dados.phone)}
                onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, '') })}
                placeholder="(31) 99999-0000"
                maxLength={15}
                inputMode="tel"
                error={!!phoneError}
                aria-required="true"
                leadingIcon={<Phone size={18} />}
              />
            </Field>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-4 py-3">
              <span className="text-sm font-medium text-[var(--color-text-muted-strong)]">
                É uma unidade franqueada
              </span>
              <Toggle
                checked={dados.isFranchise}
                onChange={(v) => onChange({ isFranchise: v })}
                aria-label="É uma unidade franqueada"
              />
            </div>
          </div>

          {dados.isFranchise && (
            <div className="sm:col-span-2">
              <Field
                label="Rede franqueadora"
                htmlFor="franchiseParent"
                hint="Selecione uma rede conhecida para evitar agrupamento duplicado. Não está na lista? Digite e use o nome."
              >
                <Combobox
                  id="franchiseParent"
                  options={FRANCHISE_NETWORKS}
                  value={dados.franchiseParent}
                  onChange={(v) => onChange({ franchiseParent: v })}
                  placeholder="Selecione a rede"
                  searchPlaceholder="Buscar rede (ex: Kumon Brasil)"
                  allowCustom
                />
              </Field>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

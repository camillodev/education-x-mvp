'use client'

import { useState, useEffect, useRef } from 'react'
import type { DadosState } from '@/hooks/use-onboarding'
import { isValidCnpj, isValidCpf, isValidBrMobile } from '@/lib/validations/br-documents'
import { FRANCHISE_NETWORKS } from '@/lib/data/franchise-networks'
import { Combobox } from '@/components/patterns/Combobox'
import { lookupCnpj, CnpjNotFoundError } from '@/lib/data/cnpj-lookup'
import { useToast } from '@/components/ui/toast'

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
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const { toast } = useToast()

  // Refs estáveis pra usar dentro do effect sem recriá-lo a cada render.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const toastRef = useRef(toast)
  toastRef.current = toast
  const lastLookedUp = useRef<string>('')
  // Snapshot do estado atual pra o effect ler sem virar dependência.
  const currentRef = useRef(dados)
  currentRef.current = dados

  // Autofill de CNPJ via BrasilAPI quando o CNPJ fica válido (14 díg + DV).
  // Best-effort: erro vai pro console + toast, nunca bloqueia o cadastro.
  useEffect(() => {
    const cnpj = dados.cnpj
    if (!isValidCnpj(cnpj) || lastLookedUp.current === cnpj) return
    lastLookedUp.current = cnpj

    const controller = new AbortController()
    setLoadingCnpj(true)
    lookupCnpj(cnpj, controller.signal)
      .then((data) => {
        // Substitui atomicamente; só preenche campos vazios pra não pisar no que o user digitou.
        const patch: Partial<DadosState> = {
          legalName: data.legalName,
          tradeName: data.tradeName,
          cnpjStatus: data.status,
        }
        const cur = currentRef.current
        if (data.legalName && !cur.name) patch.name = data.tradeName || data.legalName
        if (data.cep && !cur.cep) patch.cep = data.cep
        if (data.address && !cur.address) patch.address = data.address
        if (data.number && !cur.number) patch.number = data.number
        if (data.neighborhood && !cur.neighborhood) patch.neighborhood = data.neighborhood
        if (data.city && !cur.city) patch.city = data.city
        if (data.state && !cur.state) patch.state = data.state
        onChangeRef.current(patch)

        if (data.status && data.status.toUpperCase() !== 'ATIVA') {
          toastRef.current(`Atenção: CNPJ com situação "${data.status}".`, 'info')
        } else {
          toastRef.current('Dados do CNPJ preenchidos automaticamente.', 'success')
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('[cnpj-lookup]', err)
        if (err instanceof CnpjNotFoundError) {
          toastRef.current('CNPJ não encontrado na Receita. Confira o número.', 'error')
        } else {
          toastRef.current('Não foi possível consultar o CNPJ. Preencha manualmente.', 'error')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCnpj(false)
      })

    return () => controller.abort()
  }, [dados.cnpj])

  // Inline validation — only surfaced after the user typed something.
  const cnpjError = dados.cnpj.length > 0 && !isValidCnpj(dados.cnpj) ? 'CNPJ inválido' : ''
  const emailError = dados.email.length > 0 && !EMAIL_RE.test(dados.email) ? 'E-mail inválido' : ''
  const phoneError = dados.phone.length > 0 && !isValidBrMobile(dados.phone) ? 'Celular inválido (DDD + 9 dígitos)' : ''
  const respCpfError =
    dados.responsibleCpf.length > 0 && !isValidCpf(dados.responsibleCpf) ? 'CPF inválido' : ''
  const respEmailError =
    dados.responsibleEmail.length > 0 && !EMAIL_RE.test(dados.responsibleEmail) ? 'E-mail inválido' : ''
  const respPhoneError =
    dados.responsiblePhone.length > 0 && !isValidBrMobile(dados.responsiblePhone) ? 'Celular inválido (DDD + 9 dígitos)' : ''
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
        // Preenche só o que o ViaCEP retornou (campos vazios não apagam o que já existe).
        // Sobrescreve de forma atômica — nunca concatena com o valor anterior.
        const patch: Partial<DadosState> = {}
        if (data.logradouro) patch.address = data.logradouro
        if (data.bairro) patch.neighborhood = data.bairro
        if (data.localidade) patch.city = data.localidade
        if (data.uf) patch.state = data.uf
        onChange(patch)
      }
    } catch {
      // silencia erro de ViaCEP — usuário preenche manualmente
    } finally {
      setLoadingCep(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--color-primary)]">Dados da escola</h2>

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
            aria-required="true"
            autoComplete="organization"
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
            aria-required="true"
            inputMode="numeric"
            aria-describedby={cnpjError ? 'cnpj-error' : undefined}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              cnpjError
                ? errorBorder
                : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            }`}
          />
          {cnpjError && <p id="cnpj-error" className="mt-1 text-xs text-red-500">{cnpjError}</p>}
          {loadingCnpj && (
            <p role="status" aria-live="polite" className="mt-1 text-xs text-gray-400">
              Consultando CNPJ...
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="phone">
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
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              phoneError
                ? errorBorder
                : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            }`}
          />
          {phoneError && <p id="phone-error" className="mt-1 text-xs text-red-500">{phoneError}</p>}
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
            aria-required="true"
            autoComplete="email"
            aria-describedby={emailError ? 'email-error' : undefined}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              emailError
                ? errorBorder
                : 'border-gray-300 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]'
            }`}
          />
          {emailError && <p id="email-error" className="mt-1 text-xs text-red-500">{emailError}</p>}
        </div>

        {/* Dados da empresa (Receita, via CNPJ) */}
        {dados.legalName && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm sm:col-span-2">
            <p className="mb-1 text-xs font-medium text-gray-500">Dados da empresa (Receita)</p>
            <dl className="grid gap-1 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-400">Razão social</dt>
                <dd className="font-medium text-gray-700">{dados.legalName}</dd>
              </div>
              {dados.tradeName && (
                <div>
                  <dt className="text-xs text-gray-400">Nome fantasia</dt>
                  <dd className="font-medium text-gray-700">{dados.tradeName}</dd>
                </div>
              )}
              {dados.cnpjStatus && (
                <div>
                  <dt className="text-xs text-gray-400">Situação cadastral</dt>
                  <dd
                    className={`font-medium ${
                      dados.cnpjStatus.toUpperCase() === 'ATIVA'
                        ? 'text-green-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {dados.cnpjStatus}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

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
            aria-required="true"
            inputMode="numeric"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {loadingCep && (
            <p role="status" aria-live="polite" className="mt-1 text-xs text-gray-400">Buscando endereço...</p>
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
            aria-required="true"
            autoComplete="address-line1"
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
            aria-required="true"
            inputMode="numeric"
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
            aria-required="true"
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
            aria-required="true"
            autoComplete="address-level2"
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
            aria-required="true"
            autoComplete="address-level1"
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
            <Combobox
              id="franchiseParent"
              options={FRANCHISE_NETWORKS}
              value={dados.franchiseParent}
              onChange={(v) => onChange({ franchiseParent: v })}
              placeholder="Selecione a rede"
              searchPlaceholder="Buscar rede (ex: Kumon Brasil)"
              allowCustom
            />
            <p className="mt-1 text-xs text-gray-400">
              Selecione uma rede conhecida para evitar agrupamento duplicado. Não está na lista? Digite e use o nome.
            </p>
          </div>
        )}
      </div>

      {/* Responsável da unidade */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-base font-semibold text-[var(--color-primary)]">Responsável da unidade</h3>
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
              aria-required="true"
              autoComplete="name"
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
              aria-required="true"
              inputMode="numeric"
              aria-describedby={respCpfError ? 'resp-cpf-error' : undefined}
              className={`${inputBase} ${respCpfError ? errorBorder : okBorder}`}
            />
            {respCpfError && <p id="resp-cpf-error" className="mt-1 text-xs text-red-500">{respCpfError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="responsiblePhone">
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
              aria-required="true"
              autoComplete="email"
              aria-describedby={respEmailError ? 'resp-email-error' : undefined}
              className={`${inputBase} ${respEmailError ? errorBorder : okBorder}`}
            />
            {respEmailError && <p id="resp-email-error" className="mt-1 text-xs text-red-500">{respEmailError}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

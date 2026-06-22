'use client'

import { useState, useEffect, useRef } from 'react'
import type { DadosState } from '@/hooks/use-onboarding'
import { isValidCnpj, isValidBrMobile } from '@/lib/validations/br-documents'
import { lookupCnpj, CnpjNotFoundError } from '@/lib/data/cnpj-lookup'
import { useToast } from '@/components/ui/toast'
import { EMAIL_RE } from './dados-masks'
import { CardIdentidade } from './CardIdentidade'
import { CardEndereco } from './CardEndereco'
import { CardResponsavel } from './CardResponsavel'

interface Props {
  dados: DadosState
  onChange: (dados: Partial<DadosState>) => void
  readOnly?: { cnpj?: boolean }
}

export function StepDados({ dados, onChange, readOnly }: Props) {
  const [loadingCep, setLoadingCep] = useState(false)
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  // CNPJ-first: começa escondendo os demais campos. Inicia revelado quando
  // o usuário está editando um draft que já tem identidade preenchida,
  // ou quando o campo CNPJ está em modo read-only (fluxo de edição).
  const [revealed, setRevealed] = useState(
    () => readOnly?.cnpj === true || Boolean(dados.legalName || dados.tradeName || dados.name)
  )
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

  const cnpjReadOnly = readOnly?.cnpj ?? false

  // Autofill de CNPJ via BrasilAPI quando o CNPJ fica válido (14 díg + DV).
  // Desabilitado no modo edição (readOnly.cnpj) — dados já chegam pré-preenchidos.
  // Best-effort: erro vai pro console + toast, nunca bloqueia o cadastro.
  useEffect(() => {
    const cnpj = dados.cnpj
    if (cnpjReadOnly) return
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
        // Lookup ok = revela os campos preenchidos para revisão.
        setRevealed(true)

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
  }, [dados.cnpj, cnpjReadOnly])

  // Inline validation — only surfaced after the user typed something.
  const cnpjError = dados.cnpj.length > 0 && !isValidCnpj(dados.cnpj) ? 'CNPJ inválido' : ''
  const emailError = dados.email.length > 0 && !EMAIL_RE.test(dados.email) ? 'E-mail inválido' : ''
  const phoneError = dados.phone.length > 0 && !isValidBrMobile(dados.phone) ? 'Celular inválido (DDD + 9 dígitos)' : ''
  const respEmailError =
    dados.responsibleEmail.length > 0 && !EMAIL_RE.test(dados.responsibleEmail) ? 'E-mail inválido' : ''
  const respPhoneError =
    dados.responsiblePhone.length > 0 && !isValidBrMobile(dados.responsiblePhone) ? 'Celular inválido (DDD + 9 dígitos)' : ''

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
    <div className="space-y-6">
      <div>
        <p className="label">PASSO 1 DE 3</p>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Dados da escola</h1>
        <p className="mt-1 text-sm text-[var(--color-text-subtle)]">* campo obrigatório</p>
      </div>

      <CardIdentidade
        dados={dados}
        onChange={onChange}
        cnpjError={cnpjError}
        emailError={emailError}
        phoneError={phoneError}
        loadingCnpj={loadingCnpj}
        revealed={revealed}
        onRevealManual={() => setRevealed(true)}
        cnpjDisabled={readOnly?.cnpj}
      />

      {/* Endereço e Responsável só aparecem depois do CNPJ-first revelar. */}
      {revealed && (
        <div className="animate-[ex-fade-up_.3s_ease] space-y-6">
          <CardEndereco
            dados={dados}
            onChange={onChange}
            onCepBlur={handleCepBlur}
            loadingCep={loadingCep}
          />

          <CardResponsavel
            dados={dados}
            onChange={onChange}
            respEmailError={respEmailError}
            respPhoneError={respPhoneError}
          />
        </div>
      )}
    </div>
  )
}

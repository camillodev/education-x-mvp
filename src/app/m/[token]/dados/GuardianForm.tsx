'use client'

import { useActionState } from 'react'
import { User, Mail, Phone, IdCard } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { Button } from '@/components/ui/button'
import { maskCpf, maskPhone } from '@/components/onboarding/dados-masks'
import { useState } from 'react'
import { submitGuardianStepAction, type GuardianStepFormState } from './actions'

const GUARDIAN_TYPE_OPTIONS = [
  { value: 'MOTHER', label: 'Mãe' },
  { value: 'FATHER', label: 'Pai' },
  { value: 'LEGAL_GUARDIAN', label: 'Responsável legal' },
] as const

type GuardianType = (typeof GUARDIAN_TYPE_OPTIONS)[number]['value']

interface Props {
  token: string
}

const INITIAL_STATE: GuardianStepFormState = { errors: {} }

export function GuardianForm({ token }: Props) {
  const action = submitGuardianStepAction.bind(null, token)
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)

  const [name, setName] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<GuardianType>('MOTHER')

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">Seus dados</h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">Passo 1 de 4</p>

      <form action={formAction} className="mt-5 flex flex-col gap-4">
        <Field label="Nome completo" htmlFor="name" required error={state.errors.name}>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
            leadingIcon={<User size={18} />}
            error={!!state.errors.name}
          />
        </Field>

        <Field label="CPF" htmlFor="cpf" required error={state.errors.cpf}>
          <Input
            id="cpf"
            name="cpf"
            value={cpf}
            onChange={(e) => setCpf(maskCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={14}
            leadingIcon={<IdCard size={18} />}
            error={!!state.errors.cpf}
          />
        </Field>

        <Field label="E-mail" htmlFor="email" required error={state.errors.email} hint={!state.errors.email ? 'É onde você vai receber os boletos.' : undefined}>
          <Input
            id="email"
            name="email"
            type="text"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            leadingIcon={<Mail size={18} />}
            error={!!state.errors.email}
          />
        </Field>

        <Field label="Celular / WhatsApp" htmlFor="phone" required error={state.errors.phone} hint={!state.errors.phone ? 'Usamos para avisos importantes por WhatsApp.' : undefined}>
          <Input
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(31) 99999-0000"
            inputMode="tel"
            maxLength={15}
            leadingIcon={<Phone size={18} />}
            error={!!state.errors.phone}
          />
        </Field>

        <div>
          <span className="text-[13px] font-semibold text-(--color-text)">
            Tipo de responsável<span className="ml-0.5 text-(--color-danger)">*</span>
          </span>
          <input type="hidden" name="type" value={type} />
          <Segmented
            options={GUARDIAN_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={type}
            onChange={setType}
            aria-label="Tipo de responsável"
            className="mt-1.5"
          />
          {state.errors.type && <p className="mt-1 text-xs text-(--color-danger)">{state.errors.type}</p>}
        </div>

        <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
          {pending ? 'Salvando…' : 'Continuar'}
        </Button>
      </form>
    </Card>
  )
}

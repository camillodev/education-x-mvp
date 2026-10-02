'use client'

import { useActionState, useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/toast'
import { saveContractAction, type SaveContractState } from './actions'

interface Props {
  initialBody: string
  isCustom: boolean
}

const INITIAL_STATE: SaveContractState = {}

export function ContractForm({ initialBody, isCustom }: Props) {
  const [state, formAction, pending] = useActionState(saveContractAction, INITIAL_STATE)
  const [body, setBody] = useState(initialBody)
  const { toast } = useToast()

  useEffect(() => {
    if (state.success) toast('Contrato salvo com sucesso.', 'success')
  }, [state.success, toast])

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">Contrato com o responsável</h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">
        {isCustom
          ? 'Este é o texto que sua escola já personalizou. Ele é exibido para o responsável no momento da matrícula.'
          : 'Sua escola ainda não personalizou este contrato — o texto abaixo é o modelo padrão da Education X. Edite e salve para usar sua própria versão.'}
      </p>

      <form action={formAction} className="mt-5 flex flex-col gap-3">
        <Textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={20}
          error={!!state.error}
          className="font-mono text-xs"
        />

        {state.error && <p className="text-sm text-(--color-danger)">{state.error}</p>}

        <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full sm:w-auto">
          {pending ? 'Salvando…' : 'Salvar contrato'}
        </Button>
      </form>
    </Card>
  )
}

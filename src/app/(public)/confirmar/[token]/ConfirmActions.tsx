'use client'

import { useState } from 'react'

export function ConfirmActions({ token }: { token: string }) {
  const [accepted, setAccepted] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleConfirm() {
    setStatus('submitting')
    try {
      const res = await fetch(`/api/confirmar/${token}`, { method: 'POST' })
      if (res.ok) {
        setStatus('success')
        return
      }
      const err = await res.json().catch(() => ({}))
      setStatus('error')
      setErrorMsg(err?.error ?? 'Não foi possível confirmar. Tente novamente.')
    } catch {
      setStatus('error')
      setErrorMsg('Erro de conexão. Tente novamente.')
    }
  }

  if (status === 'success') {
    return (
      <div className="mt-8 rounded-md border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-green-800">Cadastro confirmado!</h2>
        <p className="mt-1 text-sm text-green-700">
          Os termos foram aceitos e a conta da escola está ativa. A Impact X entrará em contato
          com os próximos passos de acesso.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 space-y-4">
      <label className="flex items-start gap-3 rounded-md border border-[var(--color-primary)] bg-blue-50 p-4 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
        />
        <span>
          Li e aceito, em nome da escola, os Termos de Uso (Impact X↔Escola e Escola↔Responsável)
          e a Política de Privacidade. Entendo que a Impact X atua como operadora dos dados e que
          a escola é a controladora.
        </span>
      </label>

      {status === 'error' && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={!accepted || status === 'submitting'}
        className="w-full rounded-md bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === 'submitting' ? 'Confirmando...' : 'Confirmar e ativar conta'}
      </button>
    </div>
  )
}

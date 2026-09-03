'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface PixData {
  encodedImage: string
  payload: string
  expirationDate: string
}

interface Props {
  invoiceId: string
}

// QR PIX é buscado sob demanda (I/O de terceiro não cacheável, só necessário quando a pessoa
// vai pagar por PIX) — ver GET /api/invoices/[id]/pix.
export function InvoicePixBlock({ invoiceId }: Props) {
  const { toast } = useToast()
  const [pix, setPix] = useState<PixData | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLoadPix() {
    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pix`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha ao carregar QR Code PIX.')
      }
      const body = (await res.json()) as { pix: PixData }
      setPix(body.pix)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao carregar QR Code PIX.', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyPayload() {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix.payload)
      toast('Copiado!', 'success')
    } catch {
      toast('Não foi possível copiar.', 'error')
    }
  }

  if (!pix) {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-(--color-text-subtle)">PIX</span>
        <Button size="sm" variant="secondary" disabled={loading} onClick={() => void handleLoadPix()}>
          {loading ? 'Carregando…' : 'Ver QR Code PIX'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-(--color-border) p-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- base64 dinâmico da Asaas, sem otimização de next/image */}
      <img src={`data:image/png;base64,${pix.encodedImage}`} alt="QR Code PIX" className="h-40 w-40" />
      <Button size="sm" variant="secondary" onClick={() => void handleCopyPayload()}>
        Copiar código PIX
      </Button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface Props {
  open: boolean
  unitId: string
  unitName: string
  token: string | null
  onTokenGenerated: (token: string) => void
  onClose: () => void
}

export function EnrollmentLinkModal({ open, unitId, unitName, token, onTokenGenerated, onClose }: Props) {
  const { toast } = useToast()
  const [generating, setGenerating] = useState(false)

  async function generateLink() {
    setGenerating(true)
    try {
      const res = await fetch(`/api/units/${unitId}/enrollment-link`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao gerar link' }))
        toast(err.error ?? 'Falha ao gerar link', 'error')
        return
      }
      const data = await res.json()
      onTokenGenerated(data.enrollmentLinkToken)
      toast('Link gerado com sucesso!', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao gerar link', 'error')
    } finally {
      setGenerating(false)
    }
  }

  function copyLink() {
    if (!token) return
    navigator.clipboard.writeText(`https://educationx.app/m/${token}`)
    toast('Link copiado!', 'success')
  }

  function shareViaWhatsApp() {
    if (!token) return
    const msg = encodeURIComponent(
      `Olá! Ganhei um link de matrícula para a escola ${unitName}. Acesse: https://educationx.app/m/${token}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Link de matrícula</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-(--color-text-muted)">
          Compartilhe este link com o responsável para iniciar a matrícula.
        </p>

        {token ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                readOnly
                value={`https://educationx.app/m/${token}`}
                className="flex-1 rounded-md border border-(--color-border-input) px-3 py-2 text-sm focus:outline-none focus:border-(--color-primary)"
              />
              <Button variant="secondary" onClick={copyLink}>
                Copiar
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={shareViaWhatsApp} className="flex-1">
                Compartilhar via WhatsApp
              </Button>
              <Button variant="tertiary" onClick={onClose} className="flex-1">
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col items-center gap-3">
            <p className="text-sm text-(--color-text-subtle)">
              Nenhum link gerado ainda. Clique em Gerar link para criar um.
            </p>
            <Button onClick={generateLink} disabled={generating} className="w-full">
              {generating ? 'Gerando...' : 'Gerar link'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
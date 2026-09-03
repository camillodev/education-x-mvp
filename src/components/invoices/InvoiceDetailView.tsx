'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { formatBRL } from '@/lib/format'
import { calculateLateFeeAndInterest } from '@/lib/invoice-fees'
import type { InvoiceDetail } from '@/lib/services/invoice-detail.service'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_VARIANT } from './status'
import { InvoicePixBlock } from './InvoicePixBlock'

interface Props {
  invoice: InvoiceDetail
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR')
}

async function copyText(text: string, toast: (msg: string, variant?: 'success' | 'error' | 'info') => void) {
  try {
    await navigator.clipboard.writeText(text)
    toast('Copiado!', 'success')
  } catch {
    toast('Não foi possível copiar.', 'error')
  }
}

export function InvoiceDetailView({ invoice }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [cancelling, setCancelling] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const isBlocked = invoice.status === 'BLOCKED'
  const isError = invoice.status === 'ERROR'
  const isOverdue = invoice.status === 'OVERDUE'
  const isPending = invoice.status === 'PENDING'
  const showBoletoPix = !isBlocked && !isError && Boolean(invoice.asaasPaymentId)

  const lateFee = isOverdue
    ? calculateLateFeeAndInterest(invoice.billingConfig, invoice.amountCents, invoice.dueDate, new Date())
    : null

  async function handleCancel() {
    setCancelling(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha ao cancelar cobrança.')
      }
      toast('Cobrança cancelada.', 'success')
      setConfirmOpen(false)
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao cancelar cobrança.', 'error')
    } finally {
      setCancelling(false)
    }
  }

  async function handleRetry() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/retry`, { method: 'POST' })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha ao reemitir cobrança.')
      }
      toast('Cobrança reemitida.', 'success')
      router.refresh()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha ao reemitir cobrança.', 'error')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">Cobrança</p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-(--color-text)">{formatBRL(invoice.amountCents)}</h1>
          <Badge variant={INVOICE_STATUS_VARIANT[invoice.status] ?? 'neutral'} dot>
            {INVOICE_STATUS_LABEL[invoice.status] ?? invoice.status}
          </Badge>
        </div>
      </div>

      {isBlocked && (
        <div className="rounded-[var(--radius-lg)] border border-(--color-warning-soft) bg-(--badge-warning-bg) p-4 text-sm text-(--badge-warning-fg)">
          Aguardando cadastro do responsável na Asaas — a cobrança será emitida assim que o cadastro for concluído.
        </div>
      )}

      {isError && (
        <div className="rounded-[var(--radius-lg)] border border-(--color-danger-soft) bg-(--badge-danger-bg) p-4">
          <p className="text-sm font-semibold text-(--badge-danger-fg)">Falha ao emitir esta cobrança na Asaas.</p>
          <Button className="mt-3" size="sm" variant="danger" disabled={retrying} onClick={() => void handleRetry()}>
            {retrying ? 'Reemitindo…' : 'Reemitir'}
          </Button>
        </div>
      )}

      <section className="rounded-[var(--radius-lg)] border border-(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-(--color-text-subtle)">Aluno</dt>
            <dd className="font-medium text-(--color-text)">{invoice.student.name}</dd>
          </div>
          <div>
            <dt className="text-(--color-text-subtle)">Matéria</dt>
            <dd className="font-medium text-(--color-text)">{invoice.subject.name}</dd>
          </div>
          <div>
            <dt className="text-(--color-text-subtle)">Competência</dt>
            <dd className="font-medium text-(--color-text)">{invoice.referenceMonth}</dd>
          </div>
          <div>
            <dt className="text-(--color-text-subtle)">Vencimento</dt>
            <dd className="font-medium text-(--color-text)">{formatDate(invoice.dueDate)}</dd>
          </div>
          {invoice.paidAt && (
            <div>
              <dt className="text-(--color-text-subtle)">Pago em</dt>
              <dd className="font-medium text-(--color-text)">{formatDate(invoice.paidAt)}</dd>
            </div>
          )}
        </dl>
      </section>

      {isOverdue && lateFee && (
        <section className="rounded-[var(--radius-lg)] border border-(--color-danger-soft) bg-(--badge-danger-bg) p-6">
          <p className="text-sm font-semibold text-(--badge-danger-fg)">Multa e juros por atraso (estimativa)</p>
          <p className="mt-1 text-xs text-(--badge-danger-fg)">
            Valor estimado para exibição — o valor exato cobrado é o que consta no boleto/PIX gerado pela Asaas.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-(--badge-danger-fg)">Multa</dt>
              <dd className="font-semibold text-(--badge-danger-fg)">{formatBRL(lateFee.lateFeeCents)}</dd>
            </div>
            <div>
              <dt className="text-(--badge-danger-fg)">Juros</dt>
              <dd className="font-semibold text-(--badge-danger-fg)">{formatBRL(lateFee.interestCents)}</dd>
            </div>
          </dl>
        </section>
      )}

      {showBoletoPix && (
        <section className="rounded-[var(--radius-lg)] border border-(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="mb-3 text-sm font-semibold text-(--color-text)">Boleto e PIX</p>
          <div className="flex flex-col gap-3">
            {invoice.asaasBarCode && (
              <div className="flex items-center justify-between gap-3">
                <code className="truncate text-xs text-(--color-text-subtle)">{invoice.asaasBarCode}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyText(invoice.asaasBarCode!, toast)}
                >
                  Copiar linha digitável
                </Button>
              </div>
            )}
            {invoice.asaasPaymentUrl && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-(--color-text-subtle)">Link de pagamento</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyText(invoice.asaasPaymentUrl!, toast)}
                >
                  Copiar link
                </Button>
              </div>
            )}
            <InvoicePixBlock invoiceId={invoice.id} />
          </div>
        </section>
      )}

      {(invoice.emittedAt || invoice.payments.length > 0) && (
        <section className="rounded-[var(--radius-lg)] border border-(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="mb-3 text-sm font-semibold text-(--color-text)">Histórico</p>
          <ol className="flex flex-col gap-2 text-sm text-(--color-text-subtle)">
            {invoice.emittedAt && <li>Emitida em {formatDate(invoice.emittedAt)}</li>}
            {invoice.payments.map((p, i) => (
              <li key={i}>
                {p.asaasEvent} — {formatBRL(p.amountCents)} em {formatDate(p.paidAt)}
              </li>
            ))}
          </ol>
        </section>
      )}

      {isPending && (
        <div>
          <Button variant="danger-outline" size="sm" onClick={() => setConfirmOpen(true)}>
            Cancelar cobrança
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar esta cobrança?</DialogTitle>
                <DialogDescription>
                  O boleto/PIX gerado deixará de ser válido. Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="tertiary" size="sm">Voltar</Button>
                </DialogClose>
                <Button variant="danger" size="sm" disabled={cancelling} onClick={() => void handleCancel()}>
                  {cancelling ? 'Cancelando…' : 'Confirmar cancelamento'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}

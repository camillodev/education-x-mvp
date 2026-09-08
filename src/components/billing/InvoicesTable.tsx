'use client'

import { useState } from 'react'
import { DataTable, TrHover, Td, Person } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/format'
import type { InvoiceListItemDTO } from '@/hooks/use-invoices'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
  BLOCKED: 'Aguardando cadastro',
  ERROR: 'Erro',
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
  BLOCKED: 'warning',
  ERROR: 'danger',
}

const COLS = [
  { label: 'Responsável' },
  { label: 'Matéria' },
  { label: 'Valor' },
  { label: 'Vencimento' },
  { label: 'Status' },
  { label: 'Ações', align: 'right' as const },
]

interface Props {
  items: InvoiceListItemDTO[]
  // Promise<void>, não void: sem aguardar de verdade, busyId era limpo no mesmo tick síncrono
  // e o "Processando…" nunca ficava visível durante a chamada de rede real, permitindo duplo
  // clique (achado de code review, EDU-27).
  onReemitir: (invoiceId: string) => Promise<void>
}

export function InvoicesTable({ items, onReemitir }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleReemitir(invoiceId: string) {
    setBusyId(invoiceId)
    try {
      await onReemitir(invoiceId)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <DataTable cols={COLS}>
      {items.map((item) => (
        <TrHover key={item.id}>
          <Td>
            <Person name={item.guardianName} sub={item.studentName} />
          </Td>
          <Td className="text-(--color-text-subtle)">{item.subjectName}</Td>
          <Td className="font-semibold">{formatBRL(item.amountCents)}</Td>
          <Td className="text-(--color-text-subtle)">{new Date(item.dueDate).toLocaleDateString('pt-BR')}</Td>
          <Td>
            <Badge variant={STATUS_VARIANT[item.status] ?? 'neutral'} dot>
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
          </Td>
          <Td align="right">
            {item.status === 'ERROR' && (
              <Button
                variant="primary"
                size="sm"
                disabled={busyId === item.id}
                onClick={() => void handleReemitir(item.id)}
              >
                {busyId === item.id ? 'Processando…' : 'Reemitir'}
              </Button>
            )}
          </Td>
        </TrHover>
      ))}
    </DataTable>
  )
}

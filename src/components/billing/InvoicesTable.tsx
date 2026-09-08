'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/patterns/DataTable'
import { Person } from '@/components/patterns/Person'
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

  const columns: ColumnDef<InvoiceListItemDTO, unknown>[] = [
    {
      accessorKey: 'guardianName',
      header: 'Responsável',
      cell: ({ row }) => <Person name={row.original.guardianName} sub={row.original.studentName} />,
    },
    {
      accessorKey: 'subjectName',
      header: 'Matéria',
      cell: ({ row }) => <span className="text-(--color-text-subtle)">{row.original.subjectName}</span>,
    },
    {
      accessorKey: 'amountCents',
      header: 'Valor',
      cell: ({ row }) => <span className="font-semibold">{formatBRL(row.original.amountCents)}</span>,
    },
    {
      accessorKey: 'dueDate',
      header: 'Vencimento',
      cell: ({ row }) => (
        <span className="text-(--color-text-subtle)">
          {new Date(row.original.dueDate).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status] ?? 'neutral'} dot>
          {STATUS_LABEL[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) =>
        row.original.status === 'ERROR' ? (
          <Button
            variant="primary"
            size="sm"
            disabled={busyId === row.original.id}
            onClick={() => void handleReemitir(row.original.id)}
          >
            {busyId === row.original.id ? 'Processando…' : 'Reemitir'}
          </Button>
        ) : null,
    },
  ]

  return (
    <DataTable
      title="Cobranças"
      columns={columns}
      data={items}
      emptyMessage="Nenhuma cobrança encontrada."
      hideBuiltinControls
    />
  )
}

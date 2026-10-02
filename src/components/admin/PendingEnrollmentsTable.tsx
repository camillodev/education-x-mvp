'use client'

import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/patterns/DataTable'
import { Person } from '@/components/patterns/Person'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatBRL } from '@/lib/format'
import type { PendingEnrollmentItem } from '@/hooks/use-pending-enrollments'

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
}

interface Props {
  items: PendingEnrollmentItem[]
  onApprove: (guardianId: string) => Promise<void>
  onReject: (guardianId: string) => Promise<void>
}

export function PendingEnrollmentsTable({ items, onApprove, onReject }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleApprove(guardianId: string) {
    setBusyId(guardianId)
    try {
      await onApprove(guardianId)
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(guardianId: string) {
    setBusyId(guardianId)
    try {
      await onReject(guardianId)
    } finally {
      setBusyId(null)
    }
  }

  const columns: ColumnDef<PendingEnrollmentItem, unknown>[] = [
    { accessorKey: 'guardianName', header: 'Responsável', cell: ({ row }) => <Person name={row.original.guardianName} /> },
    {
      id: 'students',
      header: 'Alunos',
      cell: ({ row }) => (
        <span className="text-(--color-text-subtle)">{row.original.students.join(', ')}</span>
      ),
    },
    {
      accessorKey: 'plan',
      header: 'Plano',
      cell: ({ row }) => <Badge variant="info">{PLAN_LABELS[row.original.plan] ?? row.original.plan}</Badge>,
    },
    {
      accessorKey: 'totalCents',
      header: 'Valor',
      cell: ({ row }) => <span className="font-semibold">{formatBRL(row.original.totalCents)}</span>,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="danger-outline"
            size="sm"
            disabled={busyId === row.original.guardianId}
            onClick={() => handleReject(row.original.guardianId)}
          >
            Recusar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={busyId === row.original.guardianId}
            onClick={() => handleApprove(row.original.guardianId)}
          >
            {busyId === row.original.guardianId ? 'Processando…' : 'Aprovar'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      title="Matrículas pendentes"
      columns={columns}
      data={items}
      searchPlaceholder="Buscar responsável ou aluno..."
      emptyMessage="Nenhuma matrícula pendente."
    />
  )
}

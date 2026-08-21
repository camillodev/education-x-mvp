'use client'

import { useState } from 'react'
import { DataTable, TrHover, Td, Person } from '@/components/DataTable'
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

const COLS = [
  { label: 'Responsável' },
  { label: 'Alunos' },
  { label: 'Plano' },
  { label: 'Valor' },
  { label: 'Ações', align: 'right' as const },
]

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

  return (
    <DataTable cols={COLS}>
      {items.map((item) => (
        <TrHover key={item.guardianId}>
          <Td><Person name={item.guardianName} /></Td>
          <Td className="text-(--color-text-subtle)">{item.students.join(', ')}</Td>
          <Td>
            <Badge variant="info">{PLAN_LABELS[item.plan] ?? item.plan}</Badge>
          </Td>
          <Td className="font-semibold">{formatBRL(item.totalCents)}</Td>
          <Td align="right">
            <div className="flex justify-end gap-2">
              <Button
                variant="danger-outline"
                size="sm"
                disabled={busyId === item.guardianId}
                onClick={() => handleReject(item.guardianId)}
              >
                Recusar
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={busyId === item.guardianId}
                onClick={() => handleApprove(item.guardianId)}
              >
                {busyId === item.guardianId ? 'Processando…' : 'Aprovar'}
              </Button>
            </div>
          </Td>
        </TrHover>
      ))}
    </DataTable>
  )
}

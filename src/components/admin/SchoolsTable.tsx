import Link from 'next/link'
import type { Route } from 'next'
import { DataTable, TrHover, Td, Person } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { maskCnpjTail } from '@/lib/format'
import type { SchoolListItem } from '@/hooks/use-schools'

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativa', SUSPENDED: 'Suspensa', PENDING: 'Pendente' }
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'info'> = {
  ACTIVE: 'success', SUSPENDED: 'danger', PENDING: 'info',
}

const COLS = [
  { label: 'Escola' },
  { label: 'Franquia' },
  { label: 'CNPJ' },
  { label: 'Status' },
  { label: 'Ações', align: 'right' as const },
]

export function SchoolsTable({ schools }: { schools: SchoolListItem[] }) {
  return (
    <DataTable cols={COLS}>
      {schools.map((s) => (
        <TrHover key={s.id}>
          <Td><Person name={s.name} /></Td>
          <Td className="text-(--color-text-subtle)">{s.franchiseParent ?? '—'}</Td>
          <Td className="font-mono text-(--color-text-subtle)">{maskCnpjTail(s.cnpj)}</Td>
          <Td>
            <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'} dot>
              {STATUS_LABEL[s.status] ?? s.status}
            </Badge>
          </Td>
          <Td align="right">
            <Link href={`/escolas/${s.id}` as Route} className="font-medium text-(--color-primary) hover:underline">
              Abrir ›
            </Link>
          </Td>
        </TrHover>
      ))}
    </DataTable>
  )
}

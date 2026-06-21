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

const thClass = 'border-y border-(--color-border) bg-(--color-surface) px-4 py-[11px] text-left text-[11.5px] font-semibold uppercase tracking-[0.06em] text-(--color-text-subtle) whitespace-nowrap'

export function SchoolsTable({ schools }: { schools: SchoolListItem[] }) {
  return (
    <DataTable
      head={
        <>
          <th className={thClass}>Escola</th>
          <th className={thClass}>Franquia</th>
          <th className={thClass}>CNPJ</th>
          <th className={thClass}>Status</th>
          <th className={`${thClass} text-right`}>Ações</th>
        </>
      }
    >
      {schools.map((s) => (
        <TrHover key={s.id}>
          <Td>
            <Person name={s.name} />
          </Td>
          <Td className="text-(--color-text-subtle)">{s.franchiseParent ?? '—'}</Td>
          <Td className="font-mono text-(--color-text-subtle)">{maskCnpjTail(s.cnpj)}</Td>
          <Td>
            <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'} dot>
              {STATUS_LABEL[s.status] ?? s.status}
            </Badge>
          </Td>
          <Td className="text-right">
            <Link
              href={`/escolas/${s.id}` as Route}
              className="font-medium text-(--color-primary) hover:underline"
            >
              Abrir ›
            </Link>
          </Td>
        </TrHover>
      ))}
    </DataTable>
  )
}

import Link from 'next/link'
import type { Route } from 'next'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/patterns/DataTable'
import { Person } from '@/components/patterns/Person'
import { Badge } from '@/components/ui/badge'
import { maskCnpjTail } from '@/lib/format'
import type { SchoolListItem } from '@/hooks/use-schools'

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativa', SUSPENDED: 'Suspensa', PENDING: 'Pendente' }
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'info'> = {
  ACTIVE: 'success', SUSPENDED: 'danger', PENDING: 'info',
}

const COLUMNS: ColumnDef<SchoolListItem, unknown>[] = [
  { accessorKey: 'name', header: 'Escola', cell: ({ row }) => <Person name={row.original.name} /> },
  {
    accessorKey: 'franchiseParent',
    header: 'Franquia',
    cell: ({ row }) => (
      <span className="text-(--color-text-subtle)">{row.original.franchiseParent ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'cnpj',
    header: 'CNPJ',
    cell: ({ row }) => (
      <span className="font-mono text-(--color-text-subtle)">{maskCnpjTail(row.original.cnpj)}</span>
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
    cell: ({ row }) => (
      <Link href={`/escolas/${row.original.id}` as Route} className="font-medium text-(--color-primary) hover:underline">
        Abrir
      </Link>
    ),
  },
]

export function SchoolsTable({ schools }: { schools: SchoolListItem[] }) {
  return (
    <DataTable
      title="Escolas"
      columns={COLUMNS}
      data={schools}
      searchPlaceholder="Buscar escola..."
      emptyMessage="Nenhuma escola encontrada."
    />
  )
}

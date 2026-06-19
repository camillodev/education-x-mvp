import Link from 'next/link'
import type { Route } from 'next'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { maskCnpj } from '@/lib/format'
import type { SchoolListItem } from '@/hooks/use-schools'

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativa', SUSPENDED: 'Suspensa', PENDING: 'Pendente' }
const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'info'> = {
  ACTIVE: 'success', SUSPENDED: 'danger', PENDING: 'info',
}

export function SchoolsTable({ schools }: { schools: SchoolListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Escola</TableHead>
          <TableHead>Franquia</TableHead>
          <TableHead>CNPJ</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schools.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar name={s.name} />
                <span className="font-semibold">{s.name}</span>
              </div>
            </TableCell>
            <TableCell className="text-[var(--color-text-subtle)]">{s.franchiseParent ?? '—'}</TableCell>
            <TableCell className="text-[var(--color-text-subtle)]">{maskCnpj(s.cnpj)}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[s.status] ?? 'neutral'} dot>
                {STATUS_LABEL[s.status] ?? s.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link href={`/escolas/${s.id}` as Route} className="font-medium text-[var(--color-primary)] hover:underline">
                Abrir ›
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

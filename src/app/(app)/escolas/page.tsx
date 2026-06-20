'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useSchools, filterSchools } from '@/hooks/use-schools'
import { SchoolsTable } from '@/components/admin/SchoolsTable'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 6
type StatusFilter = 'all' | 'ACTIVE' | 'SUSPENDED'

export default function EscolasPage() {
  const { schools, loading, error } = useSchools()
  const [query, setQuery] = useState('')
  const [franchise, setFranchise] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const franchises = useMemo(
    () => ['all', ...Array.from(new Set(schools.map((s) => s.franchiseParent).filter((f): f is string => !!f)))],
    [schools]
  )

  const filtered = useMemo(
    () => filterSchools(schools, { query, franchise, status }),
    [schools, query, franchise, status]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">Escolas conectadas</p>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Gestão de escolas</h1>
          <p className="text-sm text-[var(--color-text-subtle)]">Onboarde uma unidade e ela já cobra os pais dela no mesmo dia.</p>
        </div>
        <Link href="/onboarding" className={cn(buttonVariants())}>+ Nova escola</Link>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          placeholder="Buscar por escola, franquia ou CNPJ"
          aria-label="Buscar por escola, franquia ou CNPJ"
          leadingIcon={<Search className="h-4 w-4" />}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {franchises.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={franchise === f}
              onClick={() => { setFranchise(f); setPage(1) }}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                franchise === f
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                  : 'border-[var(--color-border)] text-[var(--color-text-subtle)] hover:bg-[var(--color-primary-softer)]'
              )}
            >
              {f === 'all' ? 'Todas as franquias' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <Segmented
          aria-label="Filtrar por status"
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'ACTIVE', label: 'Ativas' },
            { value: 'SUSPENDED', label: 'Suspensas' },
          ]}
          value={status}
          onChange={(v: StatusFilter) => { setStatus(v); setPage(1) }}
        />
      </div>

      {loading && <p className="py-12 text-center text-[var(--color-text-subtle)]">Carregando escolas…</p>}
      {error && <p className="py-12 text-center text-[var(--color-danger)]">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="py-12 text-center text-[var(--color-text-subtle)]">Nenhuma escola encontrada.</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <>
          <SchoolsTable schools={pageItems} />
          <div className="mt-4 flex items-center justify-between text-sm text-[var(--color-text-subtle)]">
            <span>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} escolas
            </span>
            <div className="flex items-center gap-2">
              <Button variant="tertiary" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹ Anterior
              </Button>
              <span>{safePage} / {totalPages}</span>
              <Button variant="tertiary" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima ›
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

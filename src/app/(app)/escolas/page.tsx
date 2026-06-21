'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { useSchools, filterSchools } from '@/hooks/use-schools'
import { SchoolsTable } from '@/components/admin/SchoolsTable'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Chip } from '@/components/ui/Chip'
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
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-subtle)">Escolas conectadas</p>
          <h1 className="text-2xl font-bold text-(--color-text)">Gestão de escolas</h1>
          <p className="text-sm text-(--color-text-subtle)">Onboarde uma unidade e ela já cobra os pais dela no mesmo dia.</p>
        </div>
        <Link href="/onboarding" className={cn(buttonVariants(), 'gap-1')}>+ Nova escola</Link>
      </div>

      {/* Busca + chips de franquia + tabs de status — todos na mesma linha */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          placeholder="Buscar por escola, franquia ou CNPJ"
          aria-label="Buscar por escola, franquia ou CNPJ"
          leadingIcon={<Search className="h-4 w-4" />}
          className="max-w-sm"
        />
        {franchises.map((f) => (
          <Chip
            key={f}
            active={franchise === f}
            onClick={() => { setFranchise(f); setPage(1) }}
          >
            {f === 'all' ? 'Todas as franquias' : f}
          </Chip>
        ))}
        <Segmented
          className="ml-auto"
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

      {loading && <p className="py-12 text-center text-(--color-text-subtle)">Carregando escolas…</p>}
      {error && <p className="py-12 text-center text-(--color-danger)">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="py-12 text-center text-(--color-text-subtle)">Nenhuma escola encontrada.</p>
      )}
      {!loading && !error && filtered.length > 0 && (
        <>
          <SchoolsTable schools={pageItems} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-(--color-text-subtle)">
            <span>
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length} escolas
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="tertiary"
                size="sm"
                iconLeft="chevron-left"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className="h-[34px] w-[34px] cursor-pointer rounded-[9px] font-semibold text-[13.5px] transition-colors"
                  style={{
                    border: `1px solid ${i + 1 === safePage ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: i + 1 === safePage ? 'var(--color-primary)' : 'var(--color-bg)',
                    color: i + 1 === safePage ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <Button
                variant="tertiary"
                size="sm"
                iconRight="chevron-right"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

# Onboarding Admin — PR B1 (shell + lista) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Tela de listagem de escolas para o admin IX — sidebar admin + tabela filtrável (busca, franquia, status) com paginação client-side, consumindo `GET /api/escolas`.

**Architecture:** Next.js App Router. `(app)/escolas/layout.tsx` aplica a `AdminShell` (sidebar lateral Alfabeto). A página `escolas/page.tsx` é client component que usa `use-schools` (fetch nativo do `GET /api/escolas`) e filtra/pagina client-side. Componentes shadcn+Alfabeto: `table.tsx` novo; `Segmented`/`Badge`/`Avatar`/`Input`/`Button` já existem e são reusados. Tabs de status usam `Segmented` (sem componente tabs novo).

**Tech Stack:** Next 15 (App Router, RSC), TS strict, shadcn/ui + tokens Alfabeto (`--color-*`), lucide-react, fetch nativo, Vitest (unit), Playwright (E2E contra `pnpm dev`, bypass `DISABLE_CLERK=true`).

## Global Constraints
- Branch `feature/onboarding-admin-pages` (já criada da main). Nunca main.
- PR ≤ 400 linhas de CÓDIGO DE PRODUÇÃO (testes não contam).
- TS strict, sem `any`. Arquivo ≤ 500 linhas. Código em inglês, UI em pt-BR.
- Componentes via shadcn + tokens Alfabeto (`var(--color-*)`), salvos em `src/components/ui/` ou `src/components/admin/` — nunca estilo inline hardcoded de cor.
- Reusar `Segmented` (status tabs), `Badge`, `Avatar`, `Input`, `Button`, `cn`, `maskCnpj` — NÃO recriar.
- NÃO tocar: Create/wizard, `(app)/layout.tsx`, rotas da escola.
- Não editar testes pra passar.
- Tokens: `--color-primary:#0467DB`. Status→Badge: `ACTIVE`→success, `SUSPENDED`→danger, `PENDING`→info.
- DoD: `pnpm typecheck && pnpm test:run && DISABLE_CLERK=true pnpm exec playwright test escolas --reporter=line` (use `pnpm exec`, NUNCA `pnpm dlx` — dlx baixa cópia fresca do Playwright sem os browsers do projeto).

## Interfaces existentes (consumidas — assinaturas literais)
- `GET /api/escolas` retorna hoje: `{ id, name, cnpj, city, state, status, createdAt, subjectCount }[]`. **Task 1 adiciona `franchiseParent`.**
- `Badge` props: `variant?: "success"|"warning"|"danger"|"info"|"primary"|"neutral"`, `dot?`, `size?`.
- `Avatar`: recebe `name`, gera 2 iniciais.
- `Segmented<T>`: `{ options: {value,label,description?}[], value, onChange, "aria-label"? }`.
- `Input` props: estende input HTML + `error?`, `leadingIcon?`, `trailing?`.
- `Button`: variants `default|outline|ghost|destructive`, sizes `default|sm|lg|icon`.
- `maskCnpj(v)` de `@/lib/format`. `cn(...)` de `@/lib/utils`.

---

### Task 1: GET /api/escolas retorna franchiseParent

**Files:**
- Modify: `src/app/api/escolas/route.ts`
- Test: `tests/unit/api/escolas-list.route.test.ts` (já existe — adicionar asserção)

**Interfaces:**
- Produces: cada item do GET passa a ter `franchiseParent: string | null`.

- [ ] **Step 1: Adicionar asserção que falha no teste existente**

Em `tests/unit/api/escolas-list.route.test.ts`, no teste "200 com a lista", adicionar ao mock de `findMany.mockResolvedValue([...])` o campo `franchiseParent: 'Kumon'` no objeto, e asserir:
```ts
expect(body[0].franchiseParent).toBe('Kumon')
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/api/escolas-list.route.test.ts`
Expected: FAIL — `franchiseParent` undefined (não está no select nem no map).

- [ ] **Step 3: Adicionar franchiseParent ao select e ao map**

Em `src/app/api/escolas/route.ts`, no `prisma.unit.findMany({ select: {...} })` adicionar `franchiseParent: true,` e no `.map(...)` adicionar `franchiseParent: u.franchiseParent,`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/api/escolas-list.route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/escolas/route.ts tests/unit/api/escolas-list.route.test.ts
git commit -m "feat(api): GET /api/escolas retorna franchiseParent (coluna/filtro de franquia)"
```

---

### Task 2: Componente Table (shadcn + Alfabeto)

**Files:**
- Create: `src/components/ui/table.tsx`
- Test: `tests/unit/components/ui-table.test.tsx`

**Interfaces:**
- Produces: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` — componentes estilados com tokens Alfabeto, wrapper com `overflow-x-auto`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/components/ui-table.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

it('renderiza header e células', () => {
  render(
    <Table>
      <TableHeader><TableRow><TableHead>Escola</TableHead></TableRow></TableHeader>
      <TableBody><TableRow><TableCell>Kumon Camargos</TableCell></TableRow></TableBody>
    </Table>
  )
  expect(screen.getByText('Escola')).toBeInTheDocument()
  expect(screen.getByText('Kumon Camargos')).toBeInTheDocument()
  expect(screen.getByRole('table')).toBeInTheDocument()
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/components/ui-table.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o componente**

`src/components/ui/table.tsx` (padrão shadcn, tokens Alfabeto):
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-[var(--color-border)]', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary-softer)]', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn('h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle text-[var(--color-text)]', className)} {...props} />
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/components/ui-table.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/table.tsx tests/unit/components/ui-table.test.tsx
git commit -m "feat(ui): componente Table shadcn+Alfabeto"
```

---

### Task 3: Shell admin (sidebar)

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`
- Create: `src/components/admin/AdminShell.tsx`
- Create: `src/app/(app)/escolas/layout.tsx`
- Test: `tests/unit/components/AdminSidebar.test.tsx`

**Interfaces:**
- Produces: `AdminShell({ children })` — flex com sidebar fixa + main. `AdminSidebar` — logo EducationX, nav item "Escolas" (lucide `School` ou `Building2`, ativo via `usePathname`), rodapé usuário. `layout.tsx` envolve children em `AdminShell`.

- [ ] **Step 1: Escrever o teste que falha**

`tests/unit/components/AdminSidebar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

vi.mock('next/navigation', () => ({ usePathname: () => '/escolas' }))

it('mostra logo e item Escolas', () => {
  render(<AdminSidebar />)
  expect(screen.getByText('EducationX')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /escolas/i })).toHaveAttribute('href', '/escolas')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/components/AdminSidebar.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar sidebar + shell + layout**

`src/components/admin/AdminSidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { School } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [{ href: '/escolas', label: 'Escolas', icon: School }]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-6 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          X
        </div>
        <span className="font-semibold text-[var(--color-text)]">EducationX</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--color-primary-softer)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-primary-softer)]'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto rounded-md border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-subtle)]">
        ADMIN IX
      </div>
    </aside>
  )
}
```

`src/components/admin/AdminShell.tsx`:
```tsx
import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden p-6 lg:p-10">{children}</main>
    </div>
  )
}
```

`src/app/(app)/escolas/layout.tsx`:
```tsx
import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'

export default function EscolasLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/components/AdminSidebar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/ src/app/\(app\)/escolas/layout.tsx tests/unit/components/AdminSidebar.test.tsx
git commit -m "feat(admin): shell + sidebar lateral (Alfabeto) para telas admin"
```

---

### Task 4: Hook use-schools (fetch + filtros)

**Files:**
- Create: `src/hooks/use-schools.ts`
- Test: `tests/unit/hooks/use-schools.test.ts`

**Interfaces:**
- Produces:
  - `type SchoolListItem = { id, name, cnpj, city, state, status, createdAt, subjectCount, franchiseParent: string | null }`
  - `useSchools()` → `{ schools, loading, error, refetch }` (fetch `/api/escolas`).
  - `filterSchools(schools, { query, franchise, status }): SchoolListItem[]` — função pura, client-side. `query` casa name/cnpj/franchiseParent (case-insensitive); `franchise` casa franchiseParent exato ou 'all'; `status` casa status ou 'all'.

- [ ] **Step 1: Escrever o teste que falha** (foca na função pura `filterSchools`)

`tests/unit/hooks/use-schools.test.ts`:
```ts
import { filterSchools, type SchoolListItem } from '@/hooks/use-schools'

const base: SchoolListItem = {
  id: '1', name: 'Kumon Camargos', cnpj: '11222333000190', city: 'BH', state: 'MG',
  status: 'ACTIVE', createdAt: new Date().toISOString() as unknown as Date,
  subjectCount: 2, franchiseParent: 'Kumon',
}
const list: SchoolListItem[] = [
  base,
  { ...base, id: '2', name: 'Cultura Inglesa Lourdes', cnpj: '99888777000144', franchiseParent: 'Cultura Inglesa', status: 'SUSPENDED' },
]

it('filtra por query (nome)', () => {
  expect(filterSchools(list, { query: 'cultura', franchise: 'all', status: 'all' })).toHaveLength(1)
})
it('filtra por query (cnpj parcial)', () => {
  expect(filterSchools(list, { query: '000190', franchise: 'all', status: 'all' })).toHaveLength(1)
})
it('filtra por franquia', () => {
  expect(filterSchools(list, { query: '', franchise: 'Kumon', status: 'all' })).toHaveLength(1)
})
it('filtra por status', () => {
  expect(filterSchools(list, { query: '', franchise: 'all', status: 'SUSPENDED' })).toHaveLength(1)
})
it('sem filtro retorna tudo', () => {
  expect(filterSchools(list, { query: '', franchise: 'all', status: 'all' })).toHaveLength(2)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/hooks/use-schools.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar o hook**

`src/hooks/use-schools.ts`:
```ts
'use client'

import { useCallback, useEffect, useState } from 'react'

export interface SchoolListItem {
  id: string
  name: string
  cnpj: string
  city: string
  state: string
  status: string
  createdAt: Date
  subjectCount: number
  franchiseParent: string | null
}

export interface SchoolFilters {
  query: string
  franchise: string // 'all' | <franchiseParent>
  status: string // 'all' | 'ACTIVE' | 'SUSPENDED' | 'PENDING'
}

export function filterSchools(schools: SchoolListItem[], f: SchoolFilters): SchoolListItem[] {
  const q = f.query.trim().toLowerCase()
  return schools.filter((s) => {
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.cnpj.toLowerCase().includes(q) ||
      (s.franchiseParent?.toLowerCase().includes(q) ?? false)
    const matchF = f.franchise === 'all' || s.franchiseParent === f.franchise
    const matchS = f.status === 'all' || s.status === f.status
    return matchQ && matchF && matchS
  })
}

export function useSchools() {
  const [schools, setSchools] = useState<SchoolListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/escolas')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Falha ao carregar escolas.')
      }
      setSchools((await res.json()) as SchoolListItem[])
    } catch (err) {
      console.error('[useSchools] fetch error:', err)
      setError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { schools, loading, error, refetch }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run tests/unit/hooks/use-schools.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-schools.ts tests/unit/hooks/use-schools.test.ts
git commit -m "feat(hooks): use-schools — fetch lista + filterSchools (client-side)"
```

---

### Task 5: Página lista de escolas

**Files:**
- Create: `src/app/(app)/escolas/page.tsx`
- Create: `src/components/admin/SchoolsTable.tsx` (a tabela + linhas — separa pra página não passar de 500 linhas)
- Test: `tests/unit/components/SchoolsTable.test.tsx`

**Interfaces:**
- Consumes: `useSchools`, `filterSchools`, `SchoolListItem`, `Table*`, `Badge`, `Avatar`, `Segmented`, `Input`, `Button`, `maskCnpj`.
- Produces: `SchoolsTable({ schools })` — renderiza as linhas (avatar+nome, franquia, CNPJ mascarado, status badge, link "Abrir"). `page.tsx` — orquestra filtros (busca/chips/segmented) + paginação + estados.

- [ ] **Step 1: Escrever o teste que falha** (SchoolsTable)

`tests/unit/components/SchoolsTable.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { SchoolsTable } from '@/components/admin/SchoolsTable'
import type { SchoolListItem } from '@/hooks/use-schools'

const schools: SchoolListItem[] = [{
  id: 'abc', name: 'Kumon Camargos', cnpj: '11222333000190', city: 'BH', state: 'MG',
  status: 'ACTIVE', createdAt: new Date(), subjectCount: 2, franchiseParent: 'Kumon',
}]

it('renderiza nome, franquia, cnpj mascarado, status e link Abrir', () => {
  render(<SchoolsTable schools={schools} />)
  expect(screen.getByText('Kumon Camargos')).toBeInTheDocument()
  expect(screen.getByText('Kumon')).toBeInTheDocument()
  expect(screen.getByText('11.222.333/0001-90')).toBeInTheDocument()
  expect(screen.getByText(/ativa/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /abrir/i })).toHaveAttribute('href', '/escolas/abc')
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run tests/unit/components/SchoolsTable.test.tsx`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar SchoolsTable + page**

`src/components/admin/SchoolsTable.tsx`:
```tsx
import Link from 'next/link'
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
              <Link href={`/escolas/${s.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                Abrir ›
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

`src/app/(app)/escolas/page.tsx`:
```tsx
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
          leadingIcon={<Search className="h-4 w-4" />}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {franchises.map((f) => (
            <button
              key={f}
              type="button"
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

      <div className="mb-4 max-w-xs">
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
              <Button variant="ghost" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹ Anterior
              </Button>
              <span>{safePage} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima ›
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

> Confirmado: `Button` NÃO tem `asChild`/Slot. O "+ Nova escola" usa `<Link className={cn(buttonVariants())}>` (já no código acima). `status` é tipado como `StatusFilter` pra casar com `Segmented<T>`.

- [ ] **Step 4: Rodar e ver passar + typecheck**

Run: `pnpm vitest run tests/unit/components/SchoolsTable.test.tsx && pnpm typecheck`
Expected: PASS + exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/escolas/page.tsx src/components/admin/SchoolsTable.tsx tests/unit/components/SchoolsTable.test.tsx
git commit -m "feat(escolas): página lista — tabela filtrável (busca/franquia/status) + paginação"
```

---

### Task 6: E2E da lista + global-setup de seed

**Files:**
- Create: `tests/e2e/escolas.spec.ts`
- Create: `tests/e2e/_seed.ts` (helper de seed/cleanup via Prisma, reutilizável)
- Modify: `playwright.config.ts` (adicionar `globalSetup`/`globalTeardown` OU seed via beforeAll no spec)

**Interfaces:**
- Consumes: `prisma` (`@/lib/db`), `encrypt` (`@/lib/crypto`), `TEST_PREFIX`/`cleanupUnits` (`tests/integration/_setup`).
- Produces: `seedSchool(opts)` em `_seed.ts` cria Unit completa (status, franchiseParent). Specs E2E navegam `/escolas`.

- [ ] **Step 1: Escrever o E2E que falha**

`tests/e2e/_seed.ts`:
```ts
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { TEST_PREFIX, cleanupUnits } from '../integration/_setup'

export { TEST_PREFIX, cleanupUnits }

export async function seedSchool(opts: { name: string; cnpj: string; franchiseParent?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'PENDING' }) {
  const cpfEnc = await encrypt('12345678909')
  return prisma.unit.create({
    data: {
      name: `${TEST_PREFIX} ${opts.name}`, cnpj: opts.cnpj, email: 'e@e.com', phone: '31999990000',
      cep: '30000000', address: 'Rua Teste', number: '1', neighborhood: 'Centro', city: 'BH', state: 'MG',
      isFranchise: !!opts.franchiseParent, franchiseParent: opts.franchiseParent ?? null,
      responsibleName: 'Resp Teste', responsibleCpfEnc: cpfEnc, responsibleEmail: 'r@r.com', responsiblePhone: '31988880000',
      status: opts.status ?? 'ACTIVE',
      billingConfig: { create: {
        dueDay: 5, closingDay: 1, lateFeePercent: 100, monthlyInterestBp: 100,
        cardFeePayer: 'RESPONSAVEL', negativacaoFeePayer: 'RESPONSAVEL', municipalRegistration: '0001',
        planId: 'basico', planPriceCents: 39900,
      }},
      subjects: { create: [{ name: 'Mat', nfseServiceCode: '0001', priceCents: 10000, annualPriceCents: 100000 }] },
    },
  })
}
```

`tests/e2e/escolas.spec.ts`:
```ts
import { test, expect } from '@playwright/test'
import { seedSchool, cleanupUnits } from './_seed'

test.beforeAll(async () => {
  await cleanupUnits()
  await seedSchool({ name: 'Kumon Camargos E2E', cnpj: '11222333000190', franchiseParent: 'Kumon', status: 'ACTIVE' })
  await seedSchool({ name: 'Wizard Contagem E2E', cnpj: '99888777000122', franchiseParent: 'Wizard', status: 'SUSPENDED' })
})
test.afterAll(async () => { await cleanupUnits() })

test('lista carrega e mostra as escolas seedadas', async ({ page }) => {
  await page.goto('/escolas')
  await expect(page.getByText(`${'__itest__'} Kumon Camargos E2E`)).toBeVisible()
  await expect(page.getByRole('heading', { name: /gestão de escolas/i })).toBeVisible()
})

test('busca filtra por nome', async ({ page }) => {
  await page.goto('/escolas')
  await page.getByPlaceholder(/buscar/i).fill('Wizard')
  await expect(page.getByText(/Wizard Contagem E2E/)).toBeVisible()
  await expect(page.getByText(/Kumon Camargos E2E/)).toHaveCount(0)
})

test('filtro de status Suspensas mostra só suspensas', async ({ page }) => {
  await page.goto('/escolas')
  await page.getByRole('radio', { name: /suspensas/i }).click()
  await expect(page.getByText(/Wizard Contagem E2E/)).toBeVisible()
  await expect(page.getByText(/Kumon Camargos E2E/)).toHaveCount(0)
})
```

> **Decisão (contrato vs realidade):** o contrato B1 lista "não-admin → 403" no E2E, mas o bypass `DISABLE_CLERK` fixa o role por env (`DEV_USER_ROLE`) e o `webServer` do Playwright sobe UMA vez — não dá pra ser admin (ver a lista) e não-admin (403) no mesmo run. O caso 403 NÃO cabe neste E2E. **Cobertura de 403 já existe nos unit tests de rota do PR A** (`tests/unit/api/escolas-list.route.test.ts` — caso "403 para não-admin", via `guardAdmin`). Portanto o caso 403 é REMOVIDO do E2E. Registrar isso no report (não é gap silencioso). Comportamento do orientador em `/escolas`: carrega a chrome (sidebar) e os dados retornam 403 → estado de erro na tabela. Aceitável pra ferramenta interna no MVP.

- [ ] **Step 2: Confirmar resolução de imports `@/` no Playwright + listar**

`tests/e2e/_seed.ts` importa `@/lib/db` e `@/lib/crypto`. O `tsconfig.json` tem `paths: { "@/*": ["./src/*"] }` (confirmado). Rodar:
Run: `pnpm exec playwright test escolas --list`
Expected: lista os testes SEM erro de resolução de módulo. Se `@/` não resolver no contexto do Playwright, adicionar um `tsconfig`-aware loader ou trocar os imports do `_seed.ts` por caminho relativo (`../../src/lib/db`). NÃO prosseguir até `--list` funcionar.

- [ ] **Step 3 (RED): Rodar e ver falhar**

Run: `DISABLE_CLERK=true pnpm exec playwright test escolas --reporter=line`
Expected: FAIL — seletores não batem até a UI das tasks 1-5 estar montada (ou GREEN direto se tudo certo, aceitável pra E2E).

- [ ] **Step 3: Ajustar seletores/IDs até o E2E refletir a UI real**

Rodar o app local (`DISABLE_CLERK=true pnpm dev`), abrir `/escolas`, conferir que os `getByText`/`getByRole` batem com o DOM real. Ajustar seletores no spec (NÃO afrouxar asserções de comportamento). Se algum `data-testid` for necessário, adicionar na UI.

- [ ] **Step 4: Rodar o DoD completo do B1**

Run: `pnpm typecheck && pnpm test:run && DISABLE_CLERK=true pnpm exec playwright test escolas --reporter=line`
Expected: exit 0 em tudo (3 breakpoints do Playwright passam).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/ playwright.config.ts
git commit -m "test(e2e): lista de escolas — seed via Prisma + casos de busca/filtro"
```

---

## Self-Review

**Spec coverage (vs TASK-01-PR-B1.md):**
- Shell admin → Task 3 ✓ · Table shadcn → Task 2 ✓ · página lista (busca/chips/status/paginação/estados) → Task 5 ✓ · use-schools → Task 4 ✓ · GET franchiseParent → Task 1 ✓ · E2E lista → Task 6 ✓.
- Status tabs via `Segmented` (não criou `tabs.tsx`) — YAGNI respeitado.
- Not-included (edição) → sem task, correto (PR B2).

**Type consistency:** `SchoolListItem` definido na Task 4, consumido em 5/6. `filterSchools(schools, {query,franchise,status})` consistente. `Badge variant` usa só success/danger/info/neutral (existem). `Segmented` value é string.

**Riscos abertos (resolver na execução, documentar no report):**
1. `Button asChild` pode não existir → fallback `buttonVariants()` no Link (nota na Task 5).
2. Teste E2E de 403: o bypass fixa role por env, talvez não dê pra forçar não-admin por request — fallback: cobertura fica no unit do PR A, remove do E2E (nota na Task 6).
3. `Avatar`/`Segmented` props exatas — confirmadas via leitura; se divergir, ajustar no Step de verificação.
4. Playwright roda contra `pnpm dev` e precisa do banco com seed — `beforeAll` seedа via Prisma (mesmo `DATABASE_URL`). Garantir que o webServer sobe com `DISABLE_CLERK=true` (passar env no comando do DoD).

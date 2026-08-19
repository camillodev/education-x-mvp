---
name: edx-datatable
description: Padrão DataTable único do Education X — TanStack Table v8 + tokens Alfabeto, reusado em ~8 telas (matrículas, cobranças, negativação, extrato, faturas). Use ao construir QUALQUER listagem tabular. Auto-contido no repo.
triggers:
  - datatable
  - tabela
  - listagem
  - tanstack table
---

# DataTable — Padrão Único do Education X

> Skill do projeto, auto-contida. Fonte de verdade: `.claude/rules/frontend.md` §DataTable. NÃO criar `<table>` inline nem segunda DataTable — TODAS as ~8 tabelas são configurações deste mesmo organismo. Para sintaxe TanStack v8 nova, consultar `context7`.

## Princípio
Um único `<DataTable />` em `src/components/patterns/DataTable.tsx` atende: matrículas, cobranças, negativação, extrato, faturas, alunos, responsáveis, etc. Diferença entre telas = só as `columns` e os `data`. Zero duplicação.

## Stack
- **TanStack Table v8** (headless — só lógica de tabela) + wrapper visual com tokens Alfabeto (azul `#0467DB`, Inter).
- Client component (`'use client'`) — tem sort/filtro/paginação interativos.

## API do componente
```tsx
interface DataTableProps<T> {
  columns: ColumnDef<T>[];   // TanStack column defs (tipadas)
  data: T[];
  title?: string;            // título acima da tabela
  action?: React.ReactNode;  // botão (Novo, Exportar) no topo direito
  searchable?: boolean;      // campo de busca
  filterable?: boolean;      // filtro segmented
  isLoading?: boolean;       // estado de carregamento (skeleton)
  emptyState?: { icon: string; title: string; cta?: React.ReactNode }; // estado vazio
}
```

## Visual obrigatório (todos os itens)
1. **Header:** título à esquerda + `action` à direita (botão Novo/Exportar)
2. **Busca + filtro:** campo de busca + filtro segmented (quando `searchable`/`filterable`)
3. **Cabeçalhos ordenáveis:** clicar ordena (asc/desc/none), ícone indica direção
4. **Badges pra valores categóricos:** status → `<StatusBadge />` com cores padronizadas (pago=verde, a vencer=azul, vencido=vermelho — tokens Alfabeto)
5. **Paginação sempre visível** (mesmo com 1 página)
6. **3 estados não-felizes obrigatórios:**
   - **loading** → skeleton rows (não spinner solto)
   - **vazio** → `<EmptyState />` com ícone + título + CTA opcional
   - **erro** → mensagem clara em pt-BR (não stack trace)
7. **Dinheiro:** valores chegam em centavos; exibir `(cents/100).toLocaleString('pt-BR', { style:'currency', currency:'BRL' })`. Nunca Float em cálculo.

## Responsividade (mobile-first — 375/768/1440)
- **Desktop (≥768):** tabela tradicional.
- **Mobile (<768):** cada linha vira um **card** (um por linha); busca/filtro ficam acima empilhados.
- A troca tabela↔card é responsabilidade do DataTable (não de cada feature).

## Camadas (rígido)
```
Component (tela) → useDataTable (hook) → Service → API Route
```
- A tela passa `columns` + chama o hook que busca `data` via Service. O `<DataTable />` só renderiza.
- Component NUNCA chama Prisma/Asaas/fetch direto.
- `columns` (ColumnDef) são boilerplate → tarefa de Haiku. A composição da tela e o hook → Sonnet.

## Exemplo de uso (cobranças)
```tsx
'use client';
import { DataTable } from '@/components/patterns/DataTable';
import { StatusBadge } from '@/components/patterns/StatusBadge';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Invoice>[] = [
  { accessorKey: 'guardianName', header: 'Responsável' },
  { accessorKey: 'amountCents', header: 'Valor',
    cell: ({ row }) => (row.original.amountCents / 100)
      .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
  { accessorKey: 'status', header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: 'dueDateUtc', header: 'Vencimento',
    cell: ({ row }) => new Date(row.original.dueDateUtc).toLocaleDateString('pt-BR') },
];

export function InvoicesTable({ data, isLoading }: { data: Invoice[]; isLoading: boolean }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      title="Cobranças"
      searchable
      filterable
      isLoading={isLoading}
      emptyState={{ icon: 'receipt', title: 'Nenhuma cobrança ainda' }}
    />
  );
}
```

## Status colors (StatusBadge — padronizado)
| Status | Cor (token) |
|--------|-------------|
| Pago / Ativo / Regularizado | verde (success) |
| A vencer / Pendente / Em aviso | azul (`--color-primary`) ou âmbar |
| Vencido / Negativado / Cancelado | vermelho (danger) |

## Anti-padrões
- ❌ `<table>` inline numa feature
- ❌ segunda DataTable / variação do organismo
- ❌ tabela sem estado vazio/loading/erro
- ❌ tabela que não vira card no mobile
- ❌ Float pra dinheiro · UI em inglês
- ❌ Component buscando data direto (passe por hook + service)

> ⚠️ Este padrão será refinado quando a 1ª DataTable real for construída (Tarefa 2 — matrículas). Ajustar o exemplo/props ao código real então.

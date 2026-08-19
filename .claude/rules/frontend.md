# Regras Frontend — Education X

## Stack
- **Next.js 16 App Router**: RSC por padrão. `'use client'` somente quando há interatividade real (forms, listeners, state).
- **React 19**: hooks finais, sem legado.
- **Tailwind CSS 4**: variáveis de tema, modo dark nativo.
- **shadcn/ui**: componentes base. Tokens Alfabeto: azul `#0467DB`, fonte `Inter`.

## Atomic Design (obrigatório)
```
components/ui/           # átomos (Button, Input, Dialog — shadcn direto)
components/patterns/     # moléculas/organismos reutilizáveis
  ├── DataTable.tsx      # UM único organismo para todas as tabelas
  ├── FormField.tsx
  ├── PageHeader.tsx
  ├── StatusBadge.tsx
  ├── MetricCard.tsx
  ├── EmptyState.tsx
  └── Stepper.tsx
components/[feature]/    # composição de feature (ex: enroll, billing, collections)
```

**ANTES de criar componente novo: checar se já existe.** Zero duplicação.

## DataTable — Padrão Único
- Usa **TanStack Table v8** (headless) + wrapper visual Alfabeto.
- TODAS as ~8 tabelas (matrículas, cobranças, negativação, extrato, faturas) são configurações do mesmo `<DataTable />`.
- Props: `columns`, `data`, `title`, `action`, `searchable`, `filterable`, `sortable`.
- Visual obrigatório:
  - Título + botão de ação (novo, exportar, etc.)
  - Busca + filtro segmented
  - Cabeçalhos ordenáveis
  - Valores categóricos = Badge (status cores padronizadas)
  - Paginação sempre visível
  - Estado vazio (EmptyState com ícone + CTA)
  - Responsivo: desktop=tabela, mobile=cards

## Camadas (separação rígida)
```
Component → Hook → Store (Zustand/TanStack Query) → Service → API Route
```
- **Component**: renderização, interatividade local, layout.
- **Hook**: lógica de estado compartilhado (useDataTable, useForm).
- **Service**: lógica cliente (transformação, validação), imports de `fetch`.
- **API Route**: validação de input, autorização, delegação para backend Service.
- **Component nunca chama Prisma/Asaas direto.**

## Responsividade (mobile-first)
- Breakpoints: `375px` (mobile), `768px` (tablet), `1440px` (desktop).
- DataTable no mobile: vira **cards** (um por linha), busca/filtro acima.
- Sidebar: colapsa em **drawer** (overlay) no mobile.
- Wizard: **um passo por tela** no mobile, 2-3 colunas no desktop.
- Modais: full-screen no mobile, centered no desktop.

## Valores (dinheiro)
- Frontend RECEBE valores em centavos (Int) da API.
- Converte centavos → reais **SOMENTE na exibição** (divide por 100, formata pt-BR).
- Nunca Float em cálculo.
- Exemplo: `const reais = centavos / 100; const display = reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.

## UI Idioma
- Sempre **pt-BR**. Labels, placeholders, mensagens, tooltips.

## Docs ao Vivo
- **context7**: antes de assumir sintaxe de React 19/Next 16/shadcn/TanStack, consultar docs live.
- Não confiar em conhecimento pré-jan/2026.

## Anti-padrões
- ❌ Component com lógica de negócio.
- ❌ Múltiplas DataTables diferentes.
- ❌ `<table>` inline em feature.
- ❌ Valores Float pra dinheiro.
- ❌ UI em inglês.
- ❌ API call direto do component (passe por Service + Hook).

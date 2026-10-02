---
name: ix-engineering
description: >
  Engenharia de software completa da Impact X. Ativa quando Rafa mencionar: system design, arquitetura, PRD, requisitos, protótipo, frontend, backend, API, banco de dados, "como eu modelo isso", "qual a melhor abordagem", "cria o sistema", "faz o prototype", "design do backend", "como estruturo", commits, PRs, code review, deploy, testes, ou qualquer decisão técnica ou implementação. Cobre o ciclo completo: definição de problema → hipóteses → PRD → system design → protótipo navegável → frontend consistente → backend seguro → deploy. Cada etapa encadeia com a próxima. Segue padrões de código, commits organizados e PRs bem estruturadas.
---

# IX Engineering — Engenharia de Software Impact X

Ciclo completo de engenharia. Cada etapa produz artefatos que alimentam a próxima.

**Pré-requisito**: ix-core (stack, projetos). Frequentemente encadeado com ix-product-ops (tickets).
**Pré-requisito código**: ix-code-guidelines (naming, TDD, DRY, commits, PRs). Regras de código transversais vivem lá.

---

## Ciclo de engenharia

```
[1. Problema & Hipóteses]
    ↓
[2. PRD & Requisitos]
    ↓
[3. System Design]
    ↓
[4. Protótipo Navegável]
    ↓
[5. Frontend]
    ↓
[6. Backend]
    ↓
[7. Testes & Deploy]
```

---

## 1. Definição de Problema e Hipóteses

**Trigger**: "qual o problema aqui", "define o problema", início de projeto novo

Antes de escrever código, definir:

```
## Problema
[1-2 frases claras do que está errado ou precisa existir]

## Quem sofre
[Persona: quem é afetado e como]

## Hipóteses
1. [Se fizermos X, então Y acontece, medido por Z]
2. [Se fizermos A, então B acontece, medido por C]

## Métricas de sucesso
- [métrica 1 — como medir]
- [métrica 2 — como medir]

## O que NÃO é escopo
- [explicitamente fora do escopo]
```

## 2. PRD & Requisitos

**Trigger**: "faz o PRD", "requisitos do sistema", após definição de problema

Leia `references/prd-template.md` para o template completo. Resumo:

```
## PRD: [Nome do Feature/Projeto]

### Contexto
[Link para definição de problema]

### User Stories
- Como [persona], quero [ação], para [benefício]

### Requisitos Funcionais
1. [RF-01] [requisito — verificável]
2. [RF-02] [requisito — verificável]

### Requisitos Não-Funcionais
- Performance: [target — ex: <200ms p95]
- Segurança: [reqs — ex: auth JWT, rate limiting]
- Escalabilidade: [target — ex: 1k req/s]

### Fora de escopo
- [item 1]

### Dependências
- [sistema/API/time que depende]
```

## 3. System Design

**Trigger**: "system design", "como eu modelo", "arquitetura do sistema"

Leia `references/system-design-checklist.md`. Formato:

```
## System Design: [Nome]

### Diagrama de alto nível
[Descrever componentes e como se conectam — ou gerar Mermaid]

### Stack escolhida
| Camada | Tecnologia | Por quê |
|--------|-----------|---------|
| Frontend | Next.js + TypeScript | SSR/SSG, tipagem, ecossistema |
| Backend | Node.js + Hono/Express | Leve, TypeScript nativo |
| Database | Supabase (Postgres) | Auth built-in, real-time, edge |
| Cache | Cloudflare KV | Edge, global, <10ms |
| Hosting | Vercel + Cloudflare | Edge deploy, preview URLs |

### Modelo de dados
[Tabelas principais + relações — SQL ou diagrama]

### Endpoints API
[Lista de endpoints com método, path, auth, breve descrição]

### Trade-offs
| Decisão | Alternativa descartada | Por quê |
|---------|----------------------|---------|

### Riscos técnicos
- [risco 1 — mitigação]
```

## 4. Protótipo Navegável

**Trigger**: "cria prototype", "faz um mockup", "protótipo navegável"

**Output**: arquivo `.html` ou `.jsx` interativo com:
- Todas as telas principais
- Navegação funcional entre telas
- Dados mockados realistas
- Estilização com Tailwind (consistente com design system IX)
- Componentes reutilizáveis

**Design System IX base:**
- Cores: `#7B2FBE` (primário), `#1A1A2E` (texto), `#FAFAFA` (bg)
- Font: Roboto (ou Inter para UI)
- Radius: `8px` (cards), `4px` (inputs), `full` (badges)
- Spacing: múltiplos de 4px
- Shadows: subtle (`0 1px 3px rgba(0,0,0,0.1)`)

## 5. Frontend

**Trigger**: "cria o frontend", "implementa a UI", após design/protótipo

Leia `references/frontend-standards.md`. Princípios:

### Padrões obrigatórios
- **TypeScript strict**: `strict: true` no tsconfig. Sem `any`.
- **Componentes**: functional components + hooks. Sem class components.
- **Naming**: PascalCase componentes, camelCase funções/variáveis, kebab-case arquivos
- **Estrutura de pasta**:
  ```
  src/
  ├── app/          # Routes (Next.js App Router)
  ├── components/
  │   ├── ui/       # Design system primitives (Button, Input, Card)
  │   └── features/ # Feature-specific components
  ├── lib/          # Utilities, helpers, config
  ├── hooks/        # Custom hooks
  ├── types/        # TypeScript types/interfaces
  └── styles/       # Global styles
  ```
- **Imports**: absolutos (`@/components/...`), nunca relativos profundos
- **State**: Zustand ou React Context. Redux só se projeto exigir.
- **Styling**: Tailwind CSS. Classes organizadas: layout → spacing → typography → colors → effects
- **Forms**: React Hook Form + Zod validation
- **Data fetching**: TanStack Query (React Query)
- **Error handling**: Error Boundaries + toast notifications

### Design System (consistência)
- Usar shadcn/ui como base
- Customizar com paleta IX
- Componentes padronizados exportados de `/components/ui`
- Nunca estilos inline

## 6. Backend

**Trigger**: "cria o backend", "API", "implementa o servidor"

Leia `references/backend-standards.md`. Princípios:

### Padrões obrigatórios
- **TypeScript strict** em tudo
- **Arquitetura**: modular por domínio (não por tipo)
  ```
  src/
  ├── modules/
  │   ├── auth/
  │   │   ├── auth.controller.ts
  │   │   ├── auth.service.ts
  │   │   ├── auth.schema.ts    # Zod validation
  │   │   └── auth.types.ts
  │   └── users/
  ├── middleware/     # Auth, rate-limit, error-handler
  ├── lib/           # DB client, external services
  └── config/        # Environment, constants
  ```
- **Validation**: Zod em TODA entrada (body, params, query)
- **Auth**: JWT com refresh tokens. Rate limiting em todos os endpoints públicos.
- **Error handling**: Custom error classes. NUNCA expor stack traces em produção.
- **Logging**: Structured logging (JSON). Levels: error, warn, info, debug.
- **Security checklist**:
  - [ ] Input validation (Zod)
  - [ ] Auth em rotas protegidas
  - [ ] Rate limiting
  - [ ] CORS configurado
  - [ ] Helmet (headers de segurança)
  - [ ] Sanitização de SQL (Supabase/Drizzle)
  - [ ] Secrets em env vars (nunca hardcoded)
  - [ ] HTTPS only

### API Design
- RESTful com convenções claras
- Versionamento: `/api/v1/`
- Responses padronizadas:
  ```json
  { "data": {}, "error": null }
  { "data": null, "error": { "code": "NOT_FOUND", "message": "..." } }
  ```

## 7. Commits, PRs e Deploy

**Commits e PRs**: ver **ix-code-guidelines** (Conventional Commits, PR template, checklist).

### Deploy
- **Preview**: cada PR gera preview no Vercel
- **Staging**: merge pra `develop`
- **Production**: merge pra `main` (com approval)

---

## Encadeamento

| Quando | Encadeia com |
|--------|-------------|
| Ticket Linear com `needs-spec` | ← ix-product-ops alimenta |
| Precisar de proposta técnica | → ix-reports (relatório branded) |
| Deploy feito | → Slack notification + Linear ticket update |
| Precisar de design visual | → web-artifacts-builder ou protótipo inline |

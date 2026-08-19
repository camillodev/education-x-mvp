# Regras Banco de Dados — Education X

Postgres (Supabase) via Prisma 6. Carregar ao mexer em `prisma/schema.prisma`, migration, ou
query que filtra por tenant.

## Patterns

- **Índice em toda coluna de filtro de tenant.** Este é um app multi-tenant: praticamente toda
  query real filtra por `unitId`. Sem índice, o Postgres faz seq scan na tabela inteira — funciona
  com 50 linhas, cai com 50 mil.
- **Índice composto na ordem do filtro.** Query que faz `where: { unitId, status }` quer
  `@@index([unitId, status])`, não dois índices separados. A coluna mais seletiva primeiro.
- **`@db.Decimal` para dinheiro** — nunca `Float`. Já é regra em `backend.md`, repetida aqui
  porque o ponto de decisão é o schema.
- **Migration é aditiva por padrão.** Coluna nova entra nullable ou com default; só depois de
  backfill vira `NOT NULL`. Em produção, deploy e migration não são atômicos.
- **RLS é o default, não a exceção.** Toda tabela com dado de escola nasce com policy de
  isolamento por tenant. A checagem na aplicação é a segunda camada, não a primeira.

## Anti-padrões

- ❌ **Query filtrando por `unitId` sem `@@index`.** Estado atual verificado (19/ago/2026):
  **6 models, 12 referências a `unitId`, apenas 3 `@@index`** — metade dos models filtra por
  tenant sem índice. Ao tocar qualquer um deles, adicionar o índice faz parte da mudança.
- ❌ Migration destrutiva (`DROP COLUMN`, `NOT NULL` em coluna existente) sem backfill em
  migration anterior separada.
- ❌ `findMany()` sem `select`/`include` explícito — traz colunas que ninguém usa, e passa a
  trazer as colunas novas que forem adicionadas depois, sem ninguém perceber.
- ❌ Contar com `deleteMany` em cascade sem `onDelete` declarado no schema — comportamento
  implícito muda entre versões.
- ❌ Índice em coluna booleana de baixa cardinalidade sozinha (ex.: `@@index([ativo])`) — o
  planner ignora; só serve composto com a coluna de tenant.

## Performance

- Toda migration que cria índice em tabela grande: `CREATE INDEX CONCURRENTLY` (Prisma exige
  migration SQL manual pra isso — o `prisma migrate` gera bloqueante por padrão).
- Antes de otimizar, medir: `EXPLAIN ANALYZE` na query real, não no palpite. Supabase MCP
  (`execute_sql`) resolve isso sem sair da sessão.
- Serverless (Vercel) abre conexão por invocação — usar o pooler do Supabase (porta 6543,
  `pgbouncer=true`) na `DATABASE_URL`, e a conexão direta (5432) só para migration.
- `relationLoadStrategy: "join"` (Prisma ≥5.x) resolve relação em 1 query em vez de 2 — usar
  quando a relação é sempre necessária junto.

# ADR-0002: Isolamento multi-tenant por aplicação (não RLS)

**Status:** Accepted  
**Data:** 2026-06-13

## Contexto
Cada escola (Unit) deve ser isolada — requisito de produto e LGPD. Precisa evitar vazamento de dados entre tenants. Duas estratégias: Row-Level Security do Postgres ou isolamento na camada de aplicação.

## Decisão
Isolamento na camada de aplicação via Prisma client extension. Toda query Prisma filtra automaticamente por unitId derivado da sessão Clerk. O unitId nunca é parametrizável por HTTP. A extension injeta o filtro antes da execução.

## Consequências
✅ Controle testável, sem depender de policies de banco  
✅ unitId garantido derivado da sessão autenticada, não de parâmetro HTTP  
✅ Debugging mais fácil — logs mostram a query e o filtro aplicado  
⚠️ Responsabilidade fica na camada de serviço — exige disciplina para não esquecer a extension  
⚠️ Precisa de contract tests que validem que a extension funciona  

## Alternativas consideradas
- **RLS Postgres:** Mais seguro em tese, mas difícil de testar e debugar, acoplado ao banco
- **Schema-per-tenant:** Isolamento total, mas complexidade extrema em migração e operação

# ADR-0006: Não adotar ERP ou template admin pronto — construir domínio próprio, copiar componentes shadcn pontualmente

**Status:** Accepted
**Data:** 2026-08-23

## Contexto
Hipótese levantada: usar um "ERP shadcn whitelabel" gratuito do GitHub como base, integrando com nosso banco/marca/Asaas, entregaria o MVP mais rápido do que construir do zero. Pesquisa com 3 subagents em paralelo investigou (1) templates de admin dashboard shadcn, (2) ERPs/sistemas escolares open-source, (3) riscos de adotar template externo vs. copiar componentes shadcn individualmente.

Achados:
- **Nenhum ERP/sistema escolar open-source combina** domínio escolar + billing brasileiro (Asaas/PagSeguro) + stack moderna (Next/Prisma/shadcn) + multi-tenant + manutenção ativa. O candidato mais próximo por domínio (Eduque, com PagSeguro) tem stack morta (PHP, ~2015). O mais próximo por stack+billing (NextCRM) é CRM genérico, sem domínio escolar nem multi-tenant.
- **Templates de layout admin puro** (sem domínio de negócio) existem e são maduros — ex. `Kiranism/next-shadcn-dashboard-starter` (Next 16, React 19, Tailwind 4, TanStack Table nativo, Clerk, MIT, 6.9k stars).
- Para 1-2 devs em MVP, **copiar componentes shadcn individuais via CLI** (`npx shadcn add`) é mais barato que clonar um template inteiro: o atomic design do projeto (`components/patterns/DataTable.tsx` único, `Button`, `Input`) já está maduro; faltam apenas componentes pontuais (Dialog, Popover, Select, Tooltip, Badge). Clonar um template inteiro custaria retrabalho de rebrand (tokens Alfabeto) maior que o tempo economizado.

## Decisão
1. **Não adotar nenhum ERP/sistema escolar pronto** como base do Education X. O custo real do produto está na lógica de negócio (schema multi-tenant, centavos, idempotência Asaas, LGPD) — nenhum projeto pesquisado remove esse trabalho.
2. **Não clonar um template de admin dashboard inteiro.** Continuar evoluindo `components/patterns/` própria.
3. **Copiar componentes shadcn individuais sob demanda**, via `npx shadcn add <componente>`, conforme a feature exigir (ex.: Dialog, Popover, Select, Tooltip, Badge) — nunca instalar como dependência de pacote, nunca clonar repositório de template inteiro.
4. Referência visual opcional: pode-se olhar `Kiranism/next-shadcn-dashboard-starter` para inspiração de layout (sidebar, dark mode), mas sem importar código/estrutura de pastas dele.

## Consequências
✅ Evita dívida de rebrand (tokens Alfabeto) e de desmontar estrutura de pastas de um template alheio.
✅ Mantém DataTable único (ADR-0005) como única fonte de verdade de tabela — não introduz um segundo padrão de tabela vindo de template externo.
✅ Time continua no controle total do schema e da lógica de negócio, sem dependência de manutenção de projeto terceiro morto ou genérico.
⚠️ Nenhum atalho de velocidade vindo de ERP pronto — o trabalho de schema/billing/tenant isolation permanece integralmente no roadmap, sem redução de escopo.

## Alternativas consideradas
- **Adotar ERP escolar open-source (ex. Eduque)**: descartado — stack morta (PHP 2015), incompatível com Next/Prisma/Supabase.
- **Adotar CRM genérico moderno (ex. NextCRM) como base**: descartado — sem domínio escolar nem multi-tenant; adaptar custaria mais que construir direto.
- **Clonar template de admin dashboard inteiro (ex. Kiranism)**: descartado — ganho é só de layout, não de domínio; custo de rebrand e reconciliação de estrutura de pastas supera o benefício.

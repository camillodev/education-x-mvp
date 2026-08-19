---
name: edx-adr
description: Formato de ADR de docs/decisions/ do Education X e o que conta como "irreversível" neste produto. Use ao registrar uma decisão de arquitetura fundacional (schema, tenant, pagamento, escolha estrutural de lib). Consumida por system-architect.
triggers:
  - registrar decisão de arquitetura
  - escrever adr
  - decisão irreversível
  - schema prisma
  - isolamento de tenant
---

# edx-adr — Formato de ADR do Education X

> Skill do projeto, auto-contida. Consumida por `system-architect` (ver `docs/PLANO-TIME-AGENTS.md` §3 e §6). Fonte do formato: ADRs reais em `docs/decisions/` — não é um formato genérico de mercado, é o que já está em uso neste repo.

## Formato real (extraído de `ADR-0003-asaas-cliente-tipado.md` e `ADR-0005-tanstack-datatable-unico.md`)

```markdown
# ADR-NNNN: <título curto, decisão no infinitivo ou substantivo — não pergunta>

**Status:** Accepted | Proposed | Superseded
**Data:** AAAA-MM-DD

## Contexto
<1 parágrafo curto — qual problema real força esta decisão, sem prosa introdutória>

## Decisão
<1 parágrafo — a decisão em si, direta, com os nomes de arquivo/classe/padrão exatos que ela cria>

## Consequências
✅ <ganho 1>
✅ <ganho 2>
⚠️ <trade-off ou risco aceito, nunca omitido>

## Alternativas consideradas
- <opção descartada 1>: <por que foi descartada em 1 linha>
- <opção descartada 2>: <por que foi descartada em 1 linha>
```

Regras da forma, extraídas dos dois ADRs reais lidos:
- **Numeração sequencial** `ADR-NNNN` com 4 dígitos, arquivo `docs/decisions/ADR-NNNN-slug-curto.md`. Conferir o último número existente antes de criar (hoje: até `ADR-0005`) — nunca reusar número.
- **Contexto é curto** (2-5 linhas) — não é um relatório de pesquisa, é o suficiente para alguém sem contexto entender por que a decisão foi necessária.
- **Decisão nomeia artefato real** — ex. "cliente tipado com `interface` + `AsaasLiveClient` + `AsaasMockClient`" ou "único `components/patterns/DataTable.tsx`" — não fica em abstração ("vamos usar um padrão de cliente tipado").
- **Consequências sempre têm pelo menos um ⚠️** — um ADR sem trade-off admitido é suspeito de estar vendendo a decisão em vez de documentá-la.
- **Alternativas consideradas explicam o descarte**, não só listam — "não testável, espalha a conversão de valores pelo código" é o padrão de justificativa, não "não escolhida".

## O que conta como "irreversível" neste produto

Do escopo do `system-architect` (`docs/PLANO-TIME-AGENTS.md` §3): schema Prisma, isolamento de tenant, contrato de integração de pagamento, escolha estrutural de lib. Teste de reversibilidade (do `agent-builder`): **"reverte num PR pequeno, ou o produto fica preso nisso por meses?"**

Sinais concretos de que uma decisão é irreversível neste produto (não exaustivo, mas os que já geraram ADR):
- Toca `prisma/schema.prisma` de um jeito que exige migration com dado já em produção (não é só adicionar coluna opcional).
- Muda como `unitId`/tenant é resolvido ou isolado (ADR-0002, multitenancy por aplicação) — errar aqui é vazamento de dado entre escolas.
- Muda o contrato de integração com Asaas (dinheiro real, centavos↔reais, NFS-e) — ver ADR-0003 e `.claude/rules/asaas.md`.
- Introduz uma segunda forma de fazer algo que já tem um padrão único decidido (ex.: uma segunda DataTable contrariaria ADR-0005) — mesmo sem tocar schema, duplicar um padrão já fixado é decisão que trava manutenção por meses.
- Escolha de lib estrutural (ORM, auth provider, framework de UI base) — trocar depois não é refactor, é reescrita.

O que **não** é irreversível (fica com `feature-architect`, não gera ADR): layout de uma tela, composição de componentes já existentes, blueprint de uma feature que usa o padrão já decidido.

## Passo a passo

1. Confirmar que a decisão é de fato irreversível pelo teste acima — se não for, devolver ao `feature-architect` em vez de escrever ADR.
2. Ler `docs/decisions/` inteiro antes de propor — checar se já existe ADR relacionado que este contradiz ou complementa (marcar `Superseded` no antigo se for o caso, nunca deixar dois ADRs ativos se contradizem).
3. Escrever o ADR no formato acima, com "o que fica irreversível" explícito na seção de Consequências.
4. Parar no **Gate 2** — o ADR não é aplicado até o Rafa assinar a decisão (ver `docs/PLANO-TIME-AGENTS.md` §1).

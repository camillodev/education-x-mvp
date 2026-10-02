---
name: prd-rfc
description: Use SEMPRE que for produzir um plano, decisão de arquitetura, feature nova ou decisão pessoal estruturada — código ou vault. Formato de saída obrigatório para todo plano do Rafael (substitui prosa livre de superpowers:writing-plans e do passo de planejamento do ix-dev). Decide entre RFC (como/arquitetura/decisão) e PRD (o quê/produto) ou sugere o par linkado, confirma com o usuário antes de escrever, salva no vault (profissional/pessoal, com prefixo WIP- até aprovação) e, se for plano de código de projeto específico, também em docs/specs/ do repositório.
---

# PRD/RFC — formato obrigatório de todo plano

Todo plano do Rafael — código, produto ou decisão pessoal — sai em formato **RFC** ou **PRD**, nunca em prosa livre. Esta skill substitui a etapa de output de `superpowers:writing-plans` e do passo de planejamento do `ix-dev`: o processo de brainstorming/perguntas desses fluxos continua normal, só o **documento final** muda de formato.

## Quando ativar

Sempre que for produzir a saída de um plano: fim de brainstorming, passo de planejamento do `ix-dev`, ou fechamento de uma decisão estruturada (técnica ou pessoal). Se o plano é trivial (typo, rename, fix <20 linhas) esta skill não se aplica — segue a regra de skip já existente no `ix-dev`.

## Passo 1 — decidir RFC, PRD, ou o par

Classifique a natureza da decisão:

- **RFC** — a pergunta é "como construir/decidir X" (arquitetura, escolha técnica, decisão de vida/imigração/finanças). Não tem personas nem goals de produto.
- **PRD** — a pergunta é "o que construir, para quem, com que critério de sucesso" (produto, feature nova com usuários/personas).
- **Ambos** — a decisão tem faceta técnica E de produto (ex: uma feature nova que também exige uma escolha de arquitetura). Não gere os dois automaticamente — pergunte primeiro.

**Nunca decida em silêncio.** Antes de escrever, declare a escolha e peça confirmação:

> "Isto é um **RFC** porque é uma decisão de arquitetura/técnica, sem personas de produto — confirma?"

ou, no caso ambíguo:

> "Isto parece precisar de **RFC (como) + PRD (o quê)** linkados, como fizemos no Education Hub — confirma os dois, ou só um?"

Se o Rafael discordar da classificação, use a que ele pedir.

## Passo 2 — escolher o template certo

| Situação | Template |
|---|---|
| RFC técnico/produto (Impact X, código, arquitetura) | `templates/rfc-template.md` |
| PRD de produto/feature | `templates/prd-template.md` |
| RFC de decisão pessoal (imigração, finanças pessoais, rotina, saúde não-clínica) | `templates/rfc-pessoal-template.md` |

Copie o template, preencha as seções com o conteúdo real da decisão — não deixe placeholders (`<...>`) no arquivo final. Remova subseções que genuinamente não se aplicam (ex: um RFC sem modelo de dados não precisa do `erDiagram`).

## Passo 3 — onde salvar

**Sempre no vault** (`~/Documents/Claude/second-brain/`):
- Decisão de trabalho/Impact X → `profissional/wiki/decisions/`
- Decisão pessoal → `pessoal/wiki/decisions/` (nunca `pessoal/saude-mental/` automaticamente — só se a sessão já é explicitamente clínica)
- Nome do arquivo: `WIP-rfc-<slug>.md` ou `WIP-prd-<slug>.md` — **prefixo `WIP-` obrigatório** enquanto o Rafael não aprovou. Depois de aprovado, rename removendo o prefixo (nunca copiar).
- Frontmatter com `tags:` incluindo `hub/profissional` ou `hub/pessoal` conforme o vault, seguindo as regras de cada `CLAUDE.md` de vault.
- Se for RFC+PRD par, linkar um ao outro via `[[wikilink]]` nas seções de meta/"Ver também".

**Também no repositório do projeto**, se a decisão é sobre código de um projeto específico com repo próprio (ex: Education Hub):
- Salvar cópia em `docs/specs/YYYY-MM-DD-<slug>-rfc.md` (e/ou `-prd.md`) dentro do repo — para outras IAs/devs que trabalham no código sem acesso ao vault.
- Frontmatter mínimo nessa cópia (sem `tags` do vault, sem `hub/*`, sem prefixo `WIP-` — o controle de rascunho/aprovado já é o próprio Git/PR do repo).

## Passo 4 — confirmar antes de persistir

Depois de escrever o conteúdo, mostre um resumo curto do que vai ser salvo e onde (caminho completo) antes de gravar — não é preciso pedir aprovação linha a linha, mas o Rafael deve ver o destino final antes do arquivo existir.

## Referência de estrutura (dos templates)

- **RFC**: Contexto → Proposta (com "Abordagens consideradas" em tabela + recomendação justificada) → Implementação (diagramas Mermaid quando ajudam + ordem de implementação numerada) → Riscos e Alternativas (cada um com mitigação) → Ver também.
- **PRD**: Problema → Personas (tabela) → Goals (numerados, mensuráveis) → Non-Goals (tabela com justificativa) → Módulos numerados (User Stories `[M#.#]` + Requisitos P0/P1 + Acceptance Criteria) → Requisitos Transversais → Métricas de Sucesso (Leading/Lagging) → Open Questions (tabela com dono + bloqueante?) → Timeline Sugerida.
- **RFC pessoal**: Problema → Contexto/Análise (com tabela de opções se houver comparação) → Proposta/Recomendação → Riscos/Pendências → Ver também.

Exemplo real e maduro do par RFC+PRD técnico: `profissional/wiki/decisions/rfc-education-hub-mvp.md` + `prd-education-hub-mvp.md`.

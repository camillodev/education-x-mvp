---
name: edx-spec
description: Formato de spec e critério de aceite do Education X, e como quebrar um épico do roadmap em issue Linear com AC. Use ao criar issue nova no Linear a partir de um item do roadmap, ou ao escrever/revisar uma spec de feature. Consumida por product-manager.
triggers:
  - escrever spec
  - critério de aceite
  - quebrar épico
  - issue linear
  - nova feature do roadmap
---

# edx-spec — Formato de spec e AC do Education X

> Skill do projeto, auto-contida. Consumida por `product-manager` (ver `docs/PLANO-TIME-AGENTS.md` §3 e §6).

## Não existe `specs/epicos/README.md` neste repo — a convenção real está no archive

O plano original (`docs/PLANO-TIME-AGENTS.md`) previa basear esta skill em `specs/epicos/README.md`. Esse arquivo **não existe** no repo (nem com nem sem o prefixo de ponto — `.specs/epicos/` também não existe). A convenção real de spec/AC já em uso está nos épicos arquivados em `docs/_archive/specs-nao-revisadas/*-epico-*.md` (ex.: `01-epico-boleto-nota-fiscal.md`) — esta skill destila essa forma, que é a única fonte de verdade estrutural disponível no repo hoje. Se `specs/epicos/README.md` for criado no futuro como documento formal, revisar esta skill contra ele.

## Formato de spec de épico/feature

Um épico é um arquivo markdown com esta estrutura (extraída de `docs/_archive/specs-nao-revisadas/01-epico-boleto-nota-fiscal.md`):

```markdown
# Épico NN — <nome>

> **Prioridade:** P0/P1/P2 · **Doc-mãe:** [00-visao.md](./00-visao.md) · **Status:** 🟡 Aguardando aprovação
> **Entrega:** <1 frase — o que o usuário consegue fazer quando este épico está pronto>

## Por que este épico vem <nesta ordem>
<1-2 parágrafos: dependência de outros épicos, valor de negócio, por que agora>

## Parte 1 — Experiência do usuário (Features)

### Feature N.M — <nome da feature>

> **User story**
> Como **<papel>**, quero **<ação>**, para que **<benefício>**.

<0-2 parágrafos de regra dura, se houver — algo que não é negociável e explica o "porquê" antes do "o quê">

**Critérios de aceite**
- [ ] <comportamento observável, verificável, em 1a pessoa ("Preencho...", "Vejo...", "Não consigo...")>
- [ ] <inclui caminho de erro/edge case, não só happy path>
- [ ] ...

**Jornada resumida** (opcional, quando o fluxo tem múltiplas etapas)
```
/rota
  Etapa 1: ...
  Etapa 2: ...
  → resultado final
```
```

Regras da forma:
- **User story sempre no formato "Como / quero / para que"** — nunca pula o "para quê" (é o que ancora prioridade).
- **AC é checklist de comportamento observável**, não implementação. "Vejo uma mensagem clara" é AC válido; "usa Zod para validar" não é (isso é decisão de `feature-architect`/`code-implementer`, não de spec).
- **AC cobre o caminho de erro**, não só o happy path — ver exemplo real: "Se a Asaas recusar... nada é salvo pela metade" e "Tentativa de cadastrar duas vezes → erro claro, sem duplicar".
- **Regra dura, quando existir, vem antes do AC** e explica por que aquele comportamento é inegociável (ex.: "CPF, email e telefone obrigatórios... pré-requisito para negativação SPC/Serasa").

## Quebrar épico do roadmap em issue Linear

1. Localizar a feature/entrega no `docs/product/ROADMAP.md` (produto, sem jargão técnico) e, se existir, o épico correspondente arquivado em `docs/_archive/specs-nao-revisadas/` (só como referência de forma — não é fonte de verdade ativa de escopo).
2. Confirmar no Linear (`list_issue_statuses`, `list_issues`) que o item ainda não tem issue — nunca duplicar.
3. Criar a issue em `Backlog` (nunca direto em `A Fazer` — grooming primeiro, promoção depois é ação separada do `product-manager`) com o corpo:
   - **Objetivo** — 1-2 linhas, equivalente ao "Entrega" do épico.
   - **Contexto** — por que agora, dependência de outra issue/épico.
   - **Critério de aceite** — checklist no formato acima, comportamento observável.
4. Se o item do roadmap está ambíguo (2+ caminhos possíveis, requisito incompleto), invocar `superpowers:brainstorming` antes de escrever o AC — nunca resolver ambiguidade chutando.
5. Ao promover `Backlog` → `A Fazer`, comentar a razão (driver do roadmap + dependência) — isso não é parte do AC, é o rastro de decisão que o `product-manager` deixa no Linear.

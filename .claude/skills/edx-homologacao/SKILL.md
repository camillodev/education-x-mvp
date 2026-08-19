---
name: edx-homologacao
description: Pacote de homologação do Gate 3 — o que o orquestrador entrega para o Rafa testar no preview antes do PR. 5 itens obrigatórios, formato fixo, nunca handoff vago. Consumida pelo orquestrador.
triggers:
  - homologação
  - gate 3
  - testar no preview
  - pacote de entrega
---

# edx-homologacao — Pacote do Gate 3

> Skill do projeto, auto-contida. Consumida pelo **orquestrador** (não é agente — cabe como passo, regra "quando NÃO criar agent" do `agent-builder`). Fonte: `docs/PLANO-TIME-AGENTS.md` §5.

## Quando roda

Depois que os 3 reviewers (`code-reviewer`, `security-auditor`, `silent-failure-hunter`) rodaram em paralelo e o orquestrador agregou o relatório, e o DoD-comando do Task Contract passou com `exit 0` (`superpowers:verification-before-completion`). Antes do PR (Gate 4).

## ⚠️ Granularidade — decisão em aberto, default explícito

O Rafa sinalizou preferência por testar **"no final da sprint"** (lote), não ticket a ticket. Essa mudança afetaria os 4 gates inteiros e **não foi decidida** na revisão que gerou este plano — só registrada como pendente (`docs/PLANO-TIME-AGENTS.md` §5). Esta skill **não resolve a pendência por conta própria**: mantém o default operante hoje, que é **por ticket**. Se o Rafa confirmar lote (1x por sprint), a mudança é: acumular os 5 itens abaixo por ticket do lote e apresentar um pacote consolidado ao final, em vez de um pacote por ticket — ajustar esta skill nesse momento, não antecipar.

## Os 5 itens obrigatórios (nenhum é opcional)

Handoff vago é o anti-padrão que esta skill existe para evitar — "está pronto, testa aí" não é aceitável.

1. **O que mudou** — 3-5 bullets em linguagem de produto, não de código. Não é o diff, é o que o usuário final percebe.
2. **Como testar** — passos numerados no preview (URL do Vercel MCP), com dado de exemplo concreto (não "cadastre uma escola", e sim "cadastre a escola X com CNPJ Y").
3. **O que olhar de perto** — onde o risco está concentrado, vindo diretamente do relatório agregado dos 3 reviewers (não reinventar risco — usar o que eles já sinalizaram).
4. **O que ficou fora** — o "Not-Included" do Task Contract, para não o Rafa confundir "não fiz" com "esqueci".
5. **Evidência** — saída real do DoD-comando com `exit 0` (colar a saída, não descrever que passou).

## Formato de entrega

Markdown direto na conversa com o Rafa (ou comentário na issue do Linear via `save_comment`, se o Gate 3 estiver sendo rastreado lá). Ordem fixa: 1→5, sem pular item mesmo se parecer óbvio ("o que ficou fora: nada" é uma resposta válida, omitir a seção não é).

## Se doer manter manual

Promover a agente depois — Haiku, porque é síntese mecânica sobre material que os outros agentes já produziram (relatório dos reviewers, saída do DoD-comando, Task Contract). Não promover antes de doer de verdade (regra do `agent-builder`: não decidir por intuição, medir antes).

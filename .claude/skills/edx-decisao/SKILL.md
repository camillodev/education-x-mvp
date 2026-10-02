---
name: edx-decisao
description: Monta o pacote de decisão que vai no corpo do PR (Gate 4) ou numa decisão de produto. 4 seções obrigatórias — segurança/inconsistências, performance, aderência ao ticket, casos de uso pra testar. Use ao abrir PR, ao pedir homologação, ou antes de qualquer decisão que o Rafa precisa aprovar.
---

# Pacote de decisão

O gate não é "posso?" — é **o que o Rafa precisa ter na mão pra decidir em minutos**, sem reler
o diff cru. Sem este pacote, o gate é burocracia. Com ele, é controle real.

Vale para PR (Gate 4) e para decisão de produto. Se alguma seção não se aplica, escreva
"não se aplica" e o porquê — **nunca apague a seção**, porque a ausência é informação.

## As 4 seções

### 1. Segurança e inconsistências

Consolidação dos 3 reviewers (`security-auditor`, `code-reviewer`, `silent-failure-hunter`) —
hoje eles chegam soltos, aqui chegam num lugar só, deduplicados.

- Achado, arquivo:linha, e **o que acontece na prática** se ficar como está
- Só confiança ≥80. Achado especulativo polui e treina o Rafa a ignorar a seção
- Se um reviewer falhou, dizer qual e que o relatório está incompleto — nunca omitir

### 2. Performance e boas práticas

Contra `.claude/rules/` da camada tocada (frontend, backend, infra, database).

- Violação concreta: a query, o loop, o índice ausente, o `"use client"` no lugar errado
- "Pode ficar lento" sem apontar onde **não entra**

### 3. Aderência ao que foi pedido

Puxar o AC do ticket no Linear (via `ToolSearch`, keyword `"+linear get_issue"`) e confrontar
com o diff.

- Cada AC: atendido / parcial / não atendido
- **O que foi feito além do pedido** — é aqui que escopo que cresceu sozinho aparece
- **O que a IA decidiu sem perguntar** (lib escolhida, padrão adotado, o que ficou de fora).
  Decisão de produto disfarçada de decisão técnica é o que mais custa caro depois

### 4. Casos de uso pra testar

Passo a passo do que o Rafa abre e clica. Não é "teste a feature".

- URL do preview + o caminho exato (`/escolas` → botão X → modal Y)
- O que tem que acontecer, em 1 linha por caso
- Onde olhar de perto (o que tem mais chance de estar errado)
- O que **não** foi testado automaticamente e por quê

## Formato

Markdown, no corpo do PR. Sem log cru, sem diff colado — link para o arquivo/linha resolve.
Se passar de uma tela, está longo demais: o objetivo é decidir rápido, não ler relatório.

## Anti-padrões

- ❌ Seção vazia sem explicar por quê
- ❌ "Nenhum problema encontrado" sem dizer o que foi verificado
- ❌ Colar saída bruta de reviewer em vez de consolidar
- ❌ Caso de uso genérico ("verifique se está funcionando")
- ❌ Omitir decisão tomada sozinho porque "era óbvia"

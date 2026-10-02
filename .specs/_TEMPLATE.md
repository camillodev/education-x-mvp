# Spec — <Nome do fluxo>

> **Fase:** MVP | Fase 2 | Backlog · **Ordem:** NN
> **Status:** rascunho | em revisão | fechada (quem + data)
> **Fonte de verdade:** doc oficial Asaas (endpoints) + `prisma/schema.prisma` + decisões de produto + protótipo (`prototipo/design-handoff/...`, só UX).
> **DS:** Alfabeto.

## 1. Objetivo
O que o fluxo faz e por quê (1-2 frases). DoD em linguagem do Rafa: o que significa "pronto".

## 2. Dados necessários (o coração)
Derivados de baixo pra cima. A pergunta é "quais dados precisamos para esta operação acontecer?".

### 2a. Piso Asaas
Todos os campos do(s) endpoint(s) que o fluxo dispara, da doc oficial, obrigatórios vs opcionais.

### 2b. Negócio
O que o produto precisa além do Asaas (matéria, plano, desconto, vínculo, etc.).

### 2c. Fiscal / NFS-e
Quando aplicável (inscrição municipal, código de serviço por matéria, tomador, alíquota).

### 2d. Compliance / LGPD
Quais campos são PII (cripto AES-256-GCM), consentimento, IP de aceite, mascaramento.

## 3. Tabela de confronto
| Dado necessário | Origem (Asaas/negócio/fiscal/LGPD) | Obrigatório? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolução (onde/como coletar) |
|---|---|---|---|---|---|---|

Toda lacuna tem coluna Resolução. Não basta apontar.

## 4. Deltas de schema
Bloco Prisma dos models/campos novos. Centavos (Int). Relações. `unitId`. PII com sufixo `Enc`.

## 5. Contratos Asaas
Endpoints + JSON real montado a partir da seção 2 (em reais). Conversão de borda. Sandbox-first.

## 6. Regras de negócio (EARS)
`WHEN/IF ... THEN system SHALL ...`

## 7. Estados e transições
Máquina de estados quando houver.

## 8. Fluxo de coleta (UX, referência ao design)
Curto. Cita screenshot/jsx. O design ilustra, não define.

## 9. Definition of Done (binário)
```
<comando shell> # exit 0 = pronto
```
Fluxo que toca dinheiro → inclui Playwright E2E real, não só typecheck.

## 10. Decisões fechadas

## 11. Pendências

## 12. Fatiamento em Task Contracts
Fatias ≤400 linhas. Cada uma = 1 Task Contract (Objetivo · Scope in + 🚫 not-included · DoD-comando) = 1 PR.

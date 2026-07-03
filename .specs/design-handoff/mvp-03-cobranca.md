# Design Handoff — Cobrança

> **Fase:** MVP · **Ordem:** 03 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-03-cobranca-automatica.md`](../mvp-03-cobranca-automatica.md) (fonte de verdade dos campos e regras)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## 1. Objetivo

Exibir em tempo real à dona da escola a lista de cobranças geradas automaticamente para cada aluno matriculado, com status, data de vencimento, valor, boleto PDF, linha digitável, PIX copia-e-cola e histórico de pagamento.

**Gatilho:** No dia 1 de cada mês às 08h, o sistema gera automaticamente Invoices (cobranças) para todas as matrículas ativas. Guardian (responsável financeiro do aluno) recebe boleto + PIX por WhatsApp e e-mail. Quando paga, webhook Asaas atualiza o status em tempo real na tela.

---

## 2. Telas e passos

### C0 — Dashboard (resumo)

**Onde:** Topo do app (card "Próximos vencimentos").

**O que mostrar:**
- Card destacado com até 5 cobranças próximas de vencer
- Cada linha: responsável, aluno, data vencimento (DD/MM), valor (R$ 0,00)
- Botão "Ver tudo" → leva para C3 (lista completa)

**Função:** oleo no rosto da dona — se tem cobrança saindo ou atrasada, ela vê de primeira.

---

### C3 — Lista de Cobranças

**Onde:** `/cobrancas` (tela dedicada).

**Abas:**
- **Todas** — todas as cobranças da unidade
- **A vencer** — vencimento no futuro (status PENDING)
- **Pagas** — já quitadas (status PAID)
- **Vencidas** — passou a data e não pagou (status OVERDUE)

**Tabela (colunas):**

| Coluna | Dado | Formato | Comportamento |
|--------|------|---------|---------------|
| **Responsável** | Guardian.name | "João Silva" | Ordenável A-Z |
| **Aluno** | Student.name | "Marina Silva" | Ordenável A-Z |
| **Matéria** | Subject.name | "Matemática" | Ordenável A-Z |
| **Valor** | netAmountCents/100 | R$ 1.250,00 | Direita, número puro |
| **Vencimento** | dueDate | DD/MM/AAAA | Esquerda, ordenável |
| **Status** | Badge colorido | (ver seção 3) | Clicável (filtro) |
| **Forma** | Hardcoded | "Boleto + PIX" | Informativo |

**Filtros:**
- Busca por responsável/aluno (input com debounce)
- Período (picker: mês/ano padrão = atual)
- Limpar filtros (botão discreto)

**Ações por linha:**
- Clica na linha → abre C4 (detalhe)
- Menu (⋯) com opções: "Reenviar cobrança", "Ver comprovante" (se PAID)

**Estados especiais:**
- **Vazio:** "Nenhuma cobrança neste período" (com ícone)
- **Loading:** skeleton 3x na tabela
- **Erro:** toast vermelho no topo com reload button

---

### C4 — Detalhe da Cobrança

**Onde:** `/cobrancas/[invoiceId]`.

**Cabeçalho:**
- Nome do aluno + matéria + período (ex: "Junho/2026")
- Botão voltar (⬅)

**Seções:**

#### Valor (grande, destacado)
- Valor base: "R$ 1.250,00"
- Se OVERDUE: + multa "Multa de atraso: +R$ 25,00"
- Total: "Total: R$ 1.275,00" (negrito, cor destaque)

#### Boleto + PIX

**Abas internas:** "Boleto" | "PIX"

**Boleto:**
- Imagem do boleto (asaasBankSlipUrl em PDF inline ou screenshot)
- Linha digitável: display monospace, select-all, com botão copiar ("Copiar código")
- Código de barras legível (renderizar de `asaasBarCode`)
- Botão "Baixar PDF" (link direto asaasBankSlipUrl)
- Botão "Ver no navegador" (abre link asaasPaymentUrl em nova aba)

**PIX:**
- QR Code (renderizar de `asaasPaymentUrl` ou chave Pix copia-e-cola gerada pelo Asaas)
- Abaixo: "Copia e cola" — chave PIX do comerciante em monospace
- Botão copiar ("Copiar chave PIX")
- Copy feedback: toast "Copiado!" ao lado

#### Histórico (timeline)

Mostrar eventos em ordem cronológica (mais recente no topo):

| Status | Evento | Data | Copy |
|--------|--------|------|------|
| PENDING | Cobrança gerada | emittedAt | "Aguardando pagamento" |
| PENDING | Cobrança enviada | (emittedAt + 1h) | "Responsável notificado por WhatsApp e e-mail" |
| PAID | Pago | paidAt | "Recebido em DD/MM à HH:MM" |
| OVERDUE | Vencida | (dueDate + 1d) | "Vencimento foi em DD/MM. Multa de atraso: 2% + 1% a.m. de juros" |
| CANCELLED | Cancelada | (cancelled_at, se existir) | "Cancelada pela escola" |

**Legenda:**
- Ícone ✓ verde para PAID
- Ícone ⚠ amarelo para OVERDUE
- Ícone ✕ cinza para CANCELLED
- Ícone 📤 azul para gerada/enviada

#### Ações (botões no rodapé)

- **Reenviar cobrança** (sempre)
  - Clica → toast "Reenviando..." → webhook → sucesso "Responsável notificado de novo"
  - Se PAID ou CANCELLED: botão desabilitado

- **Cancelar cobrança** (só se PENDING)
  - Clica → modal de confirmação: "Tem certeza? Não há volta."
  - Confirmado → chamada DELETE Asaas + Invoice.status = CANCELLED
  - Sucesso → toast verde "Cobrança cancelada" + volta pra C3

- **Editar desconto** (futuro, fora do MVP — grayed out com tooltip "Em breve")

---

## 3. Estados (status Invoice e como aparecem)

### Badge styling (tabela + timeline)

| Status | Badge | Cor | Copy | Quando aparece |
|--------|-------|-----|------|----------------|
| **PENDING** | "A pagar" | Azul (#0467DB) | "Vence em DD/MM" | Criada, vencimento futuro |
| **PAID** | "Pago" | Verde (#22C55E) | "Pago em DD/MM" | Webhook PAYMENT_RECEIVED processado |
| **OVERDUE** | "Vencida" | Vermelho (#EF4444) | "Vence em DD/MM (+multa)" | Webhook PAYMENT_OVERDUE ou dueDate passou |
| **CANCELLED** | "Cancelada" | Cinza (#6B7280) | "Cancelada em DD/MM" | Escola clicou "Cancelar" ou Enrollment foi cancelada |
| **BLOCKED** | "Aguardando cadastro" | Amarelo (#FBBF24) | "Responsável não cadastrado no sistema de pagamento" | Guardian.asaasCustomerId é nulo → Invoice não entra no fluxo Asaas |
| **ERROR** | "Falha na emissão" | Vermelho escuro (#991B1B) | "Erro ao gerar cobrança. Tentando novamente..." | Asaas retornou erro (sera retentado dia 2 e 3) |

**Nota especial BLOCKED e ERROR:**
- Escola recebe notificação por e-mail de cada BLOCKED (precisa cadastrar responsável)
- STATUS ERROR mostra badge provisoriamente até retry automático funcionar (não pede ação manual ainda no MVP)

---

## 4. Campos e colunas (dados brutos)

### Por Invoice (modelo de dados)

| Campo | Tipo | Origem | Exibido em | Formato |
|-------|------|--------|-----------|---------|
| **id** | string | Novo model Invoice | URL `/cobrancas/[id]` | UUID (escondido) |
| **Guardian.name** | string | Guardian encrypted | C0, C3 | "João Silva" (nome cheio) |
| **Student.name** | string | Student | C0, C3, C4 cabeçalho | "Marina Silva" |
| **Subject.name** | string | Subject | C3, C4 cabeçalho | "Matemática" |
| **amountCents** | integer | Novo | Cálculo interno | (100000 = R$1000) |
| **discountCents** | integer | Novo (Enrollment.discountCents) | Se > 0: resumo C4 | (5000 = R$50) |
| **netAmountCents** | integer | amountCents - discountCents | C0, C3, C4 | R$ 1.250,00 |
| **referenceMonth** | string | "2026-06" | C4 cabeçalho | "Junho/2026" (traduzido) |
| **dueDate** | datetime | BillingConfig.dueDay → calculado | C0, C3, timeline C4 | DD/MM/AAAA |
| **status** | enum | Invoice model | Badge | (ver seção 3) |
| **asaasBankSlipUrl** | string | Retorno POST /payments Asaas | Botão "Baixar PDF" | Link direto |
| **asaasBarCode** | string | Retorno Asaas | Renderizar linha digitável + código de barras | "34191.79001..." (monospace) |
| **asaasPaymentUrl** | string | Retorno Asaas | Botão "Ver no navegador" | Link invoiceUrl Asaas |
| **emittedAt** | datetime | Timestamp POST /payments sucesso | Timeline C4 | DD/MM HH:MM |
| **paidAt** | datetime | Webhook PAYMENT_RECEIVED | Badge PAID, timeline C4 | DD/MM HH:MM |
| **paidAmountCents** | integer | Webhook payment.value × 100 | Se > netAmountCents: "Pago (com juros): R$ X" | R$ X,XX |
| **lateFeePercent** | integer | BillingConfig.lateFeePercent / 100 | C4 OVERDUE "Multa de X%" | "2%" (texto) |
| **monthlyInterestBp** | integer | BillingConfig.monthlyInterestBp / 100 | C4 OVERDUE "+ X% a.m." | "1% a.m." (texto) |

### Relações

- **1 Invoice : N Payments** — cada Payment é um evento webhook (PAYMENT_RECEIVED, PAYMENT_OVERDUE). Timeline mostra sequência.
- **1 Invoice : 1 Guardian** — via Enrollment
- **1 Invoice : 1 Student** — via Enrollment
- **1 Invoice : 1 Subject** — via Enrollment

---

## 5. Regras que afetam a UI

### RN-01: Criação automática (cron dia 1, 08h)

Toda madrugada de 1º de mês, sistema rodará cron. Donadas escolares verão novo batch de Invoices em PENDING aparecer sem fazer nada.

**UI:** nenhuma — aparecimento silencioso na tabela C3.

### RN-02: Guardian sem asaasCustomerId

Se Guardian não tem cadastro no Asaas (`asaasCustomerId IS NULL`), Invoice fica BLOCKED. Escola é notificada por e-mail.

**UI:**
- C3: badge amarelo "Aguardando cadastro"
- C4: seção "Aviso" no topo: "❌ Responsável não está cadastrado no sistema de pagamento. [Link] Clique aqui para corrigir." (leva pra cadastro de Guardian, fora do escopo)
- Boleto e PIX: hidden com mensagem "Será disponibilizado após cadastro do responsável"

### RN-03: Idempotência do cron

Se cron roda 2x no mesmo mês, não duplica Invoice. Sistema usa `idempotencyKey = enrollmentId:referenceMonth` para garantir.

**UI:** nenhuma — dado técnico.

### RN-07: autoBilling = false

Se `BillingConfig.autoBilling = false`, escola emite cobranças manualmente.

**UI (futuro, MVP não tem):** botão "Nova cobrança" em C3 que abre formulário de emissão manual.

### RN-08: Desconto por Enrollment

Se Enrollment tem `discountCents > 0`, valor líquido é reduzido.

**UI:** em C4, logo abaixo do valor:
```
Valor base: R$ 1.300,00
Desconto:  -R$ 50,00
Total:      R$ 1.250,00
```

### RN-11: PAYMENT_OVERDUE webhook

Quando vencimento passa e pagamento não chegou, Asaas envia `PAYMENT_OVERDUE`. Invoice muda para OVERDUE.

**UI:**
- Badge: "Vencida" (vermelho)
- Valor: mostra multa + juros calculados
- Timeline: "Vencida em DD/MM. Multa 2% + 1% a.m. de juros"

### RN-13: Cancelamento de Enrollment

Se Enrollment é cancelada, todas suas Invoices PENDING devem ser canceladas no Asaas e marcadas CANCELLED.

**UI:** botão "Cancelar cobrança" em C4 fica ativo (se PENDING). Clica → confirmação → DELETE Asaas → Invoice.status = CANCELLED.

### RN-14 e RN-15: Primeira competência

Quando Enrollment começa no meio do mês, primeira cobrança pode ser proporcional (RN-14) ou isenção (RN-15, se firstChargeMode = FREE_FIRST_MONTH).

**UI:** nenhuma — cálculo automático, dona não vê essa lógica.

---

## 6. Referência visual

### Protótipos (Figma/Penpot)

**C0 — Dashboard (card vencimentos):**
- Arquivo: `screens-c.jsx?v=9`, linhas 193-258
- Layout: card azul com ícone, 5 linhas de cobranças, botão "Ver tudo"

**C3 — Lista de Cobranças:**
- Arquivo: `screens-c.jsx?v=9`, linhas 409-471
- Layout: abas (Todas/A vencer/Pagas/Vencidas), tabela com 7 colunas, filtro responsável/aluno, período
- Interação: clica linha → C4

**C4 — Detalhe da Cobrança:**
- Arquivo: `screens-c2.jsx`, linhas 19-183
- Layout: cabeçalho (aluno + matéria + período), valor grande, abas Boleto/PIX, timeline, botões ação

### Componentes shadcn/ui

- **Badge:** `<Badge>` com variant por status (default azul)
- **Table:** `<Table>` com Sort headers
- **Tabs:** `<Tabs>` para abas (Todas, A vencer, Pagas, Vencidas) e Boleto/PIX
- **Button:** `<Button>` primário azul, secundário outline, destrutivo vermelho
- **Input:** busca responsável/aluno com debounce
- **Skeleton:** loading states tabela
- **Toast:** feedback ações (copiar, cancelar, erro)
- **Dialog/Modal:** confirmação cancelamento
- **Timeline:** história de eventos (customizado ou `<Timeline>` do shadcn)

### Paleta (Alfabeto)

- **Primária:** `#0467DB` (azul, badges PENDING, botões, links)
- **Sucesso:** `#22C55E` (verde, badge PAID)
- **Alerta:** `#FBBF24` (amarelo, badge BLOCKED)
- **Erro:** `#EF4444` (vermelho, badge OVERDUE)
- **Fundo:** `#FFFFFF` (branco cards), `#F9FAFB` (cinza claro fundo tabela)
- **Texto:** `#111827` (preto text), `#6B7280` (cinza médio labels)

### Breakpoints

- **Mobile (375px):** 1 coluna, tabela scrollável horizontal, abas stack vertical
- **Tablet (768px):** 2 colunas, tabela + sidebar, abas scrolláveis horizontal
- **Desktop (1440px):** layout padrão, tabela cheia, abas lado a lado

### PII mascarada

- **Guardian.cpf:** não exibir
- **Guardian.email:** não exibir (só em ações envio)
- **Guardian.phone:** não exibir (só em ações WhatsApp)
- **Student.name:** permitido (público em contexto escolar)

---

## Pendências de Design (P-01)

**Badges BLOCKED e ERROR sem cor/copy definida no protótipo:**

Recomendação implementação:
- **BLOCKED:** badge amarelo `#FBBF24`, copy "Aguardando cadastro do responsável", ícone ⚠
- **ERROR:** badge vermelho escuro `#991B1B`, copy "Falha na emissão. Tentando novamente...", ícone ⚠ ou 🔴

Validar com design/UX antes de codificar C3 e C4.

---

**Fim do handoff.**

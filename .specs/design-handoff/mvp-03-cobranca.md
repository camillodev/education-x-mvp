# Design Handoff — Cobrança

> **Fase:** MVP · **Ordem:** 03 · **Persona:** dona/orientadora  
> **Spec-fonte:** [`mvp-03-cobranca-automatica.md`](../mvp-03-cobranca-automatica.md) — fonte de verdade dos campos e regras.  
> **Marca:** Alfabeto azul `#0467DB` · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440.  
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## Como usar este handoff (conciliação com o protótipo existente)

**Já existe um protótipo do Education X em andamento no Claude Design.** Não recrie do zero. Para este fluxo:

1. **Localize as telas deste fluxo que já existem** no protótipo.
2. **Concilie com a spec abaixo:** mantenha o que já bate, ajuste o que divergir, crie só o que faltar.
3. **Onde a spec e o protótipo conflitarem, a spec vence** — ela é a fonte de verdade técnica e de negócio.
4. **Sinalize divergências relevantes ao Rafa** — se design atual violaria uma regra de negócio, documente.

> **Esta é a tela-hub:** as seções de NFS-e (mvp-04) e negativação (mvp-05) aparecem dentro do detalhe da cobrança. Estabeleça aqui o padrão visual que esses dois reusam (ex: timeline, abas, buttons).

---

## 1. Objetivo

Gerar cobranças mensais automaticamente para cada Enrollment ativo, reconciliar o pagamento via webhook Asaas e expor o status em tempo real na tela de cobranças da escola.

**DoD (Rafa):** no dia 1 de cada mês às 08:00, toda Enrollment com status `ACTIVE` e Guardian com `asaasCustomerId` recebe uma Invoice gerada, um boleto com PIX embutido é emitido no Asaas e o Guardian recebe a cobrança por WhatsApp e e-mail. Quando o pagamento chega, o webhook Asaas atualiza o Invoice para `PAID` de forma idempotente.

---

## 2. Telas e passos

### C0 — Dashboard (resumo de vencimentos)

**Onde:** Topo/card do app (seção "Próximos vencimentos").

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

| Coluna | Dado | Formato | Behavior |
|--------|------|---------|----------|
| **Responsável** | Guardian.name | "João Silva" | Ordenável A-Z |
| **Aluno** | Student.name | "Marina Silva" | Ordenável A-Z |
| **Matéria** | Subject.name | "Matemática" | Ordenável A-Z |
| **Valor** | netAmountCents/100 | R$ 1.250,00 | Direita, número puro |
| **Vencimento** | dueDate | DD/MM/AAAA | Esquerda, ordenável |
| **Status** | Badge colorido | (ver seção 3) | Filtro clicável |
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

**Regra de cálculo:**
- `netAmountCents = amountCents - discountCents` (já calculado no banco)
- Se OVERDUE: multa é `lateFeePercent / 100` (ex: 200 bp → 2%) do netAmount
- Juros (se aplicável) — vem do webhook `paidAmountCents` vs `netAmountCents`

#### Boleto + PIX (abas internas)

**Abas:** "Boleto" | "PIX"

**Boleto:**
- Imagem do boleto (asaasBankSlipUrl em PDF inline ou screenshot)
- Linha digitável: display monospace, select-all, com botão copiar ("Copiar código")
- Código de barras legível (renderizar de `asaasBarCode`)
- Botão "Baixar PDF" (link direto asaasBankSlipUrl)
- Botão "Ver no navegador" (abre link asaasPaymentUrl em nova aba)

**PIX:**
- QR Code (renderizar de chave Pix/URL do Asaas)
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
| OVERDUE | Vencida | (dueDate + 1d) | "Vencimento foi em DD/MM. Multa 2% + 1% a.m. de juros" |
| CANCELLED | Cancelada | (cancelled_at, se existir) | "Cancelada pela escola" |

**Legenda de ícones:**
- ✓ verde para PAID
- ⚠ amarelo para OVERDUE
- ✕ cinza para CANCELLED
- 📤 azul para gerada/enviada

#### Ações (botões no rodapé)

- **Reenviar cobrança** (sempre ativa, exceto PAID/CANCELLED)
  - Clica → toast "Reenviando..." → webhook → sucesso "Responsável notificado de novo"
  - Se PAID ou CANCELLED: botão desabilitado

- **Cancelar cobrança** (só se PENDING)
  - Clica → modal de confirmação: "Tem certeza? Não há volta."
  - Confirmado → chamada DELETE Asaas + Invoice.status = CANCELLED
  - Sucesso → toast verde "Cobrança cancelada" + volta pra C3

- **Editar desconto** (futuro, fora do MVP — grayed out com tooltip "Em breve")

---

## 3. Estados e transições (InvoiceStatus)

### Badge styling (tabela + timeline)

| Status | Badge | Cor | Copy | Quando aparece |
|--------|-------|-----|------|----------------|
| **PENDING** | "A pagar" | Azul (#0467DB) | "Vence em DD/MM" | Criada, vencimento futuro |
| **PAID** | "Pago" | Verde (verde de sucesso) | "Pago em DD/MM" | Webhook PAYMENT_RECEIVED processado |
| **OVERDUE** | "Vencida" | Vermelho (vermelho crítico) | "Vence em DD/MM (+multa)" | Webhook PAYMENT_OVERDUE ou dueDate passou |
| **CANCELLED** | "Cancelada" | Cinza (#6B7280) | "Cancelada em DD/MM" | Escola clicou "Cancelar" ou Enrollment foi cancelada |
| **BLOCKED** | "Aguardando cadastro" | Amarelo (âmbar de aviso) | "Responsável não cadastrado no sistema de pagamento" | Guardian.asaasCustomerId é nulo → Invoice não entra no fluxo Asaas |
| **ERROR** | "Falha na emissão" | Vermelho escuro (vermelho escuro) | "Erro ao gerar cobrança. Tentando novamente..." | Asaas retornou erro (sera retentado dia 2 e 3) |

**Nota especial BLOCKED e ERROR:**
- Escola recebe notificação por e-mail de cada BLOCKED (precisa cadastrar responsável)
- STATUS ERROR mostra badge provisoriamente até retry automático funcionar

**Transição de estados (via spec):**
```
[criacao pelo cron] → PENDING → PAID [terminal]
                                ↓ (webhook PAYMENT_OVERDUE)
                              OVERDUE
                                ↓ (escola clica Cancelar)
                              CANCELLED [terminal]
                                
Guardian sem asaasCustomerId → BLOCKED [nao entra em fluxo Asaas]
Asaas retorna erro → ERROR [com retry dias 2 e 3]
```

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

Toda madrugada de 1º de mês, sistema rodará cron. Donas escolares verão novo batch de Invoices em PENDING aparecer sem fazer nada.

**UI:** nenhuma — aparecimento silencioso na tabela C3.

---

### RN-02: Guardian sem asaasCustomerId → BLOCKED

Se Guardian não tem cadastro no Asaas (`asaasCustomerId IS NULL`), Invoice fica BLOCKED. Escola é notificada por e-mail.

**UI:**
- C3: badge amarelo "Aguardando cadastro"
- C4: seção "Aviso" no topo: "❌ Responsável não está cadastrado no sistema de pagamento. [Link] Clique aqui para corrigir." (leva pra cadastro de Guardian, fora do escopo)
- Boleto e PIX: hidden com mensagem "Será disponibilizado após cadastro do responsável"

---

### RN-03: Idempotência do cron

Se cron roda 2x no mesmo mês, não duplica Invoice. Sistema usa `idempotencyKey = enrollmentId:referenceMonth` para garantir.

**UI:** nenhuma — dado técnico.

---

### RN-07: autoBilling = false

Se `BillingConfig.autoBilling = false`, escola emite cobranças manualmente (futuro).

**UI (futuro, MVP não tem):** botão "Nova cobrança" em C3 que abre formulário de emissão manual.

---

### RN-08: Desconto por Enrollment

Se Enrollment tem `discountCents > 0`, valor líquido é reduzido.

**UI:** em C4, logo abaixo do valor:
```
Valor base: R$ 1.300,00
Desconto:  -R$ 50,00
Total:      R$ 1.250,00
```

---

### RN-11: PAYMENT_OVERDUE webhook

Quando vencimento passa e pagamento não chegou, Asaas envia `PAYMENT_OVERDUE`. Invoice muda para OVERDUE.

**UI:**
- Badge: "Vencida" (vermelho)
- Valor: mostra multa + juros calculados
- Timeline: "Vencida em DD/MM. Multa 2% + 1% a.m. de juros"

---

### RN-13: Cancelamento de Enrollment

Se Enrollment é cancelada, todas suas Invoices PENDING devem ser canceladas no Asaas e marcadas CANCELLED.

**UI:** botão "Cancelar cobrança" em C4 fica ativo (se PENDING). Clica → confirmação → DELETE Asaas → Invoice.status = CANCELLED.

---

### RN-14 e RN-15: Primeira competência (proporcional ou isenção)

Quando Enrollment começa no meio do mês, primeira cobrança pode ser proporcional (RN-14) ou isenção (RN-15, se firstChargeMode = FREE_FIRST_MONTH).

**UI:** nenhuma — cálculo automático, dona não vê essa lógica.

---

## 6. Referência visual (protótipos existentes)

### Telas esperadas no Claude Design (já em andamento)

**C0 — Dashboard (card vencimentos):**
- Layout: card azul com ícone, até 5 linhas de cobranças, botão "Ver tudo"
- Fonte na spec: `screens-c.jsx?v=9`, linhas 193-258

**C3 — Lista de Cobranças:**
- Layout: abas (Todas/A vencer/Pagas/Vencidas), tabela com 7 colunas, filtro responsável/aluno, período
- Interação: clica linha → C4
- Fonte na spec: `screens-c.jsx?v=9`, linhas 409-471

**C4 — Detalhe da Cobrança:**
- Layout: cabeçalho (aluno + matéria + período), valor grande, abas Boleto/PIX, timeline, botões ação
- Fonte na spec: `screens-c2.jsx`, linhas 19-183

### Componentes shadcn/ui

- **Badge:** `<Badge>` com variant por status (default azul)
- **Table:** `<Table>` com Sort headers
- **Tabs:** `<Tabs>` para abas (Todas, A vencer, Pagas, Vencidas) e Boleto/PIX
- **Button:** `<Button>` primário azul (#0467DB), secundário outline, destrutivo vermelho
- **Input:** busca responsável/aluno com debounce
- **Skeleton:** loading states tabela
- **Toast:** feedback ações (copiar, cancelar, erro)
- **Dialog/Modal:** confirmação cancelamento
- **Timeline:** história de eventos (customizado ou `<Timeline>` do shadcn)

### Paleta (Alfabeto)

- **Primária:** `#0467DB` (azul, badges PENDING, botões, links)
- **Sucesso:** verde de sucesso (verde, badge PAID)
- **Alerta:** âmbar de aviso (amarelo, badge BLOCKED)
- **Erro:** vermelho crítico (vermelho, badge OVERDUE)
- **Fundo:** `#FFFFFF` (branco cards), cinza de fundo (cinza claro fundo tabela)
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

## 7. Padrões para MVP-04 (NFS-e) e MVP-05 (Negativação)

**Esta tela (C4) é o hub:** as próximas duas peças aparecem como **seções dentro do detalhe da cobrança.**

**Padrão visual a estabelecer aqui para reuso:**

- **Timeline:** componente padrão para histórico de eventos (PAID, OVERDUE, NFS-e emitida, negativação enviada, etc.)
- **Abas:** padrão "Boleto" / "PIX" → será estendido em MVP-04 com aba "NFS-e" e MVP-05 com aba "Negativação"
- **Badge de status:** mesmo sistema colorido → estender para status NFS-e (PENDING/EMITTED) e negativação (PENDING/SENT/RESOLVED)
- **Botões de ação:** mesma altura, espaçamento, feedback (toast) → padrão vale pra ações NFS-e e negativação
- **Modals de confirmação:** mesmo padrão → MVP-05 usará para confirmar envio de negativação

---

## Pendências de Design (P-01 da spec)

**Badges BLOCKED e ERROR sem cor/copy definida no protótipo anterior:**

Recomendação implementação (validada contra spec):
- **BLOCKED:** badge âmbar de aviso, copy "Aguardando cadastro do responsável", ícone ⚠
- **ERROR:** badge vermelho escuro vermelho escuro, copy "Falha na emissão. Tentando novamente...", ícone 🔴

Validar com design/UX antes de codificar C3 e C4.

---

## Checklist de Conciliação

Antes de marcar o handoff como PRONTO:

- [ ] C0 (dashboard) existe no protótipo? Se sim, confere campos (responsável, aluno, vencimento, valor, botão "Ver tudo")?
- [ ] C3 (lista) existe? Se sim, tem as 7 colunas + abas (Todas/A vencer/Pagas/Vencidas) + filtros?
- [ ] C4 (detalhe) existe? Se sim, tem valor grande, abas Boleto/PIX, timeline, botões ação?
- [ ] Cores das badges (PENDING azul, PAID verde, OVERDUE vermelho, CANCELLED cinza, BLOCKED amarelo, ERROR vermelho escuro) batem com o protótipo?
- [ ] Componentes shadcn/ui estão sendo usados conforme listado?
- [ ] PII está mascarada (CPF, email, phone não aparecem)?
- [ ] Breakpoints (375/768/1440) foram testados?
- [ ] Estados especiais (vazio, loading, erro em C3) estão definidos?
- [ ] Regras de UI (BLOCKED → aviso; OVERDUE → multa visível; desconto → linha separada em C4) estão implementadas?
- [ ] Timeline usa ícones coerentes (✓ verde, ⚠ amarelo, ✕ cinza, 📤 azul)?

---

**Fim do handoff.**

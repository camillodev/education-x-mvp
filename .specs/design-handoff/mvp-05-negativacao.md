# Design Handoff — Negativação SPC/Serasa (a cunha)

> **Fase:** MVP · **Ordem:** 05 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-05-negativacao.md`](../mvp-05-negativacao.md) — **fonte de verdade dos campos e regras** (prevalece sobre este doc em caso de conflito)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.
> **Nota:** é o diferencial único do produto — a Spontee (concorrente homologado Kumon) não faz negativação automática. Tela deve transmitir controle e transparência.

## Como usar este handoff (conciliação com o protótipo)

**Este documento concilia a spec com o protótipo já em andamento no Claude Design.**

1. **Localize as telas deste fluxo no protótipo existente** — provavelmente já têm cards, modais, alguns estados.
2. **Concilie com a spec abaixo:** mantenha o que já bate, ajuste o que divergir, crie só o que faltar.
3. **Onde spec e protótipo conflitarem, a spec vence.** Sinalize divergências de prototipagem ao Rafa.

---

## 1. Objetivo

Painel único onde a dona/orientadora gerencia o ciclo completo de negativação no SPC/Serasa — 4 abas correpondendo aos 4 status Dunning:

- **Aba 1: Em Aviso Prévio** (EMAVISO — 10 dias antes de negativar, aviso legal obrigatório enviado)
- **Aba 2: Elegível para Negativação** (ELEGIVEL — 15+ dias vencido, pronto para negativar)
- **Aba 3: Negativado** (NEGATIVADO — incluído no SPC/Serasa, pode dar baixa ou opt-out)
- **Aba 4: Regularizado** (REGULARIZADO — resolvido: pagamento, baixa manual, ou opt-out)

**Três ações principais:** negativar (POST Asaas), baixa (DELETE Asaas), opt-out (permanente por responsável).

---

## 2. Telas e fluxo do operador

### 2.1 Painel principal — `/cobrancas/negativacao`

**Layout:** 4 tabs (Elegível / Em Aviso Prévio / Negativado / Regularizado) + card list.

**Estrutura:**
- Header: "Negativação SPC/Serasa" 
- 4 tabs com contadores (ex. "Elegível (5) · Em Aviso (2) · Negativado (8) · Regularizado (12)")
- Se `BillingConfig.enablesSpc=false`, painel inteiro exibe mensagem grande: **"Negativação desabilitada — configure em Configurações > Cobrança > SPC/Serasa"** (botão "Configurar" fora do escopo deste design)
- Filtro opcional: por responsável (nome/CPF parcial), por data de vencimento

**Card de inadimplente (estrutura fixa, todos os estados):**

```
┌─────────────────────────────────┐
│ Aluno: João Silva               │  (nome completo, preto bold)
│ Responsável: Maria Silva        │  (nome completo, preto)
│ CPF: ***.***.*XX-XX            │  (MASCARADO — usar maskCpf())
│                                 │
│ Valor: R$ 450,00   Atraso: 18d │  (valor + dias, cinza)
│ Vencimento: 15/05/2026          │  (cinza pequeno)
│                                 │
│ [Badge: "Elegível"]  [Botão ação]│  (badge colorida + botão contextual)
└─────────────────────────────────┘
```

**Por estado, adiciona:**

- **ELEGIVEL:** rodapé exibe "Elegível para negativação"
- **EMAVISO:** rodapé exibe timeline "Aviso enviado em DD/MM"
- **NEGATIVADO:** rodapé exibe "Incluído no SPC em DD/MM · Taxa: R$29,90" + "Será cobrada em sua fatura mensal" (se ESCOLA) ou "Incluída no boleto" (se RESPONSAVEL)
- **REGULARIZADO:** rodapé exibe "Regularizado em DD/MM — [motivo]" (motivo: "Pagamento Recebido" / "Baixa Manual" / "Opt-out")

---

### 2.2 Estados visuais e ações por aba

#### **Aba 1: Em Aviso Prévio** (badge amarelo #F59E0B)
- **Descrição:** Asaas enviou aviso legal CDC (10 dias antes de confirmar negativação)
- **Botão:** nenhum (read-only) — link "Acompanhar" opcional (mostra timeline)
- **Timeline no card:** "Aviso legal enviado em DD/MM — Elegível para registro em DD/MM"

#### **Aba 2: Elegível para Negativação** (badge azul #0467DB)
- **Descrição:** Cobrança vencida >15 dias, pronta para negativação
- **Botão primário:** "Negativar" → abre **Modal de Confirmação** (§2.3)
- **Ação:** POST /api/dunnings → card transita para aba 3 (NEGATIVADO)

#### **Aba 3: Negativado** (badge vermelho #DC2626)
- **Descrição:** Registrado no SPC/Serasa
- **Botões:**
  - Primário: "Solicitar Baixa" → abre **Modal Baixa** (§2.4)
  - Terciário: "Opt-out" → abre **Modal Opt-out** (§2.5)
- **Ações:** 
  - DELETE /api/dunnings/{id} (baixa)
  - PATCH /api/dunnings/{id} (opt-out)
- **Custo:** exibe taxa "R$29,90" + quem paga (ESCOLA/RESPONSAVEL)

#### **Aba 4: Regularizado** (badge verde #10B981)
- **Descrição:** Resolvido (pagamento, baixa manual ou opt-out)
- **Botão:** nenhum (read-only)
- **Motivo:** exibe badge "Pagamento Recebido" / "Baixa Manual" / "Opt-out"
- **Data:** "Regularizado em DD/MM/AAAA"

---

### 2.3 Modal de confirmação — Negativar

**Acionador:** botão "Negativar" na aba 2 (ELEGIVEL)

**Conteúdo:**
```
┌─ Confirmar Negativação ──────────────────────┐
│                                              │
│ Aluno: João Silva                            │
│ Responsável: Maria Silva                     │
│ CPF: ***.***.**XX-XX                         │  (mascarado)
│ Valor da dívida: R$ 450,00                   │
│ Taxa de inclusão: R$ 29,90                   │
│ ─────────────────────────────────────────    │
│ TOTAL A NEGATIVAR: R$ 479,90                 │
│                                              │
│ ┌─ Quem paga a taxa? ─────────────────────┐ │
│ │ ☑ Escola será cobrada em sua fatura     │ │
│ │    (ou: Responsável no próximo boleto)  │ │
│ └────────────────────────────────────────┘ │
│                                              │
│ ┌─ Aviso Legal (CDC art. 43) ─────────────┐ │
│ │ O responsável receberá notificação      │ │
│ │ ANTES de ser incluído no SPC/Serasa.    │ │
│ │ A negativação será confirmada em até    │ │
│ │ 10 dias úteis.                          │ │
│ └────────────────────────────────────────┘ │
│                                              │
│ [Cancelar]  [Confirmar Negativação]→        │
└──────────────────────────────────────────────┘
```

**Campos exibidos (read-only):**
- Aluno (nome)
- Responsável (nome + CPF MASCARADO via `maskCpf()`)
- Valor da dívida (em reais)
- Taxa fixa R$29,90
- Total (valor + taxa)
- Quem paga: if `negativacaoFeePayer=ESCOLA` → "Será cobrada em sua fatura mensal" else "Será incluída no boleto do responsável"
- Cláusula CDC (obrigatória por Lei 8.078/90, art. 43) — em caixa destacada (borda azul, fundo amarelo claro)

**Botões:**
- "Cancelar" (fecha modal, volta aba 2)
- "Confirmar Negativação" (aciona POST /api/dunnings)

**Estados:**
- **Loading:** spinner no botão, inputs desabilitados, "Enviando para SPC..." em cinza
- **Erro:** mensagem vermelha "Falha ao comunicar com Asaas. Motivo: [erro técnico]. Tente novamente em 5 minutos." + botão "Tentar Novamente"
- **Sucesso:** modal fecha, card atualiza para aba 3 (NEGATIVADO), toast verde ("Negativação acionada — aviso legal enviado")

---

### 2.4 Modal de confirmação — Solicitar Baixa

**Acionador:** botão "Solicitar Baixa" na aba 3 (NEGATIVADO)

**Conteúdo:**
```
┌─ Solicitar Baixa de Negativação ─────────────┐
│                                               │
│ Aluno: João Silva                             │
│ Responsável: Maria Silva                      │
│ CPF: ***.***.**XX-XX                          │
│ Valor: R$ 450,00                              │
│                                               │
│ ⚠️  AVISO (caixa vermelha):                     │
│ ╔══════════════════════════════════════════╗ │
│ ║ Esta ação é PERMANENTE e irreversível.  ║ │
│ ║ O registro será removido do SPC/Serasa, ║ │
│ ║ mas a dívida permanece aberta.          ║ │
│ ║ Continuar?                              ║ │
│ ╚══════════════════════════════════════════╝ │
│                                               │
│ [Cancelar]  [Confirmar Baixa]→               │
└───────────────────────────────────────────────┘
```

**Campos (read-only):**
- Aluno, Responsável (nome), CPF mascarado, Valor

**Aviso legal (caixa vermelha forte):**
> "Esta ação é PERMANENTE e irreversível. O registro será removido do SPC/Serasa, mas a dívida permanece aberta."

**Botões:**
- "Cancelar" (fecha, volta aba 3)
- "Confirmar Baixa" (DELETE /api/dunnings/{id})

**Estados:**
- **Loading:** spinner, "Removendo do SPC..."
- **Erro:** mensagem vermelha + retry
- **Sucesso:** modal fecha, card vai para aba 4 (REGULARIZADO), motivo "Baixa Manual", toast verde ("Negativação cancelada no SPC/Serasa")

---

### 2.5 Modal de confirmação — Opt-out Permanente

**Acionador:** botão "Opt-out" na aba 3 (NEGATIVADO)

**Conteúdo:**
```
┌─ Excluir da Régua de Negativação ────────────┐
│                                               │
│ Responsável: Maria Silva                      │
│ CPF: ***.***.**XX-XX                          │
│                                               │
│ ⚠️  AVISO (caixa vermelha forte):              │
│ ╔══════════════════════════════════════════╗ │
│ ║ O responsável sairá PERMANENTEMENTE     ║ │
│ ║ da régua de negativação. Futuras        ║ │
│ ║ cobranças NUNCA serão incluídas no      ║ │
│ ║ SPC/Serasa, mesmo com atraso.           ║ │
│ ║ A dívida atual será baixada do bureau.  ║ │
│ ║                                         ║ │
│ ║ Esta ação NÃO pode ser desfeita.        ║ │
│ ╚══════════════════════════════════════════╝ │
│                                               │
│ [Cancelar]  [Confirmar Opt-out]→             │
└───────────────────────────────────────────────┘
```

**Campos (read-only):**
- Responsável (nome + CPF mascarado)

**Aviso legal (caixa vermelha forte — destaque máximo):**
> "O responsável sairá **PERMANENTEMENTE** da régua de negativação. Cobranças **futuras** deste responsável NUNCA serão incluídas no SPC/Serasa, mesmo com atraso. A dívida atual será baixada do bureau. Esta ação **NÃO pode ser desfeita.**"

**Botões:**
- "Cancelar" (fecha, volta aba 3)
- "Confirmar Opt-out" (PATCH /api/dunnings/{id} com `optOut=true`)

**Estados:**
- **Loading:** spinner, "Excluindo responsável..."
- **Erro:** mensagem vermelha + retry
- **Sucesso:** modal fecha, card vai para aba 4 (REGULARIZADO), motivo "Opt-out", toast verde ("Responsável marcado como opt-out permanente")

---

## 3. Estados de carregamento, erro e vazio

### **Loading (transição de estado no card)**
- **Skeleton loader:** shimmer animation no card
- **Botões desabilitados** durante POST/DELETE
- **Spinner:** ícone animado de carregamento
- **Texto:** "Enviando para SPC..." (cinza claro, pequeno) ou "Removendo do SPC..." conforme ação

### **Erro de API (Asaas falha)**
- **Card volta ao estado anterior:** ex: ELEGIVEL → POST falha → volta ELEGIVEL
- **Toast vermelho** (topo direito, 5s auto-dismiss):  
  `"Falha ao comunicar com Asaas. Motivo: [erro técnico]. Tente novamente em 5 minutos."`
- **Botão "Tentar Novamente"** destacado no card (secundário → primário)
- **Internamente:** `asaasDunningId = null`, status rollback, log de erro (para support)

### **Estado vazio (nenhuma cobrança nesta aba)**
- **Ilustração:** ícone (ex: check verde ou inbox vazio)
- **Mensagem:** "Nenhum inadimplente nesta categoria. Ótimo trabalho!" (cinza, médio)
- **Fundo:** cinza muito claro (#F5F5F5) ou branco

---

## 4. Campos por inadimplente (que exibir na UI)

| Campo | Tipo | Obrigatório | Exibição | Validação | Fonte |
|---|---|---|---|---|---|
| **Aluno (nome completo)** | string | SIM | Card — linha 1, topo, bold preto | Nunca vazio | `Invoice.student.name` |
| **Responsável (nome completo)** | string | SIM | Card — linha 2, topo, preto | Nunca vazio | `Invoice.guardian.name` |
| **CPF responsável** | string (criptografado em BD) | SIM | Mascarado `***.***.XXX-XX` | **NUNCA completo** — usar `maskCpf()` | `Guardian.cpfEnc` (descriptografar na borda, não logar) |
| **Valor devido** | number (centavos em BD) | SIM | Exibir em reais: `R$ 450,00` (2 casas) | Sempre >= R$0,01 | `Invoice.valueCents / 100` |
| **Dias de atraso** | number | SIM | `"+18 dias"` ou `"+25 dias"` | Calcular: `today - dueDate` | `(now() - Invoice.dueDate).days` |
| **Data vencimento** | date | SIM | `DD/MM/AAAA` | Sempre preenchido | `Invoice.dueDate` |
| **Data aviso CDC** | date | NÃO | "Aviso enviado em DD/MM" (aba 1/3) | Setado quando Asaas confirma | `Dunning.warningSentAt` |
| **Taxa R$29,90** | const (2990¢) | SIM | Modal confirmação + card aba 3 | Sempre 2990 centavos, hardcoded | Constante no código |
| **Quem paga taxa** | enum | SIM | "Será cobrada em sua fatura" / "Incluída no boleto" (modal + card aba 3) | Ler de config | `BillingConfig.negativacaoFeePayer` (ESCOLA/RESPONSAVEL) |
| **Status Dunning** | enum | SIM | Badge colorida (aba/cor) | 4 valores possíveis | `Dunning.status` (ELEGIVEL/EMAVISO/NEGATIVADO/REGULARIZADO) |
| **Motivo regularização** | string | NÃO | Card aba 4: badge "Pagamento Recebido" / "Baixa Manual" / "Opt-out" | Valores fixos 3 valores | `Dunning.resolvedReason` ou inferido de `Dunning.optOut` + webhook |
| **Data regularização** | date | NÃO | "Regularizado em DD/MM/AAAA" (aba 4) | Setado ao resolver | `Dunning.resolvedAt` |

---

## 5. Regras que afetam a UI (guards e transições)

### **5.1 Elegibilidade — quando card aparece na Aba 2 (ELEGIVEL)?**

Card só aparece se **TODOS** os critérios abaixo são verdadeiros:

```javascript
if (
  invoice.dueDate <= (today - 15 days) &&           // 15+ dias vencida
  invoice.asaasPaymentId exists &&                 // cobrança no Asaas
  billingConfig.enablesSpc === true &&             // negativação habilitada
  (dunning === null || dunning.status < ELEGIVEL) &&  // ou primeira vez
  dunning.optOut === false                         // responsável não saiu
) {
  // Mostrar card em Aba 2: Elegível para Negativação
}
```

**Ação:** se nenhuma cobrança atender, aba 2 exibe empty state.

### **5.2 Aviso CDC (10 dias prévios — Lei 8.078/90 art. 43)**

- Asaas dispara automaticamente aviso legal 10 dias antes de confirmar
- Sistema registra `Dunning.warningSentAt` via webhook (§11 da spec)
- **Card muda para Aba 1 (EMAVISO)** enquanto aviso ativo
- **Botão "Negativar" fica desabilitado** até elegibilidade completa
- **Timeline no card (aba 1):** "Aviso legal enviado em DD/MM · Elegível para registro em DD/MM"

### **5.3 Opt-out é permanente por responsável**

- Quando dona clica "Confirmar Opt-out":
  - Sistema seta `Dunning.optOut = true` **neste Dunning**
  - Se `status = NEGATIVADO` → DELETE /paymentDunnings automaticamente
  - Card vai para Aba 4 (REGULARIZADO), motivo "Opt-out"
- **Futuras cobranças** do mesmo responsável:
  - Na criação automática de Dunning (cron/webhook fluxo 03), sistema checa: if `Guardian.dunningOptOut === true` → **não cria Dunning** (guard)
  - Cobrança fica sem dunning, não aparece em nenhuma aba de negativação
- **Aviso na UI:** modal opt-out deixa claro: **"Esta ação é PERMANENTE e NÃO pode ser desfeita"**

### **5.4 Baixa automática no pagamento (webhook fluxo 03)**

- Quando webhook informa `Invoice.status = RECEIVED` ou `CONFIRMED`:
  - Sistema checa: if `Dunning.status = NEGATIVADO` → `DELETE /paymentDunnings/{asaasDunningId}`
  - Dunning transita automaticamente para `status = REGULARIZADO`, `resolvedAt = now()`
  - Motivo automaticamente "Pagamento Recebido"
- **Card desaparece de Aba 3** e aparece em **Aba 4** com motivo verde
- **Toast (opcional):** "Cobrança paga — negativação cancelada automaticamente"
- **Dona não precisa fazer nada** — é automático

### **5.5 CPF SEMPRE mascarado**

- **Em todos os lugares:** cards, modals, timeline, resumos
- **Helper:** `maskCpf(cpfEnc)` → `***.***.XXX-XX` (mostra só últimos 2 dígitos)
- **Criar se não existir:** `src/lib/utils/mask-cpf.ts`
- **Nunca exibir completo em UI**

### **5.6 Se `enablesSpc = false` (negativação desabilitada)**

- **Painel inteiro:**
  - Não exibe nenhuma aba (ou exibe vazias)
  - Mostra **banner grande vermelho:**  
    `"Negativação desabilitada nesta unidade — configure em Configurações > Cobrança > SPC/Serasa"`
  - Botão "Configurar" (opcional, navega para settings — fora do escopo deste design)

### **5.7 Erro Asaas reverte status**

- `POST /paymentDunnings` retorna erro:
  - `Dunning.status` volta a `ELEGIVEL`
  - `asaasDunningId = null`
  - Card retorna ao estado anterior
  - **Toast vermelho:** "Falha ao comunicar com Asaas. Motivo: [erro]. Tente novamente em 5 minutos."
  - **Botão "Tentar Novamente"** destacado no card
  - Log interno: erro técnico capturado para support

### **5.8 Auditoria**

- Toda ação (negativar, baixa, opt-out) grava automaticamente:
  - `Dunning.actorId = clerkUserId` (operador que acionou)
  - `Dunning.updatedAt = now()`
  - Log imutável salvo (para conformidade/investigação)

---

## 6. Referência visual e componentes

### **Componentes shadcn/ui a usar:**

| Componente | Uso | Customização |
|---|---|---|
| **Badge** | Status colorido (aba) | Laranja #F59E0B (EMAVISO), Azul #0467DB (ELEGIVEL), Vermelho #DC2626 (NEGATIVADO), Verde #10B981 (REGULARIZADO) |
| **Button** | Ações (Negativar, Baixa, Opt-out) | Primário azul IX, Secundário cinza, Danger vermelho |
| **Dialog/Modal** | Confirmações 3x + aviso legal | Max-width 500px (tablet) / 600px (desktop), overlay escuro 50% |
| **Card** | Container do inadimplente | Padding 16px, borda 1px cinza claro, sombra sutil |
| **Tabs** | 4 abas Dunning | Indicador ativo azul IX, contadores (ex. "Elegível (5)") |
| **Spinner** | Loading transição | Ícone circular animado, cinza médio |
| **Toast/Alert** | Feedback sucesso/erro | Topo direito, 5s auto-dismiss, verde sucesso / vermelho erro |
| **Icon** | ícones contextuais | check (✓), x (✕), clock (⏳), chevron (▼) — Alphabeto ou Lucide |

### **Paleta de cores (Alfabeto DS + sobrepostos):**

| Estado | Badge | Fundo | Texto | Borda |
|---|---|---|---|---|
| **EMAVISO** | Amarelo #F59E0B | #FEF3C7 (aviso legal) | preto | #F59E0B |
| **ELEGIVEL** | Azul #0467DB | branco | preto | #E5E7EB (cinza claro) |
| **NEGATIVADO** | Vermelho #DC2626 | branco | preto | #E5E7EB |
| **REGULARIZADO** | Verde #10B981 | branco | preto | #E5E7EB |
| **Erro** | N/A | #FEE2E2 (rosa claro) | #991B1B (vermelho escuro) | #FCA5A5 (rosa) |
| **Sucesso** | Verde | #ECFDF5 (verde claro) | #065F46 (verde escuro) | #86EFAC (verde claro) |

### **Breakpoints (responsivo):**

- **Mobile (375px):**
  - Cards full-width (1 por linha)
  - Modals full-height, close button topo direito
  - Abas em scroll horizontal
  - Botões empilhados verticalmente

- **Tablet (768px):**
  - Cards 1-2 por linha
  - Modals max-width 500px, centered
  - Abas em grid normal
  - Botões em linha (Cancelar | Confirmar)

- **Desktop (1440px):**
  - Cards 1-2 por linha
  - Modals max-width 600px, centered
  - Abas em row, contadores visíveis
  - Filtros inline com abas

### **Tipografia (Alfabeto DS):**

- **Heading modal:** 18px bold, preto
- **Card title (aluno):** 16px bold, preto
- **Card subtitle (responsável):** 14px regular, preto
- **Card metadata (CPF, valor, atraso):** 12px regular, cinza #666
- **Modal body:** 14px regular, preto
- **Aviso legal:** 13px regular, preto (em caixa destacada)
- **Button text:** 14px medium, branco em azul / preto em cinza

### **Referência de protótipo existente:**

**Arquivo:** `prototipo/design-handoff/project/app/screens-d.jsx`  
**Screenshots:** `neg.png` (painel 4 abas), `neg-modal.png` (modal confirmação), `neg-error.png` (estado erro)

**Conciliação:**
- ✓ Reusar cards + modals do protótipo onde já existem
- ✓ Ajustar cores se divergirem de Alfabeto DS
- ✓ Criar componentes novos só se faltar (DunningTabs, DunningOptOutModal)

---

## 7. Checklist de implementação

- [ ] Painel `/cobrancas/negativacao` com 4 abas por status
- [ ] Card de inadimplente com todos os campos (aluno, responsável, CPF mascarado, valor, atraso, vencimento)
- [ ] Badge colorida por status + contador de dias (se em aviso)
- [ ] Modal de confirmação negativação (com aviso CDC, taxa, quem paga)
- [ ] Modal de confirmação baixa (aviso permanente)
- [ ] Modal de opt-out permanente
- [ ] Loading states (skeleton + spinner)
- [ ] Error states (retry, mensagem técnica)
- [ ] Empty state (nenhum inadimplente)
- [ ] Desabilitação total se `enablesSpc=false`
- [ ] Toast de sucesso/erro
- [ ] Responsivo 375/768/1440
- [ ] CPF sempre via `maskCpf()` helper
- [ ] E2E Playwright cobrindo 4 estados + opt-out + baixa manual + erro Asaas

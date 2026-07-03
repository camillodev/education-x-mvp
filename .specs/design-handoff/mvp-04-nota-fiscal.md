# Design Handoff — Nota Fiscal (NFS-e) + Régua de Lembretes

> **Fase:** MVP · **Ordem:** 04 · **Persona:** dona/orientadora  
> **Spec-fonte:** [`mvp-04-nota-fiscal-regua.md`](../mvp-04-nota-fiscal-regua.md) — fonte de verdade dos campos e regras.  
> **Marca:** Alfabeto azul `#0467DB` · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440.  
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

## Como usar este handoff (conciliação com o protótipo existente)

Já existe um protótipo do Education X em andamento no Claude Design. **Não recrie do zero.** Para este fluxo:
1. **Localize as telas** deste fluxo que já existem no protótipo (procure screens-c2.jsx e screens-c3.jsx).
2. **Concilie com a spec** abaixo: mantenha o que já bate, ajuste o que divergir, crie só o que faltar.
3. **Onde a spec e o protótipo conflitarem, a spec vence.** Sinalize divergências ao Rafa.

---

## 1. Objetivo

Emitir automaticamente uma **NFS-e no Asaas** quando um pagamento muda para `RECEIVED`, associar o PDF/XML ao registro de cobrança (Invoice, fluxo 03), e exibir à dona o status + permitir download. A **régua de lembretes é nativa do Asaas** — o sistema só **exibe os eventos**, não configura a frequência.

---

## 2. Telas / Passos

### Tela 1: Configuração Fiscal (Bloco Reutilizável)

**Localização (decidido 2026-07-03):** DOIS lugares.
- **(1) Bloco fiscal no Passo 2 do onboarding** (`mvp-01`, Cobrança + Plano) — a escola já sai apta a emitir.
- **(2) Sub-seção Configurações > Fiscal** — a mesma config, editável a qualquer momento.

As duas telas leem/escrevem o mesmo `NfseConfig`. Desenhar o bloco de forma que sirva aos dois contextos (embutido no wizard e standalone em Settings).

**Campos:**

| Campo | Tipo | Validação | Observação |
|-------|------|-----------|-----------|
| **Inscrição Municipal** | `string` (read-only) | Pré-preenchida de `BillingConfig.municipalRegistration` | Editável apenas em Configurações > Cobrança (fluxo 03) |
| **Alíquota ISS** | `number` (%) | 0–10%, erro inline se fora do intervalo | Input numérico com sufixo "%" |
| **Enquadrada no Simples Nacional?** | `boolean` (toggle/checkbox) | Obrigatório | Se ✓: oculta campos de retenção abaixo; se ✗: exibe retenções opcionais |
| **Retenções opcionais** | `object` (condicional) | Visível só se Simples Nacional = false | Checkboxes: PIS, COFINS, CSLL, INSS, IR (cada um `boolean`) |

**Layout:**
- Stack vertical em mobile (1 coluna).
- Máx 2 colunas em desktop (Inscrição + Alíquota lado a lado).
- Retenções em caixa cinza (bg-neutral-50) com ícone info: *"Retenções são deduções sobre o serviço conforme a legislação."*

---

### Tela 2: Detalhe da Cobrança + Seção NFS-e

**Localização:** Detalhe de uma cobrança individual (componente expandido na listagem ou página dedicada).

**Seção NFS-e (condicional):**
- Aparece **APENAS se** `Invoice.status === "RECEIVED"` (pagamento confirmado) OU `nfseStatus !== null` (já emitida).
- **Ausência de seção:** antes do pagamento, a NFS-e não é mencionada (sem "em processamento" visível).

**Conteúdo (quando AUTHORIZED):**

```
┌─────────────────────────────────────────┐
│ Nota Fiscal                             │
│ ─────────────────────────────────────   │
│ NFS-e nº 000042                         │
│ Emitida em 02 de julho de 2026          │
│                                         │
│ [Baixar PDF] [Baixar XML]               │
│                                         │
│ Histórico:                              │
│ ✓ Nota fiscal emitida                   │
│ ⏰ Lembrete agendado · 3 dias antes      │
│ 🔔 Aviso de atraso enviado              │
└─────────────────────────────────────────┘
```

---

## 3. Estados da NFS-e

| Estado | Comportamento | Seção Visível? | Botões | Histórico |
|--------|---------------|---|---|---|
| **null** | NFS-e ainda não requisitada | ❌ Oculta | N/A | N/A |
| **SCHEDULED** | POST /invoices enviado, Asaas em processamento | ❌ Oculta (transitório, <5s) | N/A | N/A |
| **AUTHORIZED** | Webhook `INVOICE_STATUS_CHANGED` recebido, nota emitida com sucesso | ✅ Visível | "Baixar PDF" ✓ · "Baixar XML" ✓ | Exibe eventos: emissão + lembretes + atrasos |
| **ERROR** | Falha na emissão (ISS inválido, inscrição municipal incorreta, etc.) | ✅ Visível | "Baixar PDF" ✗ · "Baixar XML" ✗ (desativados) | Mostra último erro; botão "Tentar novamente" |
| **CANCELED** | Nota fiscal foi cancelada (reemissão, ajuste fiscal, etc.) | ✅ Visível | "Baixar PDF" ✗ · "Baixar XML" ✗ (desativados) | Exibe "Cancelada em DD/MM" |

---

## 4. Campos & Dados

### Na Configuração Fiscal

```typescript
NfseConfig {
  id: string
  unitId: string @unique
  
  issRatePercent: float        // 0–10, ex: 5.0 = 5%
  simplesNacional: boolean     // true = Simples Nacional (default)
  retainIss: boolean           // false = default; true se tomador retém ISS
  
  // Opcionais — fora do Simples. Null = não aplica
  pisPercent: float?
  cofinsPercent: float?
  csllPercent: float?
  inssPercent: float?
  irPercent: float?
  
  createdAt: DateTime
  updatedAt: DateTime
}
```

### No Detalhe da Cobrança

```typescript
Invoice {
  // ... campos existentes (fluxo 03)
  
  // NFS-e (novos)
  nfseId: string?              // ID Asaas, ex: "inv_000000000232"
  nfseStatus: string?          // "SCHEDULED" | "AUTHORIZED" | "ERROR" | "CANCELED" | null
  nfseNumber: string?          // Número da nota, ex: "000042"
  nfsePdfUrl: string?          // URL S3 presigned (1h)
  nfseXmlUrl: string?          // URL S3 presigned (1h)
  nfseEmittedAt: DateTime?     // Quando autorizada
  nfseErrorMessage: string?    // Se status = ERROR
}
```

### Na Régua de Lembretes (Histórico)

```typescript
ReminderEvent {
  type: "ISSUED" | "REMINDER_3D_BEFORE" | "REMINDER_ON_DUE" | "OVERDUE_WARNING"
  status: "COMPLETED" | "SCHEDULED" | "FAILED"
  dispatchedAt: DateTime
  deliveryMethod: "EMAIL" | "SMS"  // MVP: só EMAIL
  recipientEmail: string
}
```

---

## 5. Regras que Afetam a UI

### Emissão Automática (Backend, não visível ao usuário)

- NFS-e emitida **apenas após** `Invoice.status = "RECEIVED"` (webhook `PAYMENT_RECEIVED`).
- Se unidade não possui `NfseConfig` configurado:
  - ❌ Não emite.
  - 📝 Log warning no servidor (sem erro visível).
  - 💡 Idealmente: notificar dona em banner ("⚠️ Configure dados fiscais para emitir nota").
- Se já emitida (`nfseId` preenchido), não duplica (idempotência via guard `nfseId IS NULL`).

### Acesso ao Download

- Arquivos PDF/XML disponíveis **apenas se** `nfseStatus === "AUTHORIZED"`.
- URLs assinadas (S3 presigned, 1h de validade).
- Acesso validado por unidade: **Unidade A ≠ acesso Unidade B** (HTTP 403).
- Botões desativados se STATUS ≠ AUTHORIZED ou URL expirou.

### Régua de Lembretes (Asaas Nativa)

- **Automática:** Asaas configura e dispara conforme `effectiveDueDate` (vencimento da cobrança).
- **O sistema exibe, não configura:**
  - 3 dias antes: dispatch automático.
  - No vencimento (00:00): dispatch automático.
  - No atraso (dia após vencimento): dispatch automático.
- Histórico listado em **ordem reversa** (mais recente primeiro).
- Ícones visuais:
  - ✓ para COMPLETED (emitida / lembrete enviado).
  - ⏰ para SCHEDULED (agendado, ainda não disparou).
  - 🔔 para OVERDUE (aviso de atraso).

### Mascaramento de PII

- **CPF do tomador:** exibir como `123.456.789-**` (últimas 2 ocultas).
- CPF completo recuperável apenas via API `/invoices/{id}` com autenticação + validação de unidade.
- Nunca log de CPF cru em console/front-end.

### Estados de Erro

Se `nfseStatus === "ERROR"`:
- Exibe aviso visual (box laranja/vermelho — `bg-orange-50` com border `border-orange-300`).
- Texto: *"❌ Erro na emissão da nota fiscal. Tente novamente ou contate o suporte."*
- Campo opcional `nfseErrorMessage` (ex: "ISS inválido") — mostrar se disponível.
- Botão "Tentar novamente" dispara reemissão (POST `/api/invoices/{id}/retry-nfse`).

---

## 6. Referência Visual

### Componentes e Paleta

- **Marca:** Alfabeto azul `#0467DB`.
- **Framework:** shadcn/ui + Tailwind CSS.
- **Card container:** `Card` (border cinza-200, sombra leve).
- **Histórico/ícones:**
  - ✓ Check (green-500) para sucesso/completo.
  - ⏰ Clock (amber-500) para agendado.
  - 🔔 AlertCircle (orange-600) para aviso/atraso.
  - ❌ AlertTriangle (red-600) para erro.

### Layouts Responsivos

- **Mobile (375px):** 1 coluna, botões stacked verticalmente.
- **Tablet (768px):** 2 colunas, botões lado a lado (PDF | XML).
- **Desktop (1440px):** 2 colunas, margem aumentada.

### Referência de Prototipagem

- Protótipos existentes: `screens-c2.jsx` (histórico com ícones, download), `screens-c3.jsx` ("Nota fiscal emitida a cada pagamento").
- Componentes shadcn/ui a usar:
  - `Card` (container).
  - `Button` (PDF, XML, Tentar novamente).
  - `Badge` (status: AUTHORIZED/ERROR/CANCELED).
  - `AlertBox` (alertas de erro/configuração).
  - `Timeline` ou `<ul>` com ícones (histórico de lembretes).

---

## 7. Fluxo de Coleta (UX)

### Configuração Fiscal (Pré-requisito)

- A escola informa alíquota ISS e regime tributário no **Passo 2 do onboarding** (MVP-01) ou em **Configurações > Fiscal**.
- `nfseServiceCode` por matéria já é coletado no Passo 3 do onboarding (MVP-01).

### Pós-Pagamento (Detalhe da Cobrança)

1. **Pagamento confirmado** → webhook `PAYMENT_RECEIVED`.
2. **Emissão automática** → POST `/v3/invoices` (Asaas).
3. **Webhook `INVOICE_STATUS_CHANGED`** → `nfseStatus = "AUTHORIZED"` + URLs PDF/XML.
4. **UI do detalhe:** Seção "Nota Fiscal" aparece com número, data, botões PDF/XML + histórico de lembretes.

### Lembretes (Histórico Automático)

- Asaas dispara 3 eventos padrão (3 dias antes, no vencimento, no atraso).
- O sistema recebe webhooks e exibe eventos no histórico.
- Dona vê: "✓ Nota fiscal emitida · ⏰ Lembrete agendado · 3 dias antes · 🔔 Aviso de atraso enviado".

---

## 8. Decisões Fechadas (Resumo da Spec)

1. **NfseConfig como model separado** (1:1 com Unit) — fiscal da unidade, não em BillingConfig nem Subject.
2. **Emissão no evento RECEIVED** — uma NFS-e por pagamento, automática.
3. **Régua de lembretes nativa Asaas** — escola não edita; v1 usa padrão Asaas (3d/vencimento/atraso).
4. **CPF do tomador via customer Asaas** — não descriptografar no payload; Asaas preenche dados automaticamente.
5. **Campos `nfse*` inline no Invoice** — 1:1 com Invoice, sem table separada.
6. **Acesso restrito por unidade** — responsável de Unidade A não vê PDF da Unidade B.

---

## 9. Pendências (Out-of-Scope MVP-04)

- [ ] **Banner de config faltante:** quando dona não configurou NfseConfig, avisar na tela de cobrança? (MVP-05 ou antes)
- [ ] **Retry automático:** cron para reprocessar NFS-e com ERROR? (MVP-05+)
- [ ] **Envio de PDF por email:** Asaas envia automaticamente ou a aplicação? (Validar com Asaas antes de MVP-05)
- [ ] **ISS retido na fonte (`retainIss`):** adicionar ao formulário ou calcular por CNPJ? (MVP-05+)

---

## 10. Fatiamento em Task Contracts

### **Fatia 4-A — NfseConfig: Migration + Coleta Fiscal**

**Escopo:** Criar model `NfseConfig`, endpoints GET/POST, validação Zod, tela mínima (bloco reutilizável).

**DoD:**
```bash
pnpm typecheck && pnpm test:run
# + teste de integração: criar/buscar/atualizar NfseConfig
```

### **Fatia 4-B — Webhook PAYMENT_RECEIVED + Emissão NFS-e**

**Escopo:** Handler do webhook, guard de idempotência, montagem de payload, chamada Asaas, persistência `nfseId` + status SCHEDULED.

**DoD:**
```bash
pnpm typecheck && pnpm test:run
# + teste integração sandbox: webhook → Invoice.nfseId preenchido
# + idempotência: segundo webhook não duplica
# + sem NfseConfig: sem erro 500
```

### **Fatia 4-C — Webhook INVOICE_STATUS_CHANGED + UI Detalhe**

**Escopo:** Handler webhook (AUTHORIZED/ERROR/CANCELED), persistência campos `nfse*`, endpoint GET, UI seção NFS-e + botões PDF/XML + histórico lembretes, acesso restrito por unidade.

**DoD:**
```bash
pnpm typecheck && pnpm test:run && pnpm dlx playwright test nfse --reporter=line
# E2E: webhook AUTHORIZED → PDF e XML aparecem na UI
# E2E: Unidade B não acessa PDF da Unidade A (403)
```

---

## Checklist de Conciliação

Antes de marcar pronto:

- [ ] Bloco fiscal reutilizável funciona no Passo 2 do onboarding **e** em Configurações > Fiscal.
- [ ] Seção NFS-e no detalhe da cobrança aparece apenas quando `nfseStatus !== null`.
- [ ] Estados SCHEDULED e AUTHORIZED comportam-se conforme tabela §3.
- [ ] Botões PDF/XML desativados se `nfseStatus !== "AUTHORIZED"`.
- [ ] Histórico de lembretes listado em ordem reversa com ícones corretos.
- [ ] CPF mascarado em exibição.
- [ ] Acesso restrito: Unidade A 403 em PDF da Unidade B.
- [ ] Breakpoints testados: 375 / 768 / 1440.
- [ ] Marca Alfabeto azul `#0467DB` aplicada.
- [ ] Tone "falamos como você fala" mantido em todos os textos.

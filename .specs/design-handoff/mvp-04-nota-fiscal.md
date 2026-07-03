# Design Handoff — Nota Fiscal (NFS-e) + Régua de Lembretes

> **Fase:** MVP · **Ordem:** 04 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-04-nota-fiscal-regua.md`](../mvp-04-nota-fiscal-regua.md) (fonte de verdade dos campos e regras)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## 1. Objetivo

Exibir à dona o status da emissão de Nota Fiscal Eletrônica (NFS-e) após pagamento de uma cobrança, permitir download dos arquivos (PDF e XML), e comunicar o histórico de lembretes automáticos disparados (3 dias antes, no vencimento, no atraso).

A régua de lembretes é nativa do Asaas — o sistema **não configura** a frequência, apenas **exibe os eventos** no histórico.

---

## 2. Telas / Passos

### Tela 1: Configuração Fiscal

**Localização (decidido, Rafa 2026-07-03): DOIS lugares.** (1) Bloco fiscal no **Passo 2 do onboarding** (`mvp-01`, Cobrança + Plano) — a escola já sai apta a emitir. (2) Sub-seção **Configurações > Fiscal** — a mesma config, editável a qualquer momento. As duas telas leem/escrevem o mesmo `NfseConfig`. Desenhar o bloco de forma que sirva aos dois contextos (embutido no wizard e standalone em Settings).

**Campos:**
- **Inscrição Municipal** (read-only, pré-preenchida de `BillingConfig.municipalInscription`)
- **Alíquota ISS** (%)
  - Input numérico com sufixo "%"
  - Range: 0–10%
  - Validação: rejeita valores fora do intervalo, mostra erro inline
- **Enquadrada no Simples Nacional?**
  - Toggle/checkbox
  - Se ativado: oculta os campos de retenção abaixo
  - Se desativado: exibe campos opcionais de retenção
- **Retenções opcionais** (visibilidade condicional; só se Simples Nacional = false)
  - Checkboxes: PIS, COFINS, CSLL, INSS, IR
  - Espaço em cinza claro (bg-neutral-50) pra agrupar visualmente
  - Ajuda (ícone info): "Retenções são deduções sobre o serviço conforme a legislação."

**Layout:** Stack vertical, 1 coluna em mobile, máx 2 colunas em desktop (Inscrição + Alíquota lado a lado).

---

### Tela 2: Detalhe da Cobrança + Seção NFS-e

**Localização:** Detalhe de uma cobrança individual (componente expandido na listagem ou página dedicada)

**Seção NFS-e (condicional):**
- Aparece **APENAS se** `Invoice.status === "RECEIVED"` (pagamento confirmado) OU `nfseStatus !== null` (já emitida)
- **Ausência de seção:** antes do pagamento, a NFS-e não é mencionada (sem "em processamento" visível)

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
| **null** (antes do pagamento) | NFS-e ainda não requisitada | ❌ Oculta | N/A | N/A |
| **SCHEDULED** (processando) | POST /invoices enviado, Asaas em processamento | ❌ Oculta (estado transitório, <5s) | N/A | N/A |
| **AUTHORIZED** | Webhook `INVOICE_STATUS_CHANGED` recebido, nota emitida com sucesso | ✅ Visível | "Baixar PDF" ✓ · "Baixar XML" ✓ | Exibe eventos agendados/disparados |
| **ERROR** | Falha na emissão (ISS inválido, inscr. municipal incorreta, etc.) | ✅ Visível | "Baixar PDF" ✗ · "Baixar XML" ✗ | Mostra último erro |
| **CANCELED** | Nota fiscal foi cancelada (reemissão, ajuste fiscal, etc.) | ✅ Visível | "Baixar PDF" ✗ · "Baixar XML" ✗ | Exibe "Cancelada em DD/MM" |

---

## 4. Campos & Dados

### Na Configuração Fiscal

```typescript
NfseConfig {
  municipalInscription: string // read-only, de BillingConfig
  issRate: number               // 0–10, em %
  simplifiedTaxRegime: boolean  // true = Simples Nacional
  retentions: {
    pis: boolean
    cofins: boolean
    csll: boolean
    inss: boolean
    ir: boolean
  }
}
```

### No Detalhe da Cobrança

```typescript
Invoice {
  // ... campos existentes
  nfseNumber: string            // ex: "000042"
  nfseStatus: "SCHEDULED" | "AUTHORIZED" | "ERROR" | "CANCELED" | null
  nfsePdfUrl: string            // URL assinada S3 (validade 1h)
  nfseXmlUrl: string            // URL assinada S3 (validade 1h)
  nfseEmittedAt: ISO8601        // data/hora da emissão
  nfseErrorMessage?: string     // se STATUS = ERROR
  
  // Tomador (quem recebe o serviço — Guardian mascarado)
  taker: {
    name: string
    cpf: string               // MASCARADO em exibição (ex: "123.456.789-**")
    email: string
  }
  
  // Serviço
  serviceDescription: string    // gerado: "Mensalidade - {Matéria} - {Aluno} - {mês/ano}"
  amount: number                // em reais, 2 casas decimais
  issueDate: ISO8601
}
```

### Na Régua de Lembretes (Histórico)

```typescript
ReminderEvent {
  type: "ISSUED" | "REMINDER_3D_BEFORE" | "REMINDER_ON_DUE" | "OVERDUE_WARNING"
  status: "COMPLETED" | "SCHEDULED" | "FAILED"
  dispatchedAt: ISO8601
  deliveryMethod: "EMAIL" | "SMS" (só EMAIL no MVP)
  recipientEmail: string
}
```

---

## 5. Regras que Afetam a UI

### Emissão Automática

- NFS-e é emitida **apenas após** `Invoice.status = "RECEIVED"` (pagamento confirmado)
- Se unidade não possui `NfseConfig` configurado:
  - Não emite
  - **Log warning** no servidor (sem erro visível ao usuário)
  - Idealmente: notificar dona em banner na tela de cobrança ("⚠️ Configure dados fiscais para emitir nota")
- Se já emitida (`nfseId` preenchido), não duplica

### Acesso ao Download

- Arquivos PDF/XML disponíveis **apenas se** `nfseStatus === "AUTHORIZED"`
- URLs são assinadas (S3 presigned, 1h de validade)
- Acesso validado por unidade: **Unidade A não vê nota da Unidade B** (403 Forbidden)
- Botões desativados se STATUS ≠ AUTHORIZED ou se URL expirou

### Régua de Lembretes (Asaas)

- **Automática:** Asaas configura e dispara conforme duData (vencimento)
- **O sistema exibe, não configura:**
  - 3 dias antes: dispatch automático
  - No vencimento (00:00): dispatch automático
  - No atraso (dia após vencimento): dispatch automático
- Histórico listado em ordem reversa (mais recente primeiro)
- Ícones visuais: 
  - ✓ para COMPLETED (emitida, lembrete enviado)
  - ⏰ para SCHEDULED (agendado, ainda não disparou)
  - 🔔 para OVERDUE (aviso de atraso)

### Mascaramento de PII

- **CPF do tomador:** exibir como `123.456.789-**` (últimas 2 ocultas)
- CPF completo recuperável apenas via API `/invoices/{id}` com autenticação + validação de unidade
- Nunca log de CPF cru em console/front-end

### Estados de Erro

Se `nfseStatus === "ERROR"`:
- Exibe aviso visual (box laranja/vermelho)
- Texto: "❌ Erro na emissão da nota fiscal. Tente novamente ou contate o suporte."
- Campo opcional `nfseErrorMessage` (ex: "ISS inválido") — mostrar se disponível
- Botão "Tentar novamente" dispara reemissão (POST /invoices/{id}/retry-nfse)

---

## 6. Referência Visual

### Componentes e Paleta

- **Marca:** Alfabeto azul `#0467DB`
- **Framework:** shadcn/ui + Tailwind CSS
- **Fonte de sucesso/histórico:** ícone `Check` (✓, green-500)
- **Fonte de agendado:** ícone `Clock` (⏰, amber-500)
- **Fonte de aviso:** ícone `AlertCircle` (🔔, orange-600)
- **Fonte de erro:** ícone `AlertTriangle` (❌, red-600)

### Layouts Responsivos

- **Mobile (375px):** 1 coluna, botões stacked verticalmente
- **Tablet (768px):** 2 colunas, botões lado a lado (PDF | XML)
- **Desktop (1440px):** 2 colunas, margem aumentada

### Referência de Prototipagem

- Protótipos existentes: `screens-c2.jsx` (histórico com ícones), `screens-c3.jsx` ("Nota fiscal emitida a cada pagamento")
- Componentes shadcn/ui a usar:
  - `Card` (container da seção NFS-e)
  - `Button` (Baixar PDF, Baixar XML, Tentar novamente)
  - `Badge` (status AUTHORIZED/ERROR/CANCELED)
  - `AlertBox` (alertas de erro/configuração)
  - `Timeline` ou lista com ícones (histórico de lembretes)

---

## 7. Decisões de Design Pendentes

| Questão | Opções | Impacto |
|---------|--------|--------|
| ~~Onde fica a tela de config fiscal?~~ | **✅ RESOLVIDO: C) Ambas** — bloco no Passo 2 do onboarding + Configurações > Fiscal (mesmo `NfseConfig`) | Desenhar o bloco reutilizável nos dois contextos |
| **Banner de config faltante** | Inline na tela de cobrança? Ou só em Settings? | Descoberta e UX da dona |
| **Retry manual** | Botão visível em ERROR? Ou reemissão automática? | Controle vs automação |

---

**Próximo passo:** Implementação do componente NfseSection + integração com Invoice detail. Validação com Asaas Webhook antes de design review.

# Spec — Nota Fiscal NFS-e + Regua de Lembretes

> **⚠️ SUPERSEDED (2026-07-09):** régua/negativação agora em [mvp-045-regua-negativacao.md]. NFS-e (mvp-04) reclassificada P1 pós-core. Mantido como referência de contratos Asaas.

> **Status:** rascunho (Claude, 2026-06-19)
> **Fonte de verdade:** docs Asaas (`/reference/schedule-invoice.md`, `/docs/emitindo-notas-fiscais-de-servico.md`) + `prisma/schema.prisma` + protótipo (`prototipo/design-handoff/project/app/screens-c2.jsx`, `screens-c3.jsx`). Design = referencia UX, nao define campos.
> **DS:** Alfabeto.

---

## 1. Objetivo

Emitir automaticamente uma NFS-e no Asaas quando um pagamento muda para `RECEIVED`, associar o PDF/XML ao registro de cobrança (Invoice, fluxo 03), e rodar a régua nativa de lembretes do Asaas (3 dias antes, no vencimento, apos o vencimento).

**DoD:** uma cobrança paga gera NFS-e com PDF/XML disponivel no detalhe da cobrança; cobrança em aberto dispara lembretes automaticamente; tudo verificado via Playwright E2E em sandbox Asaas.

---

## 2. Dados necessários (o coração)

A pergunta central: quais dados são necessários para `POST /v3/invoices` emitir a NFS-e corretamente?

### 2a. Piso Asaas — POST /v3/invoices

Campos do endpoint (fonte: docs Asaas `schedule-invoice.md` + `emitindo-notas-fiscais-de-servico.md`):

| Campo | Tipo | Obrigatorio? | Descricao |
|---|---|---|---|
| `payment` | string | Sim* | ID da cobrança Asaas (`asaasPaymentId`) |
| `installment` | string | Sim* | ID da parcela (alternativa a `payment`) |
| `customer` | string | Sim* | ID do cliente (nota avulsa sem cobrança) |
| `serviceDescription` | string | Sim | Descricao dos servicos prestados |
| `value` | number | Sim | Valor total em reais |
| `deductions` | number | Nao | Deducoes (reduz base de calculo do ISS) |
| `effectiveDate` | date | Sim | Data de emissao da NFS-e (YYYY-MM-DD) |
| `municipalServiceId` | string | Nao** | ID do servico municipal (via listagem Asaas) |
| `municipalServiceCode` | string | Nao** | Codigo do servico municipal (manual) |
| `municipalServiceName` | string | Sim | Nome do servico municipal |
| `observations` | string | Nao | Observacoes adicionais |
| `externalReference` | string | Nao | Identificador no sistema interno |
| `updatePayment` | boolean | Nao | Se a cobrança deve ser atualizada com impostos deduzidos |
| `taxes` | object | Sim | Objeto com aliquotas e retencoes |
| `taxes.iss` | number | Sim*** | Aliquota ISS (%) |
| `taxes.retainIss` | boolean | Nao | Se ISS e retido na fonte |
| `taxes.pis` | number | Nao | Aliquota PIS (%) |
| `taxes.cofins` | number | Nao | Aliquota COFINS (%) |
| `taxes.csll` | number | Nao | Aliquota CSLL (%) |
| `taxes.inss` | number | Nao | Aliquota INSS (%) |
| `taxes.ir` | number | Nao | Aliquota IR (%) |
| `taxes.pisCofinsRetentionType` | string | Cond.*** | Obrigatorio fora do Simples Nacional + Portal Nacional |
| `taxes.pisCofinsTaxStatus` | string | Cond.*** | Obrigatorio fora do Simples Nacional + Portal Nacional |

`*` ao menos um dos tres e obrigatorio.
`**` ao menos um dos dois e obrigatorio.
`***` escolas em Simples Nacional: `iss` e suficiente, demais opcionais.

**Resposta relevante (campos a armazenar):**

| Campo | Descricao |
|---|---|
| `id` | ID da NFS-e no Asaas (ex: `inv_000000000232`) |
| `status` | SCHEDULED / AUTHORIZED / ERROR |
| `number` | Numero da nota |
| `rpsSerie` / `rpsNumber` | Serie e numero do RPS |
| `pdfUrl` | URL do PDF |
| `xmlUrl` | URL do XML |
| `effectiveDate` | Data de emissao |

### 2b. Negocio

- A NFS-e e emitida apenas quando o pagamento e recebido (`status = RECEIVED`).
- A emissao e por cobrança (Invoice, fluxo 03) - uma NFS-e por pagamento.
- A `serviceDescription` e composta por: `"Mensalidade - {Subject.name} - {Student.name} - {referenceMonth}"`.
- O `value` vem do `Invoice.amountCents` / 100 (conversao de borda).
- `effectiveDate` = data do evento `RECEIVED` (hoje no webhook).
- `externalReference` = `Invoice.id` (rastreabilidade interna).
- Apos emissao, os campos `nfseId`, `nfseStatus`, `nfsePdfUrl`, `nfseXmlUrl`, `nfseNumber` sao gravados no `Invoice`.

### 2c. Fiscal / NFS-e

Quatro dados fiscais controlam a emissao:

| Dado | Onde mora | Ja existe? |
|---|---|---|
| Inscricao municipal da escola | `BillingConfig.municipalRegistration` | Sim |
| Codigo do servico por materia | `Subject.nfseServiceCode` | Sim |
| Nome do servico municipal | derivado de `Subject.name` | Sim (composto em runtime) |
| Aliquota ISS | `NfseConfig.issRatePercent` | **Nao** — ver decisao §10.1 |
| Regime tributario (Simples?) | `NfseConfig.simplesNacional` | **Nao** — ver decisao §10.1 |

**Decisao sobre NfseConfig:** os campos de ISS e regime tributario nao pertencem a `BillingConfig` (que e operacional: vencimento, taxas de multa) nem a `Subject` (que e por materia). Sao configuracao fiscal da unidade inteira. Cria-se `NfseConfig` como model separado (1:1 com `Unit`), justificativa: coesao alta, extensibilidade futura (retencoes PIS/COFINS, CNAE, etc), sem poluir `BillingConfig`.

### 2d. Compliance / LGPD

| Campo | Classificacao | Tratamento |
|---|---|---|
| `Guardian.cpfEnc` | PII sensivel | AES-256-GCM — descriptografar apenas na borda de emissao, nunca logar |
| `Guardian.name` | PII basico | Plaintext OK no modelo, nao logar |
| `Guardian.emailEnc` | PII sensivel | Nao usado no payload NFS-e, mas necessario para envio do PDF |
| URLs PDF/XML da NFS-e | Dados fiscais | Armazenar em `Invoice`, acesso restrito ao responsavel + escola |

O CPF do tomador (Guardian) vai no payload Asaas. O Asaas o trata como dado fiscal. No lado da aplicacao, a descriptografia ocorre em runtime no service layer, sem persistencia em cache ou log.

---

## 3. Tabela de confronto

| Dado necessario | Origem | Obrigatorio? | Prisma (existe?) | Campo Asaas | No design? | Resolucao |
|---|---|---|---|---|---|---|
| ID cobrança Asaas | Invoice.asaasPaymentId (fluxo 03) | Sim | Fluxo 03 cria | `payment` | Nao (interno) | Invoice.asaasPaymentId preenchido pelo fluxo 03 antes deste fluxo rodar |
| Valor da cobrança | Invoice.amountCents | Sim | Sim (fluxo 03) | `value` | Sim (valor da cobrança) | Dividir por 100 na borda |
| Descricao do servico | Subject.name + Student.name + mes | Sim | Compostos existem | `serviceDescription` | Nao (gerado) | Montar em runtime: `"Mensalidade - {materia} - {aluno} - {mm/aaaa}"` |
| Data de emissao | data do evento RECEIVED | Sim | Nao persiste antes | `effectiveDate` | Nao | Usar `new Date()` no momento do webhook |
| Codigo do servico municipal | Subject.nfseServiceCode | Sim** | Sim | `municipalServiceCode` | Nao (interno) | Ja existe |
| Nome do servico municipal | Subject.name | Sim | Sim | `municipalServiceName` | Nao | Usar Subject.name |
| Aliquota ISS | NfseConfig.issRatePercent | Sim | **Nao** — migration necessaria | `taxes.iss` | Nao | Criar NfseConfig (ver §4) |
| Regime Simples Nacional | NfseConfig.simplesNacional | Cond. | **Nao** — migration necessaria | (condicional) | Nao | Criar NfseConfig (ver §4) |
| Inscricao municipal | BillingConfig.municipalRegistration | Config. Asaas | Sim | (pre-config Asaas) | Nao | Ja existe; usada na configuracao do portal, nao no payload |
| CPF do tomador | Guardian.cpfEnc (decrypt) | Nao*** | Sim (criptografado) | via customer Asaas | Nao | Descriptografar em runtime; Guardian ja tem `asaasCustomerId` — Asaas usa dados do customer cadastrado |
| ID externo | Invoice.id | Nao | Sim (fluxo 03) | `externalReference` | Nao | Usar Invoice.id |
| ID NFS-e Asaas (resposta) | Invoice.nfseId | N/A | **Nao** — migration necessaria | resposta `id` | NFS-e no detalhe | Adicionar ao Invoice (ver §4) |
| Status NFS-e | Invoice.nfseStatus | N/A | **Nao** | resposta `status` | Nao | Adicionar ao Invoice |
| URL PDF | Invoice.nfsePdfUrl | N/A | **Nao** | resposta `pdfUrl` | "Baixar PDF" (screens-c2.jsx) | Adicionar ao Invoice |
| URL XML | Invoice.nfseXmlUrl | N/A | **Nao** | resposta `xmlUrl` | "Baixar XML" (screens-c2.jsx) | Adicionar ao Invoice |
| Numero da nota | Invoice.nfseNumber | N/A | **Nao** | resposta `number` | "NFS-e no 000X" (screens-c2.jsx) | Adicionar ao Invoice |

`***` O Asaas usa o `customer` ja cadastrado (que tem CPF vinculado). O payload nao precisa repetir o CPF — o `payment` ja o referencia via `asaasCustomerId` do Guardian.

---

## 4. Deltas de schema

### 4a. NfseConfig (model novo — fiscal da unidade)

Justificativa: `BillingConfig` e operacional (cobrança); `NfseConfig` e fiscal (emissao de nota). Separacao de responsabilidades. Relacionamento 1:1 com `Unit`. Criado junto com a `Unit` ou preenchido antes da primeira emissao de NFS-e.

```prisma
model NfseConfig {
  id     String @id @default(cuid())
  unitId String @unique

  issRatePercent  Float   // aliquota ISS municipal (ex: 5.0 = 5%)
  simplesNacional Boolean @default(true)
  retainIss       Boolean @default(false) // se tomador retém ISS na fonte

  // Opcional — retencoes adicionais (fora do Simples). Null = nao aplica
  pisPercent   Float?
  cofinsPercent Float?
  csllPercent  Float?
  inssPercent  Float?
  irPercent    Float?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@map("nfse_configs")
}
```

Adicionar ao model `Unit`:
```prisma
nfseConfig NfseConfig?
```

### 4b. Campos novos no model Invoice (fluxo 03)

O fluxo 03 define `Invoice`. Este fluxo adiciona os seguintes campos via migration separada (nao duplicar o model aqui, apenas os deltas):

```prisma
// Adicionar ao model Invoice (definido no fluxo 03):
nfseId      String?  // ID Asaas: "inv_000000000232"
nfseStatus  String?  // SCHEDULED | AUTHORIZED | ERROR | CANCELED
nfseNumber  String?  // numero da nota emitida
nfsePdfUrl  String?  // URL publica do PDF
nfseXmlUrl  String?  // URL publica do XML
nfseEmittedAt DateTime? // quando a NFS-e foi autorizada
```

### 4c. Relacao com fluxo 03

Este fluxo depende do `Invoice` definido no fluxo 03. Os campos `asaasPaymentId` e `amountCents` devem existir antes de qualquer emissao. A migration deste fluxo (04) adiciona os campos `nfse*` ao Invoice existente.

---

## 5. Contratos Asaas

### 5a. POST /v3/invoices — emitir NFS-e

Montado a partir da secao 2. Valores em reais (conversao de borda: `amountCents / 100`).

```json
POST https://api.asaas.com/v3/invoices
Authorization: ${"asaasApiKey"}

{
  "payment": "pay_abc123",
  "serviceDescription": "Mensalidade - Matematica - Joao Silva - 06/2026",
  "value": 380.00,
  "effectiveDate": "2026-06-15",
  "municipalServiceCode": "8.02",
  "municipalServiceName": "Matematica",
  "externalReference": "invoice_clxyz1234",
  "taxes": {
    "iss": 5.0,
    "retainIss": false
  }
}
```

Resposta esperada (campos relevantes a armazenar):
```json
{
  "id": "inv_000000000232",
  "status": "SCHEDULED",
  "number": null,
  "pdfUrl": null,
  "xmlUrl": null
}
```

Apos webhook `invoiceStatus` = `AUTHORIZED`:
```json
{
  "id": "inv_000000000232",
  "status": "AUTHORIZED",
  "number": "232",
  "pdfUrl": "https://...",
  "xmlUrl": "https://..."
}
```

### 5b. Webhook de cobrança — gatilho da emissao

```
Event: PAYMENT_RECEIVED
Payload: { "payment": { "id": "pay_abc123", "status": "RECEIVED", ... } }
```

O handler busca o `Invoice` pelo `asaasPaymentId`, verifica que ainda nao tem `nfseId`, dispara a emissao.

### 5c. Webhook de NFS-e — atualizacao do status

```
Event: INVOICE_STATUS_CHANGED
Payload: { "invoice": { "id": "inv_000000000232", "status": "AUTHORIZED", "pdfUrl": "...", "xmlUrl": "...", "number": "232" } }
```

Handler atualiza o `Invoice` correspondente via `nfseId`.

### 5d. Regua de lembretes (nativa Asaas)

A régua de lembretes e **nativa do Asaas** e configurada a nivel de subconta. Nao e configuravel por escola no painel Education X (decisao §10.3).

Comportamento padrao Asaas:
- 3 dias antes do vencimento: notificacao enviada ao pagador
- No dia do vencimento: notificacao
- Apos o vencimento: notificacao de atraso

O design (screens-c2.jsx linha 48) confirma: `"Lembrete agendado" · 3 dias antes`. O sistema apenas exibe o historico — nao gerencia.

### 5e. Sandbox-first

Todas as chamadas em desenvolvimento apontam para `https://sandbox.asaas.com/api/v3`. A variavel de ambiente `ASAAS_ENV=sandbox|production` chaveia o base URL no cliente Asaas existente.

---

## 6. Regras de negocio (EARS)

```
WHEN Invoice.asaasPaymentId recebe webhook PAYMENT_RECEIVED
AND Invoice.nfseId IS NULL
AND Unit.nfseConfig IS NOT NULL
THEN system SHALL chamar POST /v3/invoices com payload montado da secao 5a
AND gravar Invoice.nfseId = response.id e Invoice.nfseStatus = "SCHEDULED"

WHEN Asaas envia webhook INVOICE_STATUS_CHANGED com status = "AUTHORIZED"
THEN system SHALL atualizar Invoice.nfseStatus, Invoice.nfseNumber, Invoice.nfsePdfUrl, Invoice.nfseXmlUrl, Invoice.nfseEmittedAt

WHEN Asaas envia webhook INVOICE_STATUS_CHANGED com status = "ERROR"
THEN system SHALL atualizar Invoice.nfseStatus = "ERROR"
AND logar o erro para retentativa manual

IF Unit.nfseConfig IS NULL
THEN system SHALL omitir a emissao de NFS-e sem falhar o pagamento
AND logar warning: "Unidade sem NfseConfig — NFS-e nao emitida"

WHEN Invoice.nfseStatus = "AUTHORIZED"
THEN system SHALL exibir na tela de detalhe da cobrança: numero da nota, botao PDF, botao XML

WHEN Invoice.nfsePdfUrl OR Invoice.nfseXmlUrl e acessado pelo responsavel
THEN system SHALL verificar que o responsavel pertence a mesma unidade que o Invoice
```

---

## 7. Estados e transicoes

```
Cobrança criada (Invoice)
    |
    v
PENDING (aguardando pagamento)
    |
    | webhook PAYMENT_RECEIVED
    v
RECEIVED
    |
    | emissao automatica POST /v3/invoices
    v
NfseStatus: SCHEDULED
    |
    | webhook INVOICE_STATUS_CHANGED
    |---> AUTHORIZED  (PDF + XML disponiveis)
    |---> ERROR       (retentativa manual; Invoice.nfseStatus = ERROR)
    |---> CANCELED    (nota cancelada pelo municipio)
```

Transicoes de lembrete (Asaas nativo — sistema so lê, nao escreve):
```
Invoice criado com effectiveDueDate
    |
    | -3 dias
    v
[LEMBRETE PRE-VENC — Asaas envia ao Guardian]
    |
    | no vencimento
    v
[LEMBRETE VENCIMENTO — Asaas envia]
    |
    | apos vencimento (D+1)
    v
[AVISO ATRASO — Asaas envia]
```

---

## 8. Fluxo de coleta (UX, referencia ao design)

A emissao e 100% automatica — sem interacao do usuario no momento da emissao.

**Configuracao fiscal (pré-requisito, feita no onboarding ou settings):**
- A escola informa a aliquota ISS e se e Simples Nacional na tela de configuracoes fiscais (tela ainda nao especificada — lacuna de UX, ver §11.1).
- O `nfseServiceCode` por materia ja e coletado no Passo 3 do onboarding (spec 01).

**Pos-pagamento (detalhe da cobrança — screens-c2.jsx):**
- Secao "Nota fiscal" aparece apenas quando `nfseStatus = AUTHORIZED`.
- Exibe: `"NFS-e no {nfseNumber} · emitida em {nfseEmittedAt}"`.
- Dois botoes: "Baixar PDF" e "Baixar XML" (linhas 95-96 do screens-c2.jsx).
- Historico da cobrança (screens-c2.jsx linha 36): item `"Nota fiscal emitida"` com icone `receipt` e estado `done`.

**Lembretes (historico da cobrança — screens-c2.jsx):**
- Linha 48: `"Lembrete agendado" · 3 dias antes` com icone `bell` e estado `scheduled`.
- Linha 39: `"Aviso de atraso enviado"` com icone `bell-ring` e estado `warn`.
- O sistema exibe os eventos que o Asaas notifica via webhook — nao cria os lembretes.

---

## 9. Definition of Done (binario)

```bash
pnpm typecheck && pnpm test:run && pnpm dlx playwright test nfse --reporter=line
```

O teste E2E Playwright deve provar (sandbox Asaas):

1. **Happy path:** cobrança paga via webhook simulado `PAYMENT_RECEIVED` -> NFS-e criada com status `SCHEDULED` no Asaas -> Invoice atualizado com `nfseId`.
2. **AUTHORIZED:** webhook `INVOICE_STATUS_CHANGED` com `AUTHORIZED` -> `Invoice.nfsePdfUrl` e `nfseXmlUrl` preenchidos -> UI exibe "Baixar PDF" e "Baixar XML".
3. **Sem NfseConfig:** webhook `PAYMENT_RECEIVED` para unidade sem `NfseConfig` -> cobrança permanece `RECEIVED`, nenhuma NFS-e emitida, warning logado, sem erro 500.
4. **Idempotência:** segundo webhook `PAYMENT_RECEIVED` para o mesmo Invoice -> nenhuma segunda NFS-e emitida (guard `nfseId IS NULL`).
5. **Acesso restrito:** responsavel de unidade A nao consegue acessar PDF de cobrança da unidade B (HTTP 403).

---

## 10. Decisoes fechadas

1. **NfseConfig como model separado (nao em BillingConfig nem em Subject):** `BillingConfig` e operacional; `Subject` e por materia. Fiscal da unidade fica em `NfseConfig` (1:1 com Unit). Extensivel para retencoes futuras sem poluir outros models.

2. **Emissao no evento RECEIVED (nao no fechamento do mes):** o prompt e o design confirmam emissao a cada pagamento. Mais simples, sem cron complexo. Cron de fechamento em lote e reservado para reprocessamento de notas com status ERROR (§11.2).

3. **Régua de lembretes nativa Asaas — escola nao edita:** a Education X nao oferece configuracao de lembretes por escola na v1. A régua padrao do Asaas (3 dias antes / no dia / apos venc) cobre o caso de uso confirmado pelo design. Customizacao e backlog futuro.

4. **CPF do tomador via customer Asaas (nao no payload da NFS-e):** o Guardian ja tem `asaasCustomerId`. O `payment` referencia o customer, que ja tem o CPF registrado no Asaas. Nao e necessario descriptografar o CPF para o payload de emissao — o Asaas preenche os dados do tomador automaticamente.

5. **municipalServiceCode (nao municipalServiceId):** usar o codigo manual (`Subject.nfseServiceCode`) em vez do ID da listagem Asaas. Mais robusto: funciona em municipios que usam Portal Nacional (onde a listagem retorna erro).

6. **Campos nfse* no Invoice, nao em model separado:** a NFS-e tem cardinalidade 1:1 com Invoice. Campos inline evitam join extra e simplificam queries de listagem. Suficiente para v1.

---

## 11. Pendencias

1. **Tela de configuracao fiscal (NfseConfig):** onde a escola informa aliquota ISS e regime tributario. Nao esta especificada em nenhuma das specs existentes. Precisa de UX — pode ser um passo adicional no onboarding ou uma sub-secao de Configuracoes. Decidir antes de implementar a fatia 1.

2. **Cron de reprocessamento de NFS-e com ERROR:** como a escola e notificada? Como e feita a retentativa manual? Escopar antes da fatia 3.

3. **Envio do PDF por email ao responsavel:** o design menciona (`screens-c3.jsx` linha 261: "Nota fiscal emitida a cada pagamento"). Asaas envia automaticamente ou a aplicacao precisa enviar? Verificar nas configuracoes da subconta Asaas antes da implementacao.

4. **ISS retido na fonte (`retainIss`):** em alguns municipios o tomador e pessoa juridica e retém o ISS. Adicionar ao formulario de NfseConfig? Ou calcular por CNPJ do Guardian? Decidir na fatia 1.

---

## 12. Fatiamento em Task Contracts

### Fatia 4-A — NfseConfig: migration + coleta fiscal

**Objetivo:** criar o model `NfseConfig` e coletar aliquota ISS + regime da escola.

**Scope in:**
- Migration: `NfseConfig` (issRatePercent, simplesNacional, retainIss, campos opcionais de retencao).
- Migration: campos `nfse*` no model `Invoice` (fluxo 03 deve existir ou rodar em paralelo).
- Endpoint `POST /api/units/:unitId/nfse-config` (criar/atualizar).
- Endpoint `GET /api/units/:unitId/nfse-config`.
- Validacao Zod: `issRatePercent` entre 0 e 10, `simplesNacional` booleano.
- Tela minima: formulario de configuracao fiscal (onde na UX — ver §11.1).

**Not included:** emissao da NFS-e, webhook, UI de detalhe da cobrança.

**DoD:**
```bash
pnpm typecheck && pnpm test:run
# + teste de integracao: criar NfseConfig, buscar, atualizar
```

---

### Fatia 4-B — Webhook PAYMENT_RECEIVED + emissao NFS-e

**Objetivo:** emitir NFS-e automaticamente quando pagamento e recebido.

**Scope in:**
- Handler do webhook Asaas `PAYMENT_RECEIVED` (ou estender o existente do fluxo 03).
- Guard de idempotencia: skip se `Invoice.nfseId` ja preenchido.
- Guard: skip se `Unit.nfseConfig` nulo (logar warning).
- Montagem do payload `AsaasCreateInvoicePayload` a partir de Invoice + Subject + NfseConfig.
- Chamada `POST /v3/invoices` (cliente Asaas existente, sandbox).
- Persistencia: `Invoice.nfseId`, `Invoice.nfseStatus = "SCHEDULED"`.

**Not included:** webhook de retorno do Asaas, UI.

**DoD:**
```bash
pnpm typecheck && pnpm test:run
# + teste de integracao sandbox: webhook PAYMENT_RECEIVED -> Invoice.nfseId preenchido
# + idempotencia: segundo webhook nao duplica
# + sem NfseConfig: sem erro 500
```

---

### Fatia 4-C — Webhook INVOICE_STATUS_CHANGED + UI de detalhe

**Objetivo:** receber confirmacao de emissao do Asaas e exibir PDF/XML na UI.

**Scope in:**
- Handler webhook `INVOICE_STATUS_CHANGED` (AUTHORIZED / ERROR / CANCELED).
- Persistencia: `Invoice.nfseStatus`, `Invoice.nfseNumber`, `Invoice.nfsePdfUrl`, `Invoice.nfseXmlUrl`, `Invoice.nfseEmittedAt`.
- Endpoint `GET /api/invoices/:id` inclui campos `nfse*` na resposta.
- UI: secao "Nota fiscal" no detalhe da cobrança (condicional: so aparece quando `nfseStatus = AUTHORIZED`).
- Botoes "Baixar PDF" e "Baixar XML" com URLs corretas.
- Historico da cobrança: item "Nota fiscal emitida".
- Acesso restrito: `unitId` do Invoice deve coincidir com `unitId` da sessao.

**Not included:** cron de reprocessamento de ERROR (§11.2), envio de email (§11.3).

**DoD:**
```bash
pnpm typecheck && pnpm test:run && pnpm dlx playwright test nfse --reporter=line
# E2E: webhook AUTHORIZED -> PDF e XML aparecem na UI
# E2E: unidade B nao acessa PDF da unidade A (403)
```

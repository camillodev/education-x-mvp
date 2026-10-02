# Spec — Portal do Responsavel (mobile)

> **Status:** fechada (PRD-aligned, Claude + Rafa, 2026-07-09)
> **Fonte de verdade:** `prisma/schema.prisma` + `src/lib/integration/asaas/types.ts` + doc Asaas v3 (POST /payments CREDIT_CARD, POST /creditCard/tokenizeCreditCard, GET /payments/{id}/pixQrCode) + prototipo (`screens-e.jsx?v=9`) + spec fluxo 03 (cobranca-automatica) + spec mvp-045-regua-negativacao (negativacao automatica).
> **Fonte prioritaria:** prd-education-hub-mvp.md — implementa M4 com auth magic link (DT-01: migrar p/ CPF+OTP).
> **DS:** Alfabeto.

---

## 0. Debito tecnico DT-01 — Auth CPF + OTP SMS (pendente de migracao)

O PRD (M4, requisitos P0) especifica autenticacao passwordless via **CPF + codigo OTP SMS de 6 digitos**:

> "Autenticacao passwordless: CPF → codigo 6 digitos via SMS (Twilio ou Asaas WhatsApp). Codigo expira em 10 minutos. Rate limit: maximo 3 tentativas por CPF por hora." (PRD M4, requisito P0)
> Sessao ativa por 24h apos codigo correto (PRD M4, AC — Autenticacao).

Esta spec **mantem magic link** (Decisao D-01, secao 10) como solucao da Fatia 2 porque:
- Provedor de SMS ainda nao foi decidido (PRD Open Questions: "SMS para autenticacao portal: Twilio ou Asaas WhatsApp? — Engineering — Sim, bloqueante antes de M4").
- Magic link remove a mesma friccao de senha e reusa infraestrutura de email/WhatsApp ja existente (envio de link na Invoice).

**Migracao para CPF+OTP fica registrada como debito tecnico explicito**, a ser puxada quando o provedor SMS for decidido. Requisitos a implementar na migracao:
- Input CPF → gera + envia codigo 6 digitos (Twilio ou Asaas WhatsApp)
- Codigo expira em 10 minutos
- Rate limit: maximo 3 tentativas por CPF por hora
- Sessao ativa por 24h apos codigo correto
- CPF nao cadastrado → mensagem generica (nao revelar existencia do cadastro — ver RN-01a)

Nao bloqueia esta spec. Nao reabrir a decisao de magic link sem decisao de provedor SMS.

---

## 1. Objetivo

Dar ao responsavel (pai/mae/guardiao) um canal proprio — acessado por link autenticado, sem cadastro — para ver cobranças, pagar via PIX, quitar boletos vencidos com valor atualizado, cadastrar cartao para debito automatico, consultar historico de pagamentos dos ultimos 12 meses e baixar NFS-e. E o unico ponto de contato financeiro do responsavel com a escola. Mobile-first, leve o suficiente para rodar bem em 3G e dentro do WhatsApp in-app browser.

**DoD (Rafa):** responsavel consegue abrir o link do portal, ver a proxima cobrança, pagar via PIX (QR + copia-e-cola), quitar boleto vencido (com breakdown multa 2% + juros 1% a.m.), cadastrar cartao (token PCI-safe, aviso 2,99%), consultar historico de pagamentos dos ultimos 12 meses, baixar PDF da NFS-e de cobranças pagas e ver centro de notificacoes. Playwright E2E em mobile breakpoint 375px cobrindo os 6 fluxos. First load JS da rota `/portal` < 200KB (checado via `next build`).

---

## 2. Dados necessarios (o coracao)

A pergunta-guia: quais dados o responsavel precisa para pagar e gerenciar suas obrigacoes financeiras com a escola?

### 2a. Piso Asaas

#### POST /payments com billingType CREDIT_CARD (cobrança no cartao)

Endpoint: `POST https://api-sandbox.asaas.com/v3/payments`

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer` | string | Sim | Guardian.asaasCustomerId |
| `billingType` | string | Sim | `"CREDIT_CARD"` |
| `value` | number (reais) | Sim | Valor em reais (centavos / 100 na borda) |
| `dueDate` | string YYYY-MM-DD | Sim | Data de vencimento |
| `externalReference` | string | Recomendado | Invoice.id (idempotencia) |
| `description` | string | Opcional | Ex: "Matematica — Junho/2026" |
| `creditCard.holderName` | string | Sim (cartao avulso) | Nome impresso no cartao |
| `creditCard.number` | string | Sim (cartao avulso) | Numero completo — NUNCA persistir |
| `creditCard.expiryMonth` | string | Sim | MM |
| `creditCard.expiryYear` | string | Sim | YYYY |
| `creditCard.ccv` | string | Sim | CVV — NUNCA persistir |
| `creditCardToken` | string | Sim (se tokenizado) | Token salvo em CardToken.asaasCardToken — substitui creditCard completo |
| `creditCardHolderInfo.name` | string | Sim (primeiro uso) | Nome completo do titular |
| `creditCardHolderInfo.email` | string | Sim (primeiro uso) | E-mail do titular |
| `creditCardHolderInfo.cpfCnpj` | string | Sim (primeiro uso) | CPF/CNPJ — so na borda, nunca logar |
| `creditCardHolderInfo.postalCode` | string | Sim (primeiro uso) | CEP |
| `creditCardHolderInfo.addressNumber` | string | Sim (primeiro uso) | Numero do endereco |
| `creditCardHolderInfo.phone` | string | Opcional | Telefone |
| `creditCardHolderInfo.mobilePhone` | string | Opcional | Celular |
| `remoteIp` | string | Sim | IP do dispositivo do responsavel (obrigatorio pela Asaas/PCI) |
| `fine.value` | number | Opcional | Multa (%) — vem de BillingConfig.lateFeePercent / 100 |
| `interest.value` | number | Opcional | Juros a.m. (%) — vem de BillingConfig.monthlyInterestBp / 100 |

**Nota PCI:** quando `creditCardToken` e usado, os campos de `creditCard.*` NAO sao enviados. O token substitui o numero completo. NUNCA persistir numero, CVV ou data de validade completa no banco.

#### POST /creditCard/tokenizeCreditCard (tokenizacao de cartao)

Endpoint: `POST https://api-sandbox.asaas.com/v3/creditCard/tokenizeCreditCard`
Header: `access_token: <subconta-apiKey>`

| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer` | string | Sim | Guardian.asaasCustomerId |
| `creditCard.holderName` | string | Sim | Nome impresso no cartao |
| `creditCard.number` | string | Sim | Numero completo — trafega so para o Asaas, NUNCA salvar no banco |
| `creditCard.expiryMonth` | string | Sim | MM (ex: "12") |
| `creditCard.expiryYear` | string | Sim | YYYY (ex: "2029") |
| `creditCard.ccv` | string | Sim | CVV — trafega so para o Asaas, NUNCA salvar no banco |
| `creditCardHolderInfo.name` | string | Sim | Nome completo do titular |
| `creditCardHolderInfo.email` | string | Sim | E-mail (PII — criptografar se persistido) |
| `creditCardHolderInfo.cpfCnpj` | string | Sim | CPF/CNPJ (PII — descriptografar de Guardian.cpfEnc na borda, NUNCA logar) |
| `creditCardHolderInfo.postalCode` | string | Sim | CEP (Guardian.cep ou coletado no formulario) |
| `creditCardHolderInfo.addressNumber` | string | Sim | Numero do endereco |
| `creditCardHolderInfo.phone` | string | Opcional | Telefone |
| `creditCardHolderInfo.mobilePhone` | string | Opcional | Celular |
| `remoteIp` | string | Sim | IP do responsavel (obrigatorio Asaas/PCI) |

Resposta de sucesso:

| Campo | Tipo | Descricao |
|---|---|---|
| `creditCardToken` | string | Token permanente — salvar em CardToken.asaasCardToken |
| `creditCardBrand` | string | Ex: "VISA", "MASTERCARD" — salvar em CardToken.brand |
| `creditCardNumber` | string | Ultimos 4 digitos mascarados (ex: "4242") — salvar em CardToken.last4 |

**Regra PCI:** `creditCardToken` e o unico dado de cartao persistido no banco. Os campos `creditCard.number`, `creditCard.ccv` e `creditCard.expiryYear`/`Month` NUNCA sao salvos. O numero exibido na UI e sempre `CardToken.last4` mascarado.

#### GET /payments/{id}/pixQrCode (QR code PIX de um pagamento)

Endpoint: `GET https://api-sandbox.asaas.com/v3/payments/{asaasPaymentId}/pixQrCode`
Header: `access_token: <subconta-apiKey>`
Sem body.

Resposta de sucesso: [verificar no sandbox — campos padrao Asaas v3]

| Campo | Tipo | Descricao |
|---|---|---|
| `encodedImage` | string | QR code como base64 PNG — exibir em `<img src="data:image/png;base64,{encodedImage}">` |
| `payload` | string | Codigo PIX copia-e-cola (EMV QR Code string) |
| `expirationDate` | string (ISO 8601) | Data/hora de expiracao do QR |

**Nota:** chamado sob demanda quando o responsavel abre a tela de pagamento. Resultado nao e persistido (QR expira). `billingType` do Invoice pode ser `BOLETO` (que ja embute PIX no Asaas) ou `PIX`. Nos dois casos, o endpoint retorna os dados acima.

---

### 2b. Negocio

| Dado | Origem | Para que serve |
|---|---|---|
| Lista de Invoice do guardian | Invoice + Enrollment (fluxo 03) | Historico e proxima cobrança |
| Invoice.amountCents | Invoice | Valor base (centavos) |
| Invoice.netAmountCents | Invoice | Valor apos desconto (centavos) |
| Invoice.dueDate | Invoice | Data de vencimento |
| Invoice.status | InvoiceStatus | Determina badge e acoes |
| Invoice.asaasPaymentId | Invoice | Chave para buscar QR PIX e baixar boleto |
| Invoice.asaasBankSlipUrl | Invoice | Link direto do boleto PDF (Asaas) |
| BillingConfig.lateFeePercent | BillingConfig | Calculo da multa (bp / 100) |
| BillingConfig.monthlyInterestBp | BillingConfig | Calculo dos juros (bp / 100 por mes) |
| Invoice.emittedAt | Invoice | Para calculo de dias de atraso e juros pro rata |
| BillingConfig.acceptsCard | BillingConfig | Se false, ocultar opcao de cartao |
| BillingConfig.cardFeePayer | FeePayer | Se RESPONSAVEL, mostrar aviso de 2,99% |
| Invoice (spec mvp-045-regua-negativacao) | Invoice | Se status=NEGATIVATED, exibir banner de risco |
| AsaasInvoice.pdfUrl | Retornado pelo Asaas (fluxo 04) | Download da NFS-e PDF |
| Unit.name | Unit | Nome da escola exibido no portal |
| Subject.name + planType | Enrollment + Subject | Descricao da cobrança ("Matematica — Mensal") |
| CardToken (NOVO) | CardToken | Token do cartao cadastrado |

**Calculo do valor atualizado (boleto vencido):**
```
diasAtraso = diferenca em dias entre hoje e Invoice.dueDate
multaCents  = round(Invoice.netAmountCents * (lateFeePercent / 10000))   // lateFeePercent em bp
jurosCents  = round(Invoice.netAmountCents * (monthlyInterestBp / 10000) * diasAtraso / 30)
totalCents  = Invoice.netAmountCents + multaCents + jurosCents
```
Exibir breakdown: Valor original + Multa (2%) + Juros (1% a.m.) + Total a pagar.

### 2c. Fiscal

| Dado | Origem | Descricao |
|---|---|---|
| AsaasInvoice.pdfUrl | Asaas (via fluxo 04 NFS-e) | PDF da NFS-e emitida pelo Asaas pos-pagamento |
| AsaasInvoice.number | Asaas | Numero da nota (exibido na lista: "NF 00008711") |
| Invoice (nosso) + AsaasInvoice | Relacao 1:1 (fluxo 04) | Portal exibe link de download da NFS-e por Invoice.paidAt |

O portal NAO emite NFS-e — apenas exibe e permite baixar o PDF ja emitido pelo fluxo 04. Se a NFS-e ainda nao foi emitida (Invoice.status != PAID ou fluxo 04 pendente), exibir "Nota fiscal em processamento".

### 2d. Compliance / LGPD

| Campo | Classificacao | Tratamento |
|---|---|---|
| Guardian.cpfEnc | PII — Sensivel | AES-256-GCM no banco; descriptografar so na borda de saida para o Asaas (tokenizacao); NUNCA exibir na UI |
| Guardian.emailEnc | PII | AES-256-GCM; descriptografar so para envio de link do portal |
| Guardian.phoneEnc | PII | AES-256-GCM; so para envio de SMS/WhatsApp |
| CardToken.asaasCardToken | Token PCI | Nao e PII mas e dado financeiro sensivel — restrito a leitura por servidor; nunca exposto em resposta de API publica |
| PortalSession.guardianId + unitId | Dado de sessao | Vinculado ao token JWT da sessao do portal; never em querystring |
| `creditCardHolderInfo.cpfCnpj` | PII em transit | Descriptografar de Guardian.cpfEnc apenas para chamar o Asaas; nunca logar; limpar da memoria apos a chamada |
| remoteIp | Dado tecnico / LGPD | Coletar do request; informar no aviso de privacidade do portal |

**Nota KYC:** o Asaas exige `creditCardHolderInfo.cpfCnpj` para a primeira tokenizacao. O CPF ja foi coletado no cadastro do Guardian (fluxo 02). Descriptografar na borda do servico. Nao coletar novamente na UI do portal.

---

## 3. Tabela de confronto

| Dado necessario | Origem | Obrigatorio? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolucao |
|---|---|---|---|---|---|---|
| Guardian.asaasCustomerId | Guardian | Sim | existe (`asaasCustomerId String?`) | `customer` | Nao exibido | Se nulo, pagamento com cartao bloqueado — mostrar mensagem "Cadastro incompleto, contate a escola" |
| Invoice.* (lista, valor, status) | Invoice (fluxo 03) | Sim | existe (fluxo 03 criou) | `externalReference`, `value` | Sim (home, historico, overdue) | Buscar por `guardianId` via Enrollment |
| Invoice.asaasPaymentId | Invoice | Sim (para QR PIX e boleto) | existe (`asaasPaymentId String?`) | `id` no endpoint pixQrCode | Nao exibido diretamente | Se nulo, Invoice ainda nao emitida — botao "Pagar agora" desabilitado com tooltip |
| Invoice.asaasBankSlipUrl | Invoice | Sim (para quitar boleto) | existe (`asaasBankSlipUrl String?`) | n/a (link direto) | Nao | Se nulo, usar Invoice.asaasPaymentId para buscar no Asaas |
| BillingConfig.lateFeePercent + monthlyInterestBp | BillingConfig | Sim (calculo de atraso) | existem | `fine.value`, `interest.value` | Sim (breakdown na tela overdue) | Dividir por 100 para display (200 bp = 2%) |
| CardToken (NOVO model) | CardToken | Sim (para cartao) | **NAO EXISTE** | `creditCardToken` (no body do payment) | Sim (tela card, home badge) | Criar model CardToken (ver sec 4) |
| CardToken.asaasCardToken | CardToken | Sim (token PCI) | **FALTA** | `creditCardToken` | Nao exibido | Retornado pela tokenizacao; persistir somente o token, nunca o numero |
| CardToken.last4 | CardToken | Sim (exibicao) | **FALTA** | `creditCardNumber` (mascarado) na resposta | Sim ("•••• 4242") | Salvar da resposta de tokenizacao |
| CardToken.brand | CardToken | Opcional | **FALTA** | `creditCardBrand` na resposta | Sim (icone da bandeira — futuro) | Salvar da resposta de tokenizacao |
| QR code PIX | Asaas GET /payments/{id}/pixQrCode | Sim (tela pay) | Nao persiste | `encodedImage`, `payload` | Sim (tela pay — QR + copia-e-cola) | Buscar on-demand; nao cachear (QR expira) |
| AsaasInvoice.pdfUrl | Asaas (fluxo 04) | Sim (download NF) | existe em AsaasInvoice.pdfUrl (fluxo 04) | `pdfUrl` | Sim (detalhe, badge "NF disponivel") | Se fluxo 04 nao emitiu ainda, exibir "Em processamento" |
| PortalSession (auth sem Clerk) | NOVO model ou JWT estateless | Sim (acesso ao portal) | **NAO EXISTE** | n/a | Nao (fluxo interno) | Ver secao 4 e Decisao D-01 |
| remoteIp | Request HTTP | Sim (PCI / Asaas) | n/a — capturado no handler | `remoteIp` no payload Asaas | Nao | `headers['x-forwarded-for'] ?? req.socket.remoteAddress` na API route |
| Dunning.status | Dunning (spec mvp-045-regua-negativacao) | Sim (banner de risco) | existe (spec mvp-045 criou) | n/a | Sim (banner vermelho home) | Buscar Dunning por invoiceId das invoices do guardian |
| Unit.name + Guardian.name | Unit, Guardian | Sim (saudacao home) | existem | n/a | Sim ("Ola, Maria · Joao Silva · Kumon Camargos") | Ler do token de sessao (sem query extra) |
| creditCardHolderInfo.cpfCnpj | Guardian.cpfEnc | Sim (tokenizacao) | existe (criptografado) | `creditCardHolderInfo.cpfCnpj` | Nao exibido | Descriptografar so no servidor na hora da chamada; nunca enviar ao cliente |

---

## 4. Deltas de schema

### CardToken (NOVO model — compliance PCI)

```prisma
// ─── Card Token (PCI DSS) ─────────────────────────────────────────────────────
// NUNCA salvar numero completo, CVV ou validade completa.
// asaasCardToken e o unico dado sensivel — restrito ao servidor.

model CardToken {
  id        String   @id @default(cuid())
  unitId    String
  guardianId String

  // Token Asaas — substitui o numero do cartao em cobranças futuras
  asaasCardToken String   // retornado por POST /creditCard/tokenizeCreditCard
  last4          String   // ultimos 4 digitos mascarados (ex: "4242")
  brand          String?  // "VISA" | "MASTERCARD" | "ELO" etc
  holderName     String   // nome impresso no cartao (sem CPF)

  // Controle
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit     Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@index([guardianId])
  @@map("card_tokens")
}
```

**Adicionar em Guardian:**
```prisma
  cardTokens CardToken[]
```

**Adicionar em Unit:**
```prisma
  cardTokens CardToken[]
```

### PortalSession (auth do portal — Decisao D-01)

```prisma
// Token de sessao do portal do responsavel (sem Clerk)
// Um link enviado por email/WhatsApp contem um token unico e de curta duracao.

model PortalSession {
  id         String   @id @default(cuid())
  unitId     String
  guardianId String
  token      String   @unique  // UUID v4 — invalidado apos uso ou expiracao
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())

  unit     Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  guardian Guardian @relation(fields: [guardianId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@index([guardianId])
  @@index([token])
  @@map("portal_sessions")
}
```

**Adicionar em Guardian:**
```prisma
  portalSessions PortalSession[]
```

**Adicionar em Unit:**
```prisma
  portalSessions PortalSession[]
```

---

## 5. Contratos Asaas

### 5a. POST /creditCard/tokenizeCreditCard

Endpoint: `POST https://api-sandbox.asaas.com/v3/creditCard/tokenizeCreditCard`

```json
{
  "customer": "cus_abc123",
  "creditCard": {
    "holderName": "Maria Silva",
    "number": "4242424242424242",
    "expiryMonth": "12",
    "expiryYear": "2029",
    "ccv": "123"
  },
  "creditCardHolderInfo": {
    "name": "Maria Silva",
    "email": "maria@email.com",
    "cpfCnpj": "12345678901",
    "postalCode": "01310100",
    "addressNumber": "42",
    "mobilePhone": "11987654321"
  },
  "remoteIp": "177.55.123.42"
}
```

Resposta esperada:
```json
{
  "creditCardToken": "tok_abc123xyz789",
  "creditCardBrand": "VISA",
  "creditCardNumber": "XXXXXXXXXXXX4242"
}
```

**Persistir:** apenas `creditCardToken`, `creditCardBrand`, `creditCardNumber` (ultimos 4). Descartar `creditCard.*` da memoria apos a chamada.

### 5b. POST /payments com creditCardToken (cobrança recorrente)

```json
{
  "customer": "cus_abc123",
  "billingType": "CREDIT_CARD",
  "value": 464.55,
  "dueDate": "2026-07-07",
  "externalReference": "inv_cjld2cyuq000h5xb6s3ek5qh",
  "description": "Matematica — Julho/2026",
  "creditCardToken": "tok_abc123xyz789",
  "remoteIp": "177.55.123.42",
  "fine": { "value": 2 },
  "interest": { "value": 1 }
}
```

Conversao de borda: `value = Invoice.netAmountCents / 100`.

### 5c. GET /payments/{id}/pixQrCode (QR PIX on-demand)

```
GET https://api-sandbox.asaas.com/v3/payments/{asaasPaymentId}/pixQrCode
Authorization: access_token <subconta-apiKey>
```

Resposta esperada:
```json
{
  "encodedImage": "iVBORw0KGgoAAAANSUhEUgAA...",
  "payload": "00020126360014BR.GOV.BCB.PIX...",
  "expirationDate": "2026-07-07T23:59:59"
}
```

O `encodedImage` e exibido como `<img src="data:image/png;base64,{encodedImage}" />`. O `payload` e o codigo copia-e-cola. Nao persistir — buscar sempre que o responsavel abre a tela de pagamento. O QR expira em `expirationDate`.

---

## 6. Regras de negocio (EARS)

**RN-01:** WHEN responsavel acessa `/portal?token={t}` THEN o sistema SHALL validar que `PortalSession.token = t` e `expiresAt > now()` e `usedAt IS NULL`; se invalido, retornar tela de erro "Link expirado — solicite um novo link a escola".

**RN-01a (PRD/LGPD):** WHEN o token e invalido, expirado ou ja usado THEN o sistema SHALL exibir SEMPRE a mensagem generica **"Link invalido ou expirado — contate a escola"**, independente do motivo real (token inexistente, expirado, ja usado, ou guardianId inexistente); o sistema SHALL NAO revelar se o cadastro do responsavel existe ou nao (mesma resposta para todos os casos, previne enumeracao/vazamento de PII).

**RN-02:** WHEN sessao valida THEN o sistema SHALL retornar as Invoices do Guardian (via Enrollment) com `status IN (PENDING, OVERDUE, PAID)` da Unit correspondente; nao expor Invoices de outras Units.

**RN-03:** WHEN Invoice.status = OVERDUE THEN o sistema SHALL calcular `totalCents = netAmountCents + multaCents + jurosCents` usando `lateFeePercent` e `monthlyInterestBp` da BillingConfig; exibir breakdown detalhado.

**RN-04:** WHEN responsavel clica "Pagar agora" em Invoice com `asaasPaymentId != null` THEN o sistema SHALL chamar `GET /payments/{asaasPaymentId}/pixQrCode` e exibir QR + copia-e-cola.

**RN-05:** WHEN Invoice.asaasPaymentId IS NULL THEN o sistema SHALL desabilitar "Pagar agora" com mensagem "Cobrança ainda sendo processada — tente em alguns minutos".

**RN-06:** WHEN responsavel clica "Ja paguei" THEN o sistema SHALL exibir mensagem "Confirmando pagamento..." e aguardar webhook PAYMENT_RECEIVED (fluxo 03) para atualizar o status; NAO marcar Invoice como PAID sem confirmacao do Asaas.

**RN-07:** WHEN responsavel clica "Cadastrar cartao" THEN o sistema SHALL:
  1. Receber dados do cartao no servidor (NAO enviar numero ao frontend)
  2. Chamar `POST /creditCard/tokenizeCreditCard` no Asaas
  3. Persistir apenas `creditCardToken`, `last4`, `brand` em CardToken
  4. Nunca salvar numero completo, CVV ou expiryYear no banco

**RN-08:** WHEN `BillingConfig.acceptsCard = false` THEN o sistema SHALL ocultar a opcao de cadastrar cartao no portal.

**RN-09:** WHEN `BillingConfig.cardFeePayer = RESPONSAVEL` THEN o sistema SHALL exibir aviso: "Ao pagar no cartao, a escola cobra 2,99% de taxa adicional sobre a mensalidade."

**RN-10:** WHEN CardToken existe para o Guardian THEN o sistema SHALL exibir "Pagamento automatico ativo — cartao •••• {last4}" e opcao "Remover".

**RN-11:** WHEN responsavel remove o cartao THEN o sistema SHALL marcar `CardToken.isActive = false` e NAO chamar API Asaas (token continua valido no Asaas mas nao e usado nas proximas cobranças).

**RN-12:** WHEN Invoice.status = NEGATIVATED para qualquer Invoice do Guardian THEN o sistema SHALL exibir banner vermelho "Risco de negativacao" na home com CTA "Quitar e regularizar".

**RN-12a (PRD):** WHEN o sistema exibe o badge de status de uma Invoice THEN o SHALL usar o codigo de cores: `PAID` = **verde**, `PENDING` (a vencer) = **azul**, `OVERDUE` = **vermelho**, `NEGATIVATED` = **preto**. Aplica-se a todos os pontos de exibicao de badge (home, historico, detail).

**RN-12b (PRD):** WHEN responsavel acessa a aba/tela de historico THEN o sistema SHALL listar as Invoices com `status = PAID` dos ultimos 12 meses (`paidAt >= now() - 12 meses`), ordenadas por `paidAt` decrescente, com data, valor e link "NF disponivel" quando `AsaasInvoice.pdfUrl` existir.

**RN-13:** WHEN a emissao de NFS-e (P1, fluxo 04) estiver ativa para a Unit E responsavel baixa NFS-e THEN o sistema SHALL:
  1. Verificar que Invoice.status = PAID e que ha um AsaasInvoice.pdfUrl associado
  2. Redirecionar ou servir o PDF via proxy (nunca expor a URL do Asaas diretamente ao cliente — previne acesso direto sem autenticacao)
  3. Se pdfUrl nulo: exibir "Nota fiscal em processamento"

  WHEN a emissao de NFS-e nao estiver ativa (feature P1 nao habilitada) THEN o sistema SHALL ocultar o botao "Baixar NF" em todas as telas (home historico, detail) — a regra RN-13 permanece definida para quando o fluxo 04 for ativado, mas nao e exibida como pendencia bloqueante do MVP.

**RN-16 (PRD/performance):** WHEN a rota `/portal` e construida THEN o first-load JS SHALL ser < 200KB (verificado via `next build` + analise do first load JS da rota); o portal SHALL funcionar em conexao 3G e dentro do WhatsApp in-app browser (sem features que dependam de APIs nao suportadas nesses contextos).

**RN-14:** WHEN link do portal e gerado THEN o sistema SHALL definir `PortalSession.expiresAt = now() + 7 dias`; apos autenticacao, a sessao dura 24 horas (cookie HTTP-only).

**RN-15:** WHEN Guardian nao tem `asaasCustomerId` THEN o sistema SHALL ocultar opcao de pagamento com cartao e exibir aviso "Cadastro incompleto — contate a escola".

---

## 7. Estados e transicoes

### Invoice no portal (subconjunto do InvoiceStatus do fluxo 03)

```
PENDING      -> badge AZUL "A vencer"; exibe botao "Pagar agora" (PIX QR)
               -> se BillingConfig.acceptsCard = true e CartaoAtivo: cobra no cartao automaticamente
OVERDUE      -> badge VERMELHO "Vencida"; exibe tela "Quitar boleto vencido" com valor atualizado + breakdown
               -> se Invoice.status = NEGATIVATED: badge PRETO "Negativada" + banner vermelho de risco
PAID         -> badge VERDE "Paga"; entra no historico (12 meses); se NFS-e ativa e AsaasInvoice.pdfUrl existe: botao "Baixar NF"
CANCELLED    -> exibir "Cancelada" (informativo apenas)
BLOCKED      -> exibir "Pendente de cadastro — contate a escola"
ERROR        -> exibir "Problema na emissao — contate a escola"
```

**Codigo de cores dos badges (RN-12a, PRD):** paga = **verde** · a vencer = **azul** · vencida = **vermelho** · negativada = **preto**.

### PortalSession

```
[escola envia link] -> CRIADA (token, expiresAt = +7d, usedAt = null)
                          |
               [responsavel abre o link]
                          |
                       ATIVA (cookie HTTP-only 24h)
                          |
               [expiresAt < now() OU cookie expirou]
                          |
                      EXPIRADA -> redirecionar para tela "Link expirado"
```

### CardToken

```
[sem cartao]   -> UI mostra "Cadastrar cartao"
[cadastrando]  -> formulario de cartao -> POST tokenizeCreditCard -> salvar token
[ativo]        -> UI mostra "•••• 4242 · Remover"
[removido]     -> isActive = false; UI volta para "Cadastrar cartao"
```

---

## 8. Fluxo de coleta (UX, referencia ao design)

Design de referencia: `prototipo/design-handoff/project/app/screens-e.jsx` (FlowE).
Telas: `home`, `pay`, `overdue`, `card`, `cardOk`, `detail`, `notif`, `success`, `historico` (NOVA, RN-12b).

O design e referencia de UX. Os campos derivam do piso Asaas (sec 2), nao do design.

### Tela home

- Header azul: logo + icone de sino (badge com contagem de notificacoes nao lidas) + avatar com iniciais do responsavel.
- Saudacao: "Ola, {Guardian.name}" + "{Student.name} · {Unit.name}".
- **Banner de risco** (se Invoice.status = NEGATIVATED): card vermelho "Risco de negativacao — Mensalidade de {mes} vencida ha N dias. Regularize ate {data} para evitar SPC/Serasa." + CTA "Quitar e regularizar". Badge de status PRETO "Negativada" na Invoice correspondente.
- **Proxima cobrança**: card com valor da proximo Invoice.status = PENDING, descricao, data de vencimento, badge **AZUL** "A vencer" + botao "Pagar agora".
- **Cartao**: card de pagamento automatico — se CardToken ativo: "•••• {last4} · Pagamento automatico ativo" + botao "Remover"; se sem cartao: "Cadastrar cartao".
- **Cobrancas em aberto**: lista de Invoices PENDING/OVERDUE em cards — badge de status colorido (azul/vermelho/preto), descricao, valor, data.
- **Acesso ao historico**: link/tab "Ver historico" leva a tela `historico` (RN-12b).

### Tela historico (NOVA — RN-12b, PRD M4.5)

- Lista de Invoices com `status = PAID` dos ultimos 12 meses, ordenadas por `paidAt` decrescente.
- Cada item: badge **VERDE** "Paga", descricao, valor, data de pagamento, link "NF disponivel" se emissao NFS-e ativa e `AsaasInvoice.pdfUrl` existir (RN-13).
- Estado vazio: "Nenhum pagamento nos ultimos 12 meses."

### Tela pay (PIX)

- Valor em destaque (para Invoice vencida: valor atualizado).
- QR Code gerado de `GET /payments/{id}/pixQrCode` (encodedImage).
- Botao "Copiar codigo PIX" — copia `payload` para o clipboard, icone muda para check.
- Botao "Ja paguei" — exibe "Confirmando..." (aguarda webhook; nao altera estado local).
- Texto: "A confirmacao e automatica em segundos."
- Se `GET /payments/{id}/pixQrCode` retornar erro (QR/cobrança expirada no Asaas): exibir mensagem "Cobrança expirada — contate a escola" no lugar do QR (P-05 resolvido; reemissao da cobrança fica fora de escopo desta spec, tratada no fluxo 03).

### Tela overdue (boleto vencido)

- "Valor atualizado" em vermelho + breakdown: Valor original + Multa (2%) + Juros (1% a.m.) + Total a pagar.
- Card informativo: "Ao quitar, sua situacao e regularizada na hora e a negativacao e cancelada automaticamente."
- CTA primario: "Pagar com PIX" (vai para tela pay).
- CTA secundario: "Ja paguei o boleto" (mesma logica da tela pay — aguarda webhook).

### Tela card (cadastrar cartao)

- Campos: Numero do cartao, Validade (MM/AA), CVV, Nome no cartao.
- Mock visual do cartao (nao e dado real — e so decorativo).
- Checkbox obrigatorio: "Autorizo a cobrança recorrente automatica neste cartao e concordo com os termos da assinatura." — botao desabilitado ate aceite.
- Aviso (se cardFeePayer = RESPONSAVEL): "Ao pagar no cartao, a escola cobra 2,99% de taxa adicional. No PIX e boleto, nenhuma taxa extra."
- Botao "Salvar cartao" — envia para API server-side que chama Asaas. Numero NUNCA sai do servidor para o banco.

### Tela cardOk

- Confirmacao: "Cartao cadastrado! Pagamento automatico ativado no cartao •••• {last4}. As proximas mensalidades serao pagas sozinhas."
- CTA: "Voltar ao inicio".

### Tela detail (detalhe de uma cobrança)

- Valor + descricao + badge de status (cores RN-12a).
- Metadados: Forma (Boleto/PIX), Pago em ou Vence em, ID interno (#INV-XXXX).
- Se PAID e emissao NFS-e (P1) ativa: card com "Nota fiscal n° {number}" + botao "PDF" (download NFS-e). Se NFS-e nao ativa: card omitido (RN-13).
- Se PENDING/OVERDUE: botao "Pagar agora".

### Tela notif (centro de notificacoes)

- Cards por tipo: danger (risco negativacao), warning (a vencer), info (mensagens da escola).
- Cada card: icone + titulo + timestamp + corpo + CTA quando aplicavel.
- Notificacoes "info" sao mensagens da unidade (sem acao financeira).

---

## 9. Definition of Done (binario)

```bash
# 1. Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# 2. Migration com CardToken e PortalSession
pnpm prisma migrate dev --name add-card-token-portal-session
pnpm prisma generate
grep -E "model CardToken|model PortalSession" prisma/schema.prisma | wc -l | grep -q "^2$"

# 3. E2E Playwright — mobile breakpoint 375px (obrigatorio: fluxo toca dinheiro)
pnpm dlx playwright test portal --reporter=line --project=mobile

# 4. Bundle size — first load JS da rota /portal < 200KB (PRD: mobile-first, 3G, WhatsApp browser)
pnpm build
node -e "
  const manifest = require('./.next/build-manifest.json');
  // Verificar first load JS da rota /portal no output de 'next build' (coluna 'First Load JS')
  // Falhar o build se > 200KB — checar manualmente o output do build ate script de CI dedicado existir.
"
# Alternativa manual: rodar `pnpm build` e conferir na tabela de output que a rota /portal
# tem "First Load JS" < 200 kB. Documentar o valor no PR.
```

Playwright E2E deve cobrir (viewport 375x812):

1. **home com Invoice PENDING:** responsavel abre portal via token valido; ve proxima cobrança; clica "Pagar agora"; QR PIX exibe; clica "Copiar codigo PIX"; clipboard tem o payload.
2. **home com Invoice OVERDUE + status NEGATIVATED:** banner vermelho visivel; badge PRETO "Negativada"; clica "Quitar e regularizar"; tela overdue exibe breakdown correto (valor + multa 2% + juros pro rata); CTA "Pagar com PIX" abre tela pay.
3. **cadastrar cartao:** clica "Cadastrar cartao"; preenche formulario; aceita checkbox; clica "Salvar cartao"; tela cardOk exibe "•••• 4242"; home exibe "Pagamento automatico ativo".
4. **historico + download NFS-e:** tela historico exibe Invoices PAID dos ultimos 12 meses com badge VERDE; se NFS-e ativa, clica "PDF"; request de download e acionado (nao testa conteudo do PDF, apenas o status 200 da rota de proxy).
5. **link invalido/expirado (RN-01a):** acessar `/portal?token=expirado` E `/portal?token=inexistente` retornam a MESMA tela de erro genérica "Link invalido ou expirado — contate a escola", sem diferenca de conteudo/timing que revele existencia do cadastro.
6. **CardToken PCI:** verificar que banco NAO contem numero completo do cartao (`SELECT * FROM card_tokens WHERE last4 = '4242'` deve ter apenas token, last4, brand — nunca coluna "number" ou "ccv").

---

## 10. Decisoes fechadas

**D-01 — Auth do portal: link magico (magic link), sem Clerk.**
O responsavel nao tem conta Clerk. O acesso e via link unico enviado por WhatsApp/e-mail gerado pela escola ou automaticamente (ex: ao emitir Invoice). O link contem `?token={uuid}` que e validado contra `PortalSession`. Apos autenticacao, o servidor emite um cookie HTTP-only com JWT curto (24h). Clerk NAO e usado neste fluxo.
_Motivo: responsavel nao pode ser obrigado a criar conta; link direto remove friccao e e padrao de mercado (Asaas, iFood, etc.)._
_Nota (2026-07-09):_ o PRD (M4) pede CPF + OTP SMS. Mantido magic link por decisao explicita ate provedor SMS ser escolhido — ver **DT-01** (secao 0) para o requisito literal do PRD e o plano de migracao.

**D-02 — Numero do cartao NUNCA persiste no banco (compliance PCI).**
Apenas `CardToken.asaasCardToken` (token opaco do Asaas) e salvo. Os campos `creditCard.number`, `creditCard.ccv`, `creditCard.expiryYear` trafegam so da UI para o servidor e deste para o Asaas — descartados imediatamente. A UI exibe apenas `CardToken.last4`.

**D-03 — QR PIX buscado on-demand, nao cacheado.**
`GET /payments/{id}/pixQrCode` e chamado quando o responsavel abre a tela de pagamento. O QR expira e nao faz sentido persistir. Cache de no maximo 5 minutos no servidor (Redis ou in-memory) e aceitavel para reduzir latencia se o responsavel atualizar a tela.

**D-04 — "Ja paguei" nao altera estado imediato.**
Clicar "Ja paguei" apenas exibe mensagem de aguardo. O estado real muda apenas quando o webhook PAYMENT_RECEIVED (fluxo 03) processa. Isso previne inconsistencia entre o estado do portal e o Asaas.

**D-05 — Descricao da cobrança vem do sistema, nao do responsavel.**
O portal exibe `Subject.name + " — " + referenceMonth`. O responsavel nao edita nenhum dado financeiro.

**D-06 — NFS-e servida via proxy, nunca URL direta do Asaas.**
A URL do Asaas (AsaasInvoice.pdfUrl) e servida via rota interna `/api/portal/invoices/{id}/nfse` que valida a sessao do responsavel antes de redirecionar ou baixar o PDF. Previne acesso anonimo a nota fiscal.

**D-07 — Taxa de cartao (2,99%) e da escola para o responsavel, nao da IX.**
A IX nao cobra a taxa — a escola decide repassar ou absorver via `BillingConfig.cardFeePayer`. O aviso exibido ao responsavel e informativo apenas.

**D-08 (ex-P-01) — Nome do aluno: Student.name via fluxo 02, com fallback Guardian.name.**
Student existe como model (criado pelo fluxo 02 — matricula). A saudacao da home usa `Student.name`, descriptografado no service (PII), quando disponivel; se `Student.name` nao existir para a Enrollment consultada, cair para `Guardian.name`. Nao adicionar campo `studentName` na Enrollment — o dado vive em Student.

**D-09 (ex-P-02) — Geracao do link magico: automatica na Invoice + reenvio manual.**
`PortalSession` e criado automaticamente pelo servico que emite a Invoice (cron/fluxo 03), incluido na notificacao enviada ao responsavel. Adicionalmente, a tela do aluno/matricula no painel da escola ganha um botao "Reenviar link do portal" que gera uma nova `PortalSession` sob demanda (uso manual, ex: responsavel perdeu o link ou o link expirou).

**D-10 (ex-P-03) — Remover cartao: soft-delete local, token Asaas permanece.**
`CardToken.isActive = false` e a unica acao ao remover cartao. Nenhuma chamada ao Asaas para invalidar o token — o token continua valido do lado do Asaas, mas o cron de cobranca (fluxo 03) NAO usa CardTokens com `isActive = false`. Reativacao (se necessaria no futuro) exigiria nova tokenizacao — fora de escopo desta spec.

**D-11 (ex-P-04) — Pagamento de Invoice OVERDUE: PIX apenas nesta versao.**
A tela `overdue` oferece exclusivamente PIX (com breakdown de multa/juros). Pagamento de boleto vencido via cartao cadastrado fica fora do escopo do MVP — melhoria futura, exigiria nova Invoice com billingType CREDIT_CARD e valor atualizado.

**D-12 (ex-P-05) — QR PIX expirado: erro tratado graciosamente, reemissao fora de escopo.**
Se `GET /payments/{id}/pixQrCode` retornar erro (cobrança expirada no Asaas), a tela `pay` exibe "Cobrança expirada — contate a escola" no lugar do QR (RN atualizada na tela pay, secao 8). A reemissao automatica da cobrança fica no fluxo 03 — nao implementada nesta spec.

**D-13 (ex-P-06) — Notificacoes: somente in-app, derivadas em runtime.**
Sem push nativo nesta versao. O centro de notificacoes (tela `notif`) e populado em runtime a partir do estado atual de Invoices e Dunnings do Guardian — nao ha tabela de notificacoes persistida. Push Web (service worker) permanece melhoria futura.

**D-14 (ex-P-07) — Payload de pixQrCode: verificar no sandbox antes da Fatia 3.**
Os campos `encodedImage`, `payload`, `expirationDate` (secao 2a/5c desta spec) sao os documentados nas versoes mais recentes conhecidas da API Asaas v3, mas as URLs de doc retornaram 404 durante a pesquisa. Antes de iniciar a Fatia 3, validar a resposta real do endpoint no sandbox Asaas e ajustar `src/lib/integration/asaas/types.ts` se os campos divergirem.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de ate 400 linhas. WIP = 1 por vez.

### Fatia 1 — Schema: CardToken + PortalSession + migration

**Objetivo:** criar os 2 novos models no Prisma e aplicar a migration.

**Scope in:**
- `prisma/schema.prisma`: model `CardToken`, model `PortalSession`, relacoes em `Guardian` e `Unit`.
- `prisma/migrations/`: migration `add-card-token-portal-session`.
- `pnpm prisma generate`.

**Nao inclui:** nenhum servico, rota ou UI.

**Resolvido (D-08):** Student ja existe como model via fluxo 02 (matricula) — nao afeta o schema desta fatia. CardToken e PortalSession seguem como planejados.

**DoD:**
```bash
pnpm prisma migrate dev --name add-card-token-portal-session && pnpm typecheck
grep -E "model CardToken|model PortalSession" prisma/schema.prisma | wc -l | grep -q "^2$"
```

---

### Fatia 2 — Auth do portal: magic link + PortalSession

**Objetivo:** gerar link magico, validar token, emitir cookie de sessao.

**Scope in:**
- `src/lib/services/portal-auth.service.ts` (novo): `createPortalSession(guardianId, unitId)`, `validatePortalToken(token)`, `issueSessionCookie(res, guardianId, unitId)`.
- `src/app/api/portal/auth/route.ts` (novo): `GET /api/portal/auth?token={t}` — valida PortalSession, emite cookie HTTP-only, redireciona para `/portal`.
- JWT estateless com `guardianId + unitId + exp` no cookie (sem consulta de banco por request subsequente).
- `src/middleware.ts`: proteger rotas `/portal/*` com validacao do cookie.

**Nao inclui:** UI do portal, envio por WhatsApp (fluxo 03 chama `createPortalSession` mas a integracao com o envio da notificacao e do fluxo 03).

**Resolvido (D-09):** `createPortalSession` e chamado automaticamente pelo servico que emite a Invoice (fluxo 03) — o link entra na notificacao. Adicionar tambem endpoint/acao "Reenviar link do portal" reutilizando `createPortalSession` para uso manual pela escola.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/lib/services/portal-auth.service.test.ts
pnpm dlx playwright test portal-auth --reporter=line
# cenario 1: token valido -> redireciona para /portal com cookie
# cenario 2: token expirado -> tela de erro generica "Link invalido ou expirado — contate a escola" (RN-01a)
# cenario 3: token ja usado -> mesma tela de erro generica (RN-01a)
# cenario 4: token inexistente -> mesma tela de erro generica, sem diferenca observavel (RN-01a)
```

---

### Fatia 3 — API: dados do portal (Invoices + Dunnings + CardToken)

**Objetivo:** endpoints de leitura para o portal — sem autenticacao Clerk, com validacao de cookie de sessao.

**Scope in:**
- `src/app/api/portal/overview/route.ts` (novo): retorna `{ guardian, unit, invoices[], activeCardToken?, activeNotifs[] }`. Filtra por `guardianId + unitId` do cookie.
- `src/app/api/portal/invoices/[id]/pix/route.ts` (novo): chama `GET /payments/{asaasPaymentId}/pixQrCode` no Asaas; retorna `{ encodedImage, payload, expirationDate }`; retorna erro tratavel se o Asaas responder com erro (QR expirado — D-12).
- `src/app/api/portal/invoices/[id]/nfse/route.ts` (novo): proxy seguro para `AsaasInvoice.pdfUrl`; valida sessao antes de redirecionar; so exposto se NFS-e (P1) estiver ativa (RN-13).
- `src/app/api/portal/history/route.ts` (novo, RN-12b): retorna Invoices `status = PAID` com `paidAt >= now() - 12 meses`, ordenadas por `paidAt` desc.
- Calculo do valor atualizado de Invoices OVERDUE (multa + juros) centralizado no servico.

**Nao inclui:** tokenizacao de cartao, UI.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/app/api/portal
# testar isolamento de unitId: responsavel A nao ve invoices da Unit B
# testar historico: Invoice PAID ha 13 meses NAO aparece no resultado
```

---

### Fatia 4 — Servico de tokenizacao de cartao (PCI)

**Objetivo:** tokenizar cartao no Asaas, salvar CardToken, cobrar com token.

**Scope in:**
- `src/lib/services/card-token.service.ts` (novo): `tokenizeCard(guardianId, unitId, cardData, remoteIp)` — chama POST /creditCard/tokenizeCreditCard; persiste CardToken; nunca loga `creditCard.*`.
- `src/lib/services/card-token.service.ts`: `chargeWithToken(invoiceId, cardTokenId, remoteIp)` — monta POST /payments com `creditCardToken`; atualiza Invoice.
- `src/app/api/portal/card-tokens/route.ts` (novo): `POST` (criar), `DELETE` (isActive = false).
- Adicionar tipos Asaas em `types.ts`: `AsaasTokenizeCardPayload`, `AsaasTokenizeCardResponse`.
- Testes unitarios com mock.

**Nao inclui:** UI do formulario de cartao.

**DoD:**
```bash
pnpm test:run src/lib/services/card-token.service.test.ts
# cenario PCI: verificar que banco nao tem numero completo apos tokenizacao
```

---

### Fatia 5 — UI: portal completo (6 telas)

**Objetivo:** implementar as telas do portal conforme design `screens-e.jsx` + tela historico (RN-12b).

**Scope in:**
- `src/app/portal/page.tsx` (home): saudacao (Student.name com fallback Guardian.name — D-08), banner risco, proxima cobrança, cartao, link para historico.
- `src/app/portal/pay/[id]/page.tsx`: QR PIX + copia-e-cola + "Ja paguei" + tratamento de QR expirado (D-12).
- `src/app/portal/overdue/[id]/page.tsx`: valor atualizado + breakdown + CTA (PIX apenas — D-11).
- `src/app/portal/card/page.tsx`: formulario de cartao + checkbox de aceite + aviso taxa.
- `src/app/portal/historico/page.tsx` (NOVO, RN-12b): lista de Invoices PAID dos ultimos 12 meses, badge verde, NF quando aplicavel.
- `src/app/portal/notifications/page.tsx`: centro de notificacoes (in-app apenas — D-13).
- Componentes: `PortalLayout`, `InvoiceCard` (badges 4 cores — RN-12a), `PendingBanner`, `CardTokenWidget`, `QrPayView`, `OverdueBreakdown`, `HistoryList`.
- Mobile-first 375px; Alfabeto DS; atencao a first-load JS (RN-16).

**Nao inclui:** envio de notificacoes push.

**DoD:**
```bash
pnpm typecheck && pnpm dlx playwright test portal --reporter=line --project=mobile
# todos os 6 cenarios do sec 9
pnpm build
# conferir "First Load JS" da rota /portal < 200 kB no output do build (RN-16)
```

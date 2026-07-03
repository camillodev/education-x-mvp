# Spec — Portal do Responsavel (mobile)

> **Status:** rascunho (2026-06-19)
> **Fonte de verdade:** `prisma/schema.prisma` + `src/lib/integration/asaas/types.ts` + doc Asaas v3 (POST /payments CREDIT_CARD, POST /creditCard/tokenizeCreditCard, GET /payments/{id}/pixQrCode) + prototipo (`screens-e.jsx?v=9`) + spec fluxo 03 (cobranca-automatica) + spec fluxo 05 (negativacao).
> **DS:** Alfabeto.

---

## 1. Objetivo

Dar ao responsavel (pai/mae/guardiao) um canal proprio — acessado por link autenticado, sem cadastro — para ver cobranças, pagar via PIX, quitar boletos vencidos com valor atualizado, cadastrar cartao para debito automatico e baixar NFS-e. E o unico ponto de contato financeiro do responsavel com a escola.

**DoD (Rafa):** responsavel consegue abrir o link do portal, ver a proxima cobrança, pagar via PIX (QR + copia-e-cola), quitar boleto vencido (com breakdown multa 2% + juros 1% a.m.), cadastrar cartao (token PCI-safe, aviso 2,99%), baixar PDF da NFS-e de cobranças pagas e ver centro de notificacoes. Playwright E2E em mobile breakpoint 375px cobrindo os 5 fluxos.

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
| Dunning (fluxo 05) | Dunning | Se NEGATIVADO, exibir banner de risco |
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
| Dunning.status | Dunning (fluxo 05) | Sim (banner de risco) | existe (fluxo 05 criou) | n/a | Sim (banner vermelho home) | Buscar Dunning por invoiceId das invoices do guardian |
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

**RN-12:** WHEN Dunning.status = NEGATIVADO para qualquer Invoice do Guardian THEN o sistema SHALL exibir banner vermelho "Risco de negativacao" na home com CTA "Quitar e regularizar".

**RN-13:** WHEN responsavel baixa NFS-e THEN o sistema SHALL:
  1. Verificar que Invoice.status = PAID e que ha um AsaasInvoice.pdfUrl associado
  2. Redirecionar ou servir o PDF via proxy (nunca expor a URL do Asaas diretamente ao cliente — previne acesso direto sem autenticacao)
  3. Se pdfUrl nulo: exibir "Nota fiscal em processamento"

**RN-14:** WHEN link do portal e gerado THEN o sistema SHALL definir `PortalSession.expiresAt = now() + 7 dias`; apos autenticacao, a sessao dura 24 horas (cookie HTTP-only).

**RN-15:** WHEN Guardian nao tem `asaasCustomerId` THEN o sistema SHALL ocultar opcao de pagamento com cartao e exibir aviso "Cadastro incompleto — contate a escola".

---

## 7. Estados e transicoes

### Invoice no portal (subconjunto do InvoiceStatus do fluxo 03)

```
PENDING      -> exibe botao "Pagar agora" (PIX QR)
               -> se BillingConfig.acceptsCard = true e CartaoAtivo: cobra no cartao automaticamente
OVERDUE      -> exibe tela "Quitar boleto vencido" com valor atualizado + breakdown
               -> se Dunning.status = NEGATIVADO: banner vermelho de risco
PAID         -> historico; se AsaasInvoice.pdfUrl existe: botao "Baixar NF"
CANCELLED    -> exibir "Cancelada" (informativo apenas)
BLOCKED      -> exibir "Pendente de cadastro — contate a escola"
ERROR        -> exibir "Problema na emissao — contate a escola"
```

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
Telas: `home`, `pay`, `overdue`, `card`, `cardOk`, `detail`, `notif`, `success`.

O design e referencia de UX. Os campos derivam do piso Asaas (sec 2), nao do design.

### Tela home

- Header azul: logo + icone de sino (badge com contagem de notificacoes nao lidas) + avatar com iniciais do responsavel.
- Saudacao: "Ola, {Guardian.name}" + "{Student.name} · {Unit.name}".
- **Banner de risco** (se Dunning.status = NEGATIVADO): card vermelho "Risco de negativacao — Mensalidade de {mes} vencida ha N dias. Regularize ate {data} para evitar SPC/Serasa." + CTA "Quitar e regularizar".
- **Proxima cobrança**: card com valor da proximo Invoice.status = PENDING, descricao, data de vencimento, badge "A vencer" + botao "Pagar agora".
- **Cartao**: card de pagamento automatico — se CardToken ativo: "•••• {last4} · Pagamento automatico ativo" + botao "Remover"; se sem cartao: "Cadastrar cartao".
- **Historico**: lista de todas as Invoices (PAID, OVERDUE, PAID) em cards — icone de status colorido, descricao, valor, data, link "NF disponivel" se PAID e pdfUrl existe.

### Tela pay (PIX)

- Valor em destaque (para Invoice vencida: valor atualizado).
- QR Code gerado de `GET /payments/{id}/pixQrCode` (encodedImage).
- Botao "Copiar codigo PIX" — copia `payload` para o clipboard, icone muda para check.
- Botao "Ja paguei" — exibe "Confirmando..." (aguarda webhook; nao altera estado local).
- Texto: "A confirmacao e automatica em segundos."

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

- Valor + descricao + badge de status.
- Metadados: Forma (Boleto/PIX), Pago em ou Vence em, ID interno (#INV-XXXX).
- Se PAID: card com "Nota fiscal n° {number}" + botao "PDF" (download NFS-e).
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
```

Playwright E2E deve cobrir (viewport 375x812):

1. **home com Invoice PENDING:** responsavel abre portal via token valido; ve proxima cobrança; clica "Pagar agora"; QR PIX exibe; clica "Copiar codigo PIX"; clipboard tem o payload.
2. **home com Invoice OVERDUE + Dunning NEGATIVADO:** banner vermelho visivel; clica "Quitar e regularizar"; tela overdue exibe breakdown correto (valor + multa 2% + juros pro rata); CTA "Pagar com PIX" abre tela pay.
3. **cadastrar cartao:** clica "Cadastrar cartao"; preenche formulario; aceita checkbox; clica "Salvar cartao"; tela cardOk exibe "•••• 4242"; home exibe "Pagamento automatico ativo".
4. **download NFS-e:** historico exibe Invoice PAID com "NF disponivel"; clica "PDF"; request de download e acionado (nao testa conteudo do PDF, apenas o status 200 da rota de proxy).
5. **link expirado:** acessar `/portal?token=expirado` retorna tela de erro "Link expirado" sem expor dados.
6. **CardToken PCI:** verificar que banco NAO contem numero completo do cartao (`SELECT * FROM card_tokens WHERE last4 = '4242'` deve ter apenas token, last4, brand — nunca coluna "number" ou "ccv").

---

## 10. Decisoes fechadas

**D-01 — Auth do portal: link magico (magic link), sem Clerk.**
O responsavel nao tem conta Clerk. O acesso e via link unico enviado por WhatsApp/e-mail gerado pela escola ou automaticamente (ex: ao emitir Invoice). O link contem `?token={uuid}` que e validado contra `PortalSession`. Apos autenticacao, o servidor emite um cookie HTTP-only com JWT curto (24h). Clerk NAO e usado neste fluxo.
_Motivo: responsavel nao pode ser obrigado a criar conta; link direto remove friccao e e padrao de mercado (Asaas, iFood, etc.)._

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

---

## 11. Pendencias

**P-01 — Student: o portal exibe "Joao Silva · Kumon Camargos" mas Student nao existe como model.**
O design usa o nome do aluno na saudacao (home) e na descricao das cobranças. A spec fluxo 03 registrou P-03 (Student nao existe). Resolucao dependente de fluxo 02 (matricula). Por ora: usar Guardian.name como fallback; adicionar `studentName` como campo opcional na Enrollment se necessario.

**P-02 — Geracao do link magico: quem gera e quando?**
O `PortalSession` precisa ser criado em algum ponto. Opcoes: (a) gerado automaticamente ao emitir a Invoice (cron do fluxo 03 cria o link e envia por WhatsApp/e-mail); (b) gerado manualmente pela escola via tela de cobrancas. Definir antes da Fatia 2. Recomendacao: (a) para autoBilling, (b) para manual.

**P-03 — Remover CartaoToken no Asaas.**
`CardToken.isActive = false` nao cancela o token no Asaas. Se o responsavel remover o cartao e o cron tentar cobrar no proximo mes, o token ainda funciona. Definir se a escola pode reativar o cartao (usar o token novamente) ou se deve criar um novo token. Por ora: isActive = false bloqueia o uso pelo cron; token permanece no Asaas.

**P-04 — Pagamento com cartao em boletos OVERDUE.**
A tela `overdue` no design so oferece PIX. O design NAO mostra a opcao de pagar boleto vencido com o cartao cadastrado. Definir se a IX quer suportar quitar boleto vencido com cartao (precisaria de nova Invoice com billingType CREDIT_CARD e valor atualizado). Por ora: OVERDUE = PIX apenas. Marcar como melhoria futura.

**P-05 — Expiracao do QR PIX vs boleto vencido.**
Para Invoice OVERDUE, o `asaasPaymentId` original pode ter expirado no Asaas. O `GET /pixQrCode` retornaria erro. Resolucao: verificar `expirationDate` do QR antes de exibir; se expirado, reemitir a cobrança no Asaas (requer nova logica no fluxo 03). Tratar o caso de erro graciosamente: "PIX expirado — entre em contato com a escola."

**P-06 — Notificacoes push vs in-app.**
O design mostra um centro de notificacoes (sino). As notificacoes sao exibidas dentro do portal mas nao ha push nativo (responsavel precisa abrir o link para ver). Push Web (service worker) seria uma melhoria futura. Por ora: notificacoes in-app apenas, geradas em runtime a partir do estado das Invoices e Dunnings.

**P-07 — campos pixQrCode no sandbox Asaas.**
As URLs da doc Asaas para o endpoint de QR PIX retornaram 404. Os campos `encodedImage`, `payload` e `expirationDate` sao os campos padrao documentados em versoes anteriores da API Asaas. Verificar no sandbox antes de implementar a Fatia 3. Ajustar tipos em `src/lib/integration/asaas/types.ts` conforme resposta real.

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

**Pendencia antes de iniciar:** confirmar se P-01 (Student) afeta o schema desta fatia.

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

**Nao inclui:** UI do portal, geracao automatica do link (fluxo 03), envio por WhatsApp.

**Pendencia antes de iniciar:** definir P-02 (quem gera o link e quando).

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/lib/services/portal-auth.service.test.ts
pnpm dlx playwright test portal-auth --reporter=line
# cenario 1: token valido -> redireciona para /portal com cookie
# cenario 2: token expirado -> tela de erro
# cenario 3: token ja usado -> tela de erro
```

---

### Fatia 3 — API: dados do portal (Invoices + Dunnings + CardToken)

**Objetivo:** endpoints de leitura para o portal — sem autenticacao Clerk, com validacao de cookie de sessao.

**Scope in:**
- `src/app/api/portal/overview/route.ts` (novo): retorna `{ guardian, unit, invoices[], activeCardToken?, activeNotifs[] }`. Filtra por `guardianId + unitId` do cookie.
- `src/app/api/portal/invoices/[id]/pix/route.ts` (novo): chama `GET /payments/{asaasPaymentId}/pixQrCode` no Asaas; retorna `{ encodedImage, payload, expirationDate }`.
- `src/app/api/portal/invoices/[id]/nfse/route.ts` (novo): proxy seguro para `AsaasInvoice.pdfUrl`; valida sessao antes de redirecionar.
- Calculo do valor atualizado de Invoices OVERDUE (multa + juros) centralizado no servico.

**Nao inclui:** tokenizacao de cartao, UI.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/app/api/portal
# testar isolamento de unitId: responsavel A nao ve invoices da Unit B
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

### Fatia 5 — UI: portal completo (5 telas)

**Objetivo:** implementar as telas do portal conforme design `screens-e.jsx`.

**Scope in:**
- `src/app/portal/page.tsx` (home): saudacao, banner risco, proxima cobrança, cartao, historico.
- `src/app/portal/pay/[id]/page.tsx`: QR PIX + copia-e-cola + "Ja paguei".
- `src/app/portal/overdue/[id]/page.tsx`: valor atualizado + breakdown + CTA.
- `src/app/portal/card/page.tsx`: formulario de cartao + checkbox de aceite + aviso taxa.
- `src/app/portal/notifications/page.tsx`: centro de notificacoes.
- Componentes: `PortalLayout`, `InvoiceCard`, `PendingBanner`, `CardTokenWidget`, `QrPayView`, `OverdueBreakdown`.
- Mobile-first 375px; Alfabeto DS.

**Nao inclui:** fluxo de geracao do link (fluxo 03), envio de notificacoes push.

**DoD:**
```bash
pnpm typecheck && pnpm dlx playwright test portal --reporter=line --project=mobile
# todos os 6 cenarios do sec 9
```

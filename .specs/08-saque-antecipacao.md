# Spec — Saque e Antecipacao de Recebiveis

> **Status:** rascunho (2026-06-19)
> **Fonte de verdade:** doc oficial Asaas (POST /transfers, GET /anticipations/limits, POST /anticipations/simulate, POST /anticipations) + `prisma/schema.prisma` + prototipo (`screens-fin.jsx`).
> **DS:** Alfabeto.

---

## 1. Objetivo

Permitir que a escola transfira saldo disponivel para sua conta bancaria via PIX (saque) e antecipe recebiveis de cartao presos em D+X, recebendo o valor liquido na hora.

**DoD (Rafa):** a diretora entra em `/financeiro`, ve o saldo disponivel separado entre PIX/boleto (liberado) e cartao (a liberar), consegue transferir qualquer valor ate o limite disponivel para a conta PIX cadastrada da escola, e consegue selecionar recebiveis de cartao para antecipar com calculo transparente de taxa antes de confirmar. Nenhuma transferencia real acontece sem confirmacao explicita em modal. Sandbox primeiro, producao so com confirmacao do Rafa.

---

## 2. Dados necessarios (o coracao)

A pergunta-guia: quais dados sao necessarios para sacar e antecipar?

### 2a. Piso Asaas: POST /transfers (saque PIX)

Fonte: doc oficial Asaas + cliente tipado do projeto.

| Campo Asaas | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `transferType` | enum | Sim | `PIX` para saque instantaneo |
| `value` | number (reais) | Sim | Valor a transferir em reais (converter de centavos na borda) |
| `pixAddressKey` | string | Sim (PIX) | Chave PIX de destino (CNPJ da escola, e-mail, telefone ou chave aleatoria) |
| `pixAddressKeyType` | enum | Sim (PIX) | `CNPJ`, `EMAIL`, `PHONE`, `EVP` |
| `description` | string | Opcional | Descricao livre da transferencia |

**Alternativa TED (nao prioritaria agora):** requer `bankAccount` completo:
`bank`, `bankDigit`, `agency`, `account`, `accountDigit`, `accountType` (CHECKING ou SAVINGS).

**Restricao critica:** `value` nao pode ser superior ao saldo disponivel da subconta Asaas. Checar saldo antes via GET /finance/balance antes de exibir o modal.

**Resposta de sucesso (200):**
```json
{
  "id": "tra_xxxx",
  "type": "PIX",
  "status": "PENDING",
  "value": 1250.00,
  "transferFee": 0.0,
  "scheduleDate": "2026-06-19",
  "authorized": true
}
```

---

### 2b. Piso Asaas: antecipacao de recebiveis (3 chamadas)

**Passo 1: GET /anticipations/limits** — quanto posso antecipar?

Retorna:
| Campo | Tipo | Descricao |
|---|---|---|
| `limit` | number (reais) | Valor maximo que pode ser antecipado no periodo |
| `hasDocumentationRequired` | boolean | Se precisa enviar documentacao |

**Passo 2: POST /anticipations/simulate** — calcular taxa antes de confirmar

Payload:
| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `payment` | string | Sim (se avulso) | ID do payment Asaas a antecipar |
| `installment` | string | Sim (se parcelado) | ID do installment Asaas a antecipar |

Retorna por receivable:
| Campo | Tipo | Descricao |
|---|---|---|
| `payment` | string | ID do payment |
| `anticipationDate` | string | Data em que o dinheiro sera creditado (hoje) |
| `originalDate` | string | Data original de liberacao sem antecipacao |
| `daysAntecipated` | number | Dias antecipados (original - hoje) |
| `fee` | number (reais) | Taxa cobrada |
| `totalValue` | number (reais) | Valor bruto do receivable |
| `netValue` | number (reais) | Valor liquido apos taxa |
| `isDocumentationRequired` | boolean | Se precisa de documentacao para este item |

**Passo 3: POST /anticipations** — efetivar (so apos simulacao e confirmacao do usuario)

Payload:
| Campo | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `payment` | string | Sim (se avulso) | ID do payment a antecipar |
| `installment` | string | Sim (se parcelado) | ID do installment a antecipar |
| `documents` | file | Condicional | Notas fiscais ou contratos (quando `isDocumentationRequired = true`) |

Retorna:
| Campo | Tipo | Descricao |
|---|---|---|
| `id` | string | ID da antecipacao (`ant_xxxx`) |
| `status` | enum | `AWAITING_APPROVAL`, `APPROVED`, `DENIED` |
| `fee` | number | Taxa cobrada em reais |
| `netValue` | number | Valor liquido antecipado |
| `anticipationDate` | string | Data de credito |

---

### 2c. Negocio

| Dado | Origem | Para que serve |
|---|---|---|
| Saldo PIX/boleto disponivel | Asaas GET /finance/balance | Exibir no card e limitar o valor do saque |
| Saldo cartao a liberar | Asaas GET /finance/balance ou /payments com status CONFIRMED | Separar visualmente "disponivel agora" vs "a liberar" |
| Chave PIX da escola | `BankAccount.pixKey` (NOVO model) | Destino fixo do saque |
| Tipo da chave PIX | `BankAccount.pixKeyType` (NOVO) | Campo `pixAddressKeyType` no payload |
| Recebiveis elegíveis | Asaas GET /payments?status=CONFIRMED&billingType=CREDIT_CARD | Listar o que pode ser antecipado |
| Taxa de antecipacao | 1,99% a.m. proporcional aos dias (formula: `bruto * 0.0199 * dias/30`) | Exibido na simulacao antes de confirmar |

---

### 2d. Fiscal / LGPD

| Campo | Classificacao | Tratamento |
|---|---|---|
| `BankAccount.pixKey` | PII potencial (CPF/telefone) | AES-256-GCM se chave for CPF ou telefone; CNPJ e e-mail nao precisam de cripto |
| `Transfer.asaasId` | Financeiro operacional | Sem PII; apenas referencia de auditoria |
| `Anticipation.asaasId` | Financeiro operacional | Sem PII |
| Dados bancarios TED (futuro) | PII — agencia, conta, titular | AES-256-GCM se implementado |

---

### 2e. KYC / conta bancaria

A escola precisa ter uma conta bancaria cadastrada para receber saques. Hoje o schema nao tem esse model.

**Decisao proposta (ver secao 10, D-01):** criar model `BankAccount` separado (nao campos em Unit). Motivo: uma escola pode ter mais de uma conta no futuro, o model pode ser reutilizado por outros fluxos, e o encapsulamento de PII fica mais limpo.

---

## 3. Tabela de confronto

| Dado necessario | Origem | Obrigatorio | Prisma (existe?/falta?) | Campo Asaas | No design | Resolucao |
|---|---|---|---|---|---|---|
| Saldo disponivel (PIX/boleto) | Asaas GET /finance/balance | Sim | Nao armazenado — consulta em tempo real | `balance.availableValue` | Exibido no card principal como saldo total | Chamar na carga da pagina; sem cache (dinheiro real) |
| Saldo cartao a liberar | Asaas GET /finance/balance | Sim | Nao armazenado | `balance.notYetAvailableValue` ou via `/payments` cartao CONFIRMED | Nao separado no design — adicionar badge "PIX/boleto" vs "cartao D+X" | Exibir breakdown no card; a separacao e educacional |
| Chave PIX destino do saque | `BankAccount.pixKey` (NOVO) | Sim | Nao existe | `pixAddressKey` | Design mostra "Banco Inter Ag 0001 Conta ****-5521 CNPJ Kumon Camargos" hardcoded | Criar model BankAccount; vincular ao Unit; o modal de saque exibe somente leitura |
| Tipo da chave PIX | `BankAccount.pixKeyType` (NOVO) | Sim | Nao existe | `pixAddressKeyType` | Nao exibido | Campo obrigatorio no model |
| Valor do saque | Input do usuario (modal) | Sim | Nao persiste pre-confirmacao | `value` (reais) | Campo de valor pre-preenchido com saldo | Validar: `> 0` e `<= saldo disponivel`; converter centavos pra reais na borda |
| Recebiveis de cartao elegíveis | Asaas GET /payments?billingType=CREDIT_CARD&status=CONFIRMED | Sim | Nao armazenado — consulta em tempo real | `payment.id` (para /anticipations) | Lista de recebiveis com checkbox, valor bruto, dias, taxa | Consultar no momento de abrir o modal; mapear para lista de items selecionaveis |
| Taxa de antecipacao simulada | Calculado localmente (1,99% a.m. proporcional) + confirmado via POST /anticipations/simulate | Sim (mostrar antes de confirmar) | `Anticipation.feeCents` (NOVO) — persiste so apos confirmacao | `fee` (retornado pela simulate) | Exibido no resumo do modal: "Taxa Education X" + "Voce recebe hoje" | Chamar simulate ao selecionar items; exibir resultado antes do botao confirmar |
| ID da antecipacao Asaas | Retornado por POST /anticipations | Pos-confirmacao | `Anticipation.asaasId` (NOVO) | `id` do retorno | Nao exibido diretamente | Persiste no model Anticipation para auditoria e rastreio |
| Transfer ID Asaas | Retornado por POST /transfers | Pos-confirmacao | `Transfer.asaasId` (NOVO) | `id` do retorno | Nao exibido diretamente | Persiste no model Transfer para auditoria |

---

## 4. Deltas de schema

Models novos: `BankAccount`, `Transfer`, `Anticipation`.

```prisma
// ─── Financeiro: saque e antecipacao ─────────────────────────────────────────

enum PixKeyType {
  CNPJ
  CPF
  EMAIL
  PHONE
  EVP // chave aleatoria
}

enum TransferStatus {
  PENDING     // criada, aguardando processamento
  DONE        // confirmada pelo Asaas (TRANSFER_DONE webhook)
  FAILED      // rejeitada ou estornada
  CANCELLED   // cancelada antes de processar
}

enum AnticipationStatus {
  PENDING           // simulada, aguardando acao do usuario
  AWAITING_APPROVAL // enviada ao Asaas, aguardando aprovacao interna
  APPROVED          // aprovada, credito realizado
  DENIED            // recusada pelo Asaas
  ERROR             // falha na chamada POST /anticipations
}

// Conta bancaria da escola (destino de saques)
// Um Unit pode ter multiplas contas, mas so uma e a padrao por vez.
model BankAccount {
  id     String @id @default(cuid())
  unitId String

  bankName    String          // "Banco Inter", "Bradesco" etc — descricao humana
  bankCode    String?         // codigo COMPE (ex: "077" = Inter) — necessario para TED
  agency      String?         // agencia sem digito
  accountNumber String?       // conta sem digito
  accountDigit  String?       // digito da conta
  accountType   String?       // "CHECKING" ou "SAVINGS"

  // PIX (caminho primario para saque)
  pixKey      String          // valor da chave (CNPJ, e-mail, telefone, EVP)
  pixKeyType  PixKeyType      // tipo da chave (necessario para o payload Asaas)
  pixKeyEnc   String?         // AES-256-GCM se pixKeyType = CPF ou PHONE

  isDefault   Boolean @default(true) // conta padrao para saques

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit      Unit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  transfers Transfer[]

  @@index([unitId])
  @@map("bank_accounts")
}

// Registro de cada saque PIX executado
model Transfer {
  id            String @id @default(cuid())
  unitId        String
  bankAccountId String

  // Valores em centavos (regra do produto)
  amountCents   Int            // valor transferido
  feeCents      Int @default(0) // taxa do Asaas (geralmente zero para PIX)

  status        TransferStatus @default(PENDING)
  asaasId       String?        // "tra_xxxx" retornado pelo Asaas
  asaasStatus   String?        // status raw do Asaas para auditoria

  scheduledDate DateTime?      // data agendada (se transferencia agendada)
  confirmedAt   DateTime?      // quando TRANSFER_DONE chegou via webhook

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit        Unit        @relation(fields: [unitId], references: [id], onDelete: Cascade)
  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id])

  @@index([unitId])
  @@map("transfers")
}

// Registro de cada operacao de antecipacao de recebiveis
model Anticipation {
  id     String @id @default(cuid())
  unitId String

  // Lista dos payment IDs Asaas antecipados (JSON array)
  asaasPaymentIds Json           // ["pay_aaa", "pay_bbb"]

  // Valores em centavos
  grossAmountCents Int           // soma dos valores brutos antecipados
  feeCents         Int           // taxa total cobrada
  netAmountCents   Int           // grossAmount - fee (o que cai na conta)

  status      AnticipationStatus @default(PENDING)
  asaasId     String?            // "ant_xxxx" retornado pelo POST /anticipations

  anticipatedAt DateTime?        // data de credito (anticipationDate do Asaas)
  confirmedAt   DateTime?        // quando ANTICIPATION_APPROVED chegou via webhook

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit Unit @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@map("anticipations")
}
```

**Relacoes a adicionar em Unit:**

```prisma
// Em Unit: adicionar
bankAccounts  BankAccount[]
transfers     Transfer[]
anticipations Anticipation[]
```

**Nota sobre `Unit.asaasWalletId`:** ja existe no schema. E o identificador da subconta para consultas de saldo (`GET /finance/balance`). Nao muda.

---

## 5. Contratos Asaas

Todos os endpoints usam a API key da subconta (`Unit.asaasApiKeyEnc` descriptografada). Nunca a master key.

### 5a. GET /finance/balance (saldo disponivel)

```
GET https://sandbox.asaas.com/api/v3/finance/balance
Header: access_token: <subconta-apiKey>
```

Retorno relevante:
```json
{
  "balance": 1250.00,
  "availableValue": 980.00,
  "notYetAvailableValue": 270.00
}
```

- `availableValue`: liberado para saque agora (PIX/boleto recebidos).
- `notYetAvailableValue`: cartao em D+X, ainda nao liberado.
- Converter para centavos ao receber: `* 100`.
- Chamar na carga de `/financeiro` e ao abrir modal de saque (para ter o valor mais atual).

---

### 5b. POST /transfers (saque PIX)

```
POST https://sandbox.asaas.com/api/v3/transfers
Header: access_token: <subconta-apiKey>
Content-Type: application/json
```

```json
{
  "transferType": "PIX",
  "value": 980.00,
  "pixAddressKey": "12345678000195",
  "pixAddressKeyType": "CNPJ",
  "description": "Saque Education X — Kumon Camargos"
}
```

Conversao de borda:
- `value`: `Transfer.amountCents / 100` (ex: 98000 centavos -> 980.00 reais).
- `pixAddressKey`: descriptografar `BankAccount.pixKeyEnc` se `pixKeyType = CPF ou PHONE`; caso contrario, usar `pixKey` diretamente.

Resposta de sucesso:
```json
{
  "id": "tra_abc123",
  "type": "PIX",
  "status": "PENDING",
  "value": 980.00,
  "transferFee": 0.0,
  "scheduleDate": "2026-06-19",
  "authorized": true
}
```

Salvar: `Transfer.asaasId = response.id`, `Transfer.status = PENDING`, `Transfer.asaasStatus = response.status`.

---

### 5c. GET /anticipations/limits (limite disponivel)

```
GET https://sandbox.asaas.com/api/v3/anticipations/limits
Header: access_token: <subconta-apiKey>
```

Retorno:
```json
{
  "limit": 5000.00,
  "hasDocumentationRequired": false
}
```

Chamar ao abrir o modal de antecipacao para saber o teto.

---

### 5d. POST /anticipations/simulate (calcular taxa)

```
POST https://sandbox.asaas.com/api/v3/anticipations/simulate
Header: access_token: <subconta-apiKey>
Content-Type: application/json
```

```json
{
  "payment": "pay_xxx"
}
```

Chamar uma vez por item selecionado (ou em lote se a API suportar).

Retorno por item:
```json
{
  "payment": "pay_xxx",
  "anticipationDate": "2026-06-19",
  "originalDate": "2026-07-04",
  "daysAntecipated": 15,
  "fee": 9.95,
  "totalValue": 500.00,
  "netValue": 490.05,
  "isDocumentationRequired": false
}
```

Conversao ao receber: `fee * 100`, `totalValue * 100`, `netValue * 100` para armazenar em centavos.

---

### 5e. POST /anticipations (efetivar — so apos confirmacao do usuario)

```
POST https://sandbox.asaas.com/api/v3/anticipations
Header: access_token: <subconta-apiKey>
Content-Type: application/json
```

```json
{
  "payment": "pay_xxx"
}
```

Retorno:
```json
{
  "id": "ant_abc123",
  "status": "AWAITING_APPROVAL",
  "fee": 9.95,
  "netValue": 490.05,
  "anticipationDate": "2026-06-19"
}
```

Salvar: `Anticipation.asaasId = response.id`, `Anticipation.status = AWAITING_APPROVAL`.

---

## 6. Regras de negocio (EARS)

**RN-01:** WHEN usuario abre `/financeiro` THEN o sistema SHALL buscar saldo via GET /finance/balance e separar `availableValue` (PIX/boleto, disponivel) de `notYetAvailableValue` (cartao, a liberar).

**RN-02:** WHEN usuario abre modal de saque THEN o sistema SHALL pre-preencher o campo valor com `availableValue` e nao permitir valor superior a esse limite.

**RN-03:** WHEN usuario confirma saque THEN o sistema SHALL chamar POST /transfers em sandbox, registrar Transfer com status PENDING e exibir confirmacao. Producao so com flag de ambiente e confirmacao do Rafa.

**RN-04:** WHEN `BankAccount` da Unit nao existe THEN o sistema SHALL bloquear o botao "Transferir para banco" com tooltip "Cadastre uma conta bancaria primeiro".

**RN-05:** WHEN usuario abre modal de antecipacao THEN o sistema SHALL chamar GET /anticipations/limits e listar recebiveis de cartao disponiveis (status CONFIRMED, billingType CREDIT_CARD).

**RN-06:** WHEN usuario seleciona ou deseleciona um recebivel THEN o sistema SHALL recalcular o resumo de taxa localmente usando a formula `bruto * 0.0199 * dias/30` (estimativa rapida para feedback instantaneo).

**RN-07:** WHEN usuario tenta confirmar antecipacao THEN o sistema SHALL chamar POST /anticipations/simulate para cada item selecionado, exibir os valores oficiais confirmados pela API (taxa real) e SO ENTAO liberar o botao "Antecipar".

**RN-08:** WHEN usuario confirma antecipacao THEN o sistema SHALL chamar POST /anticipations para cada item, registrar Anticipation com status AWAITING_APPROVAL e exibir toast "Antecipacao enviada para aprovacao".

**RN-09:** WHEN Asaas retorna erro em qualquer operacao (transfer ou anticipation) THEN o sistema SHALL registrar o erro, exibir mensagem clara ao usuario e nao deixar o registro com status de sucesso.

**RN-10:** IF `isDocumentationRequired = true` em qualquer item da simulacao THEN o sistema SHALL exibir aviso antes da confirmacao: "Este recebivel pode exigir documentacao adicional. O Asaas entrara em contato."

**RN-11:** WHEN webhook `TRANSFER_DONE` chega THEN o sistema SHALL atualizar `Transfer.status = DONE` e `Transfer.confirmedAt`.

**RN-12:** WHEN webhook `ANTICIPATION_APPROVED` chega THEN o sistema SHALL atualizar `Anticipation.status = APPROVED` e `Anticipation.anticipatedAt`.

**RN-13:** WHEN saldo Asaas consultado e zero THEN o sistema SHALL exibir card com saldo zerado e desabilitar o botao de saque (nao esconder — a tela deve existir mesmo sem saldo).

**RN-14:** WHEN nao ha recebiveis de cartao elegíveis THEN o sistema SHALL exibir estado vazio no modal de antecipacao: "Sem recebiveis de cartao para antecipar no momento."

---

## 7. Estados e transicoes

### Transfer

```
[usuario confirma saque]
          |
          v
       PENDING -------(Asaas retorna erro)-------> FAILED [terminal]
          |
          +---(webhook TRANSFER_DONE)-----------> DONE [terminal]
          |
          +---(cancelamento antes do PIX)-------> CANCELLED [terminal]
```

### Anticipation

```
[usuario confirma + POST /anticipations chamado]
          |
          v
  AWAITING_APPROVAL -------(ANTICIPATION_DENIED)-------> DENIED [terminal]
          |
          +---(ANTICIPATION_APPROVED)-----------> APPROVED [terminal]
          |
          +---(erro na chamada POST)------------> ERROR
```

**Nota:** status PENDING e usado internamente antes de chamar o Asaas (janela de retry). Assim que POST /anticipations retorna 200, muda para AWAITING_APPROVAL.

---

## 8. Fluxo de coleta (UX, referencia ao design)

**Fonte:** `screens-fin.jsx` — referencia UX, nao define campos.

### Tela principal `/financeiro`

Card de saldo azul primario com dois dados:
- Valor grande: saldo disponivel (PIX/boleto liberados).
- Badge secundario: "R$ XXX em cartao — libera em D+X" (baseado em `notYetAvailableValue`).

Dois botoes no card:
- "Transferir para banco" (brancos, solido) — abre modal de saque.
- "Antecipar recebiveis" (borda branca, ghost) — abre modal de antecipacao.

### Modal de saque

1. Titulo "Resgatar saldo" + subtitulo "Transferencia via PIX para a conta cadastrada da escola."
2. Campo valor (pre-preenchido com `availableValue`). Validacao em tempo real.
3. Card da conta de destino (somente leitura): nome do banco, agencia mascarada, conta mascarada, tipo da chave PIX, badge "PIX na hora".
4. Botoes: Cancelar + "Confirmar resgate".
5. Pos-confirmacao: toast de sucesso ou mensagem de erro inline.

### Modal de antecipacao

1. Cabecalho com icone "zap" + titulo "Antecipar recebiveis".
2. Subtitulo explicando a taxa (1,99% a.m. proporcional aos dias).
3. Lista de recebiveis selecionaveis (checkbox): descricao do pagamento, data de liberacao original, dias antecipados, taxa estimada, valor bruto.
4. Resumo fixo ao final da lista: "Valor bruto selecionado", "Taxa de antecipacao (Education X)", "Voce recebe hoje" (destacado).
5. Botoes: Cancelar + "Antecipar R$ XXX" (desabilitado se nenhum item selecionado).
6. Antes de confirmar: chamada a POST /anticipations/simulate para validar taxa oficial.
7. Pos-confirmacao: toast "Antecipacao enviada para aprovacao".

**Divergencia design vs regra de negocio (registrada):** o design calcula a taxa localmente (formula `bruto * 0.0199 * dias/30`) e confirma direto. A regra de negocio exige chamar POST /anticipations/simulate antes de confirmar para obter a taxa oficial da API. O botao "Antecipar" so e habilitado apos simulate retornar. Ver P-01.

---

## 9. Definition of Done (binario)

```bash
# 1. Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# 2. Migration com os 3 novos models
pnpm prisma migrate dev --name add-bank-account-transfer-anticipation && \
grep -E "model BankAccount|model Transfer|model Anticipation" prisma/schema.prisma | wc -l | grep -q "^3$"

# 3. Saque PIX: fluxo completo em sandbox
# - Abre /financeiro, ve saldo, abre modal, edita valor, confirma
# - Transfer registrada com status PENDING e asaasId preenchido
pnpm dlx playwright test financeiro-saque --reporter=line

# 4. Saque: valor acima do saldo e bloqueado
# - Campo invalido, botao desabilitado, sem chamada ao Asaas
pnpm dlx playwright test financeiro-saque-limite --reporter=line

# 5. Antecipacao: selecionar items, simular, confirmar
# - Simulate chamado antes do botao "Antecipar" ficar ativo
# - Anticipation registrada com status AWAITING_APPROVAL
pnpm dlx playwright test financeiro-antecipacao --reporter=line

# 6. Antecipacao: sem recebiveis disponiveis
# - Modal exibe estado vazio, sem erro de JS
pnpm dlx playwright test financeiro-antecipacao-vazia --reporter=line

# 7. Sem conta bancaria cadastrada
# - Botao "Transferir para banco" desabilitado com tooltip correto
pnpm dlx playwright test financeiro-sem-conta --reporter=line
```

Fluxo toca dinheiro real: DoD obrigatoriamente inclui Playwright E2E (itens 3-7). Nenhum teste passa executando contra producao — apenas sandbox.

---

## 10. Decisoes fechadas

**D-01 — BankAccount como model separado (nao campos em Unit).**
Motivo: uma escola pode ter mais de uma conta no futuro (ex: conta corrente PJ + PIX CNPJ). O model isolado permite adicionar `isDefault` e trocar a conta sem mexer em Unit. Campos TED opcionais no mesmo model.

**D-02 — Saque via PIX como unico caminho agora. TED e futuro.**
O design mostra "Banco Inter Ag 0001 Conta ****-5521" mas o fluxo prioritario e PIX (instantaneo, zero taxa). Os campos de TED (`bankCode`, `agency`, `account`, `accountDigit`, `accountType`) existem no model mas nao sao expostos na UI neste fluxo.

**D-03 — Calculo de taxa no modal e estimativa local; a confirmacao exige simulate.**
O usuario ve o calculo em tempo real ao selecionar items (formula local, instantaneo). Ao clicar "Antecipar", o sistema chama POST /anticipations/simulate e exibe os valores oficiais para confirmacao final. Nao confirmar com base so no calculo local.

**D-04 — Uma chamada POST /anticipations por payment ID.**
O Asaas aceita um payment ou installment por chamada. Se o usuario selecionar 3 recebiveis, sao 3 chamadas sequenciais. Registrar uma Anticipation com `asaasPaymentIds` como JSON array e `feeCents` somado.

**D-05 — Centavos no app, reais na borda Asaas.**
Mesma regra do resto do produto: `/ 100` ao enviar, `* 100` ao receber. Transfer.amountCents e Anticipation.feeCents sempre em centavos.

**D-06 — Sandbox primeiro, producao so com confirmacao explicita do Rafa.**
Regra global do projeto (`asaas.md`). Para saque e antecipacao, que movem dinheiro real, a regra e ainda mais estrita. O cliente Asaas usa a URL de sandbox por default.

**D-07 — unitId em todos os models novos.**
Multi-tenant: toda query filtrada por unitId da sessao Clerk.

---

## 11. Pendencias

**P-01 — Discrepancia design vs simulate:** o prototipo confirma a antecipacao sem chamar simulate (calcula so local). A spec exige simulate antes de confirmar. A UI precisa de um estado intermediario "Verificando taxa..." enquanto simulate processa. Definir loading state antes de implementar o modal.

**P-02 — Webhook TRANSFER_DONE e ANTICIPATION_APPROVED:** o projeto ainda nao tem handler para esses eventos no endpoint `/api/webhooks/asaas`. Precisam ser adicionados ao event bus (ver spec 03, secao 8). Essa fatia nao e bloqueante para o fluxo do usuario (Transfer e Anticipation ficam em PENDING/AWAITING_APPROVAL ate o webhook chegar), mas e obrigatoria para o DoD completo.

**P-03 — Cadastro da conta bancaria (BankAccount):** esta spec define o model mas nao inclui a tela de cadastro. A escola precisa cadastrar a conta antes de sacar. Opcoes: (a) tela separada em `/configuracoes/conta-bancaria`, (b) step adicional no onboarding (fluxo 01). Decidir antes da Fatia 1.

**P-04 — Lista de recebiveis elegíveis para antecipacao:** o Asaas retorna recebiveis via GET /payments com filtros. Precisa confirmar os filtros corretos (billingType, status) para listar so o que e antecipavel. Verificar na conta sandbox antes de implementar.

**P-05 — isDocumentationRequired:** se algum recebivel exigir documentacao, o fluxo atual nao tem UI para upload. Por ora, exibir aviso e deixar o usuario confirmar assim mesmo (o Asaas entrara em contato). Fluxo completo com upload de documentos fica como pendencia futura.

**P-06 — Extrato de operacoes:** o design menciona aba de extrato com movimentos (saque, antecipacao, recebimentos). Esta spec nao cobre a tela de extrato. Fora do escopo por ora.

**P-07 — Taxa de antecipacao como configuracao:** a taxa de 1,99% a.m. e exibida no modal como constante Education X. Se a taxa mudar ou variar por plano, precisara de configuracao. Por ora, constante hardcoded com comentario explicativo no codigo.

---

## 12. Fatiamento em Task Contracts

Cada fatia = 1 Task Contract = 1 PR de ate 400 linhas. WIP = 1 por vez.

---

### Fatia 1 — Migration: BankAccount + Transfer + Anticipation

**Objetivo:** criar os 3 models no Prisma com enums e relacoes.

**Scope in:**
- `prisma/schema.prisma`: adicionar enums `PixKeyType`, `TransferStatus`, `AnticipationStatus`; models `BankAccount`, `Transfer`, `Anticipation`; relacoes em `Unit`.
- `prisma/migrations/`: migration resultante.
- `pnpm prisma generate`.

**Nao inclui:** nenhum servico, rota ou UI.

**DoD:**
```bash
pnpm prisma migrate dev --name add-bank-account-transfer-anticipation && pnpm typecheck
```

**Pendencia a resolver antes:** P-03 (onde cadastrar BankAccount — decidir antes de criar a migration).

---

### Fatia 2 — Servico de saldo + saque (FinanceiroService)

**Objetivo:** implementar a consulta de saldo e a criacao de Transfer via Asaas.

**Scope in:**
- `src/lib/services/financeiro.service.ts` (novo): `getBalance(unitId)`, `createTransfer(unitId, amountCents)`.
- `getBalance`: descriptografa `Unit.asaasApiKeyEnc`, chama GET /finance/balance, retorna `{ availableCents, notYetAvailableCents }`.
- `createTransfer`: valida `amountCents <= availableCents`, chama POST /transfers, persiste Transfer.
- Testes unitarios com `AsaasMockClient`.

**Nao inclui:** webhook, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/financeiro.service.test.ts
```

---

### Fatia 3 — Servico de antecipacao (AntecipacaoService)

**Objetivo:** listar recebiveis elegíveis, simular e efetivar antecipacao.

**Scope in:**
- `src/lib/services/antecipacao.service.ts` (novo): `listElegiveis(unitId)`, `simulate(unitId, paymentIds[])`, `create(unitId, paymentIds[])`.
- `listElegiveis`: GET /payments com filtros de cartao CONFIRMED.
- `simulate`: POST /anticipations/simulate para cada id, retorna array com taxa oficial.
- `create`: POST /anticipations para cada id (sequencial), persiste Anticipation.
- Testes unitarios com mock.

**Nao inclui:** webhook, UI.

**DoD:**
```bash
pnpm test:run src/lib/services/antecipacao.service.test.ts
```

---

### Fatia 4 — Rotas de API

**Objetivo:** expor endpoints para o frontend.

**Scope in:**
- `src/app/api/financeiro/balance/route.ts`: GET, retorna saldo.
- `src/app/api/financeiro/transfers/route.ts`: POST, cria saque.
- `src/app/api/financeiro/anticipations/route.ts`: GET (list elegiveis), POST (simulate ou create conforme `?action=simulate|confirm`).
- Autenticacao Clerk em todas as rotas.
- unitId sempre da sessao (nunca do corpo da requisicao).

**Nao inclui:** webhook, UI.

**DoD:**
```bash
pnpm typecheck && pnpm test:run src/app/api/financeiro/
```

---

### Fatia 5 — UI: tela /financeiro + modal saque

**Objetivo:** implementar a pagina de saldo e o modal de saque.

**Scope in:**
- `src/app/(app)/financeiro/page.tsx`: card de saldo (disponivel + a liberar), botoes de acao.
- Modal de saque: campo valor, card de conta destino (somente leitura), botoes confirmar/cancelar.
- Validacao: valor <= saldo disponivel.
- Estados: loading, erro, sucesso (toast).
- Responsivo 375/768/1440, Alfabeto.

**Nao inclui:** modal de antecipacao, extrato, cadastro de conta bancaria.

**DoD:**
```bash
pnpm dlx playwright test financeiro-saque financeiro-saque-limite financeiro-sem-conta --reporter=line
```

---

### Fatia 6 — UI: modal antecipacao

**Objetivo:** implementar o modal de antecipacao com simulacao antes da confirmacao.

**Scope in:**
- Modal de antecipacao: lista de recebiveis selecionaveis, resumo (bruto, taxa, liquido), botao "Antecipar".
- Ao selecionar: calculo local instantaneo para feedback visual.
- Ao clicar "Antecipar": chamada a `/simulate`, exibir taxa oficial confirmada, so entao confirmar.
- Estado vazio quando nao ha recebiveis.
- Estados: loading simulate, erro, sucesso (toast).

**Nao inclui:** upload de documentos (P-05), extrato.

**DoD:**
```bash
pnpm dlx playwright test financeiro-antecipacao financeiro-antecipacao-vazia --reporter=line
```

---

### Fatia 7 — Webhooks: TRANSFER_DONE + ANTICIPATION_APPROVED

**Objetivo:** processar eventos Asaas para atualizar status de Transfer e Anticipation.

**Scope in:**
- Adicionar handlers em `src/app/api/webhooks/asaas/route.ts` (ja existe ou sera criado em spec 03):
  - `TRANSFER_DONE`: buscar Transfer por `asaasId`, atualizar `status = DONE` e `confirmedAt`.
  - `ANTICIPATION_APPROVED`: buscar Anticipation por `asaasId`, atualizar `status = APPROVED` e `anticipatedAt`.
  - `TRANSFER_FAILED` e `ANTICIPATION_DENIED`: status FAILED/DENIED respectivamente.
- Idempotencia: verificar se ja esta no status terminal antes de processar.

**DoD:**
```bash
pnpm dlx playwright test webhook-transfer webhook-anticipation --reporter=line
# cenario 1: TRANSFER_DONE -> Transfer DONE
# cenario 2: ANTICIPATION_APPROVED -> Anticipation APPROVED
# cenario 3: evento duplicado -> ignora (idempotente)
```

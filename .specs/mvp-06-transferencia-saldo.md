# Spec — Transferência de Saldo (Saque PIX)

> **Fase:** MVP · **Ordem:** 06
> **Status:** rascunho (Rafa + Claude, 2026-07-03). Fatiada de `08-saque-antecipacao` — parte MVP.
> **Fonte de verdade:** doc oficial Asaas (GET /finance/balance, POST /transfers) + `prisma/schema.prisma` + protótipo (`screens-fin.jsx`, só UX).
> **DS:** Alfabeto.
> **Par:** a antecipação de recebíveis (do mesmo fluxo original) vive em `f2-03-antecipacao-recebiveis` (Fase 2).

---

## 1. Objetivo

Permitir que a escola veja o saldo disponível e transfira via PIX para a conta bancária cadastrada da própria escola. **Já existe no Asaas** (POST /transfers) — o produto precisa do procedimento mínimo de a dona pagar/transferir o saldo pra si. Entra no MVP porque sem sacar o dinheiro, a operação financeira não fecha o ciclo.

**DoD (Rafa):** a diretora entra em `/financeiro`, vê o saldo disponível (PIX/boleto liberado) separado do que está a liberar (cartão), e transfere qualquer valor até o limite para a conta PIX cadastrada da escola. Nenhuma transferência real sem confirmação explícita em modal. Sandbox primeiro, produção só com confirmação do Rafa.

---

## 2. Dados necessários (o coração)

### 2a. Piso Asaas: POST /transfers (saque PIX)

| Campo Asaas | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `transferType` | enum | Sim | `PIX` para saque instantâneo |
| `value` | number (reais) | Sim | Valor a transferir em reais (converter de centavos na borda) |
| `pixAddressKey` | string | Sim (PIX) | Chave PIX de destino (CNPJ da escola, e-mail, telefone ou EVP) |
| `pixAddressKeyType` | enum | Sim (PIX) | `CNPJ`, `EMAIL`, `PHONE`, `EVP` |
| `description` | string | Opcional | Descrição livre da transferência |

**Alternativa TED (não prioritária):** requer `bankAccount` completo — campos existem no model mas não são expostos na UI (ver D-02).

**Restrição crítica:** `value` não pode ser superior ao saldo disponível. Checar via GET /finance/balance antes do modal.

### 2b. Negócio

| Dado | Origem | Para que serve |
|---|---|---|
| Saldo PIX/boleto disponível | Asaas GET /finance/balance (`availableValue`) | Card + limite do saque |
| Saldo cartão a liberar | Asaas GET /finance/balance (`notYetAvailableValue`) | Separar "disponível agora" vs "a liberar" (educacional) |
| Chave PIX da escola | `BankAccount.pixKey` (NOVO model) | Destino fixo do saque |
| Tipo da chave PIX | `BankAccount.pixKeyType` (NOVO) | Campo `pixAddressKeyType` no payload |

### 2d. Compliance / LGPD

| Campo | Classificação | Tratamento |
|---|---|---|
| `BankAccount.pixKey` | PII potencial (CPF/telefone) | AES-256-GCM (`pixKeyEnc`) se chave for CPF ou PHONE; CNPJ e e-mail não precisam |
| `Transfer.asaasId` | Financeiro operacional | Sem PII; referência de auditoria |

### 2e. KYC / conta bancária

A escola precisa de uma conta cadastrada para receber saques (ver D-01: model `BankAccount` separado, não campos em Unit).

---

## 3. Tabela de confronto

| Dado necessário | Origem | Obrigatório | Prisma | Campo Asaas | No design | Resolução |
|---|---|---|---|---|---|---|
| Saldo disponível (PIX/boleto) | GET /finance/balance | Sim | Não armazenado — tempo real | `availableValue` | Card principal | Chamar na carga; sem cache (dinheiro real) |
| Saldo cartão a liberar | GET /finance/balance | Sim | Não armazenado | `notYetAvailableValue` | Adicionar badge "cartão D+X" | Breakdown educacional no card |
| Chave PIX destino | `BankAccount.pixKey` (NOVO) | Sim | Falta | `pixAddressKey` | Design mostra conta hardcoded | Criar model; modal exibe só leitura |
| Tipo da chave PIX | `BankAccount.pixKeyType` (NOVO) | Sim | Falta | `pixAddressKeyType` | Não exibido | Campo obrigatório no model |
| Valor do saque | Input do modal | Sim | Não persiste pré-confirmação | `value` (reais) | Campo pré-preenchido | Validar `>0` e `<= disponível`; centavos→reais na borda |
| Transfer ID Asaas | POST /transfers | Pós-confirmação | `Transfer.asaasId` (NOVO) | `id` do retorno | Não exibido | Persiste para auditoria |

---

## 4. Deltas de schema

Models novos desta spec: `BankAccount`, `Transfer`. (O `Anticipation` fica na `f2-03`.)

```prisma
enum PixKeyType {
  CNPJ
  CPF
  EMAIL
  PHONE
  EVP // chave aleatória
}

enum TransferStatus {
  PENDING     // criada, aguardando processamento
  DONE        // confirmada pelo Asaas (TRANSFER_DONE webhook)
  FAILED      // rejeitada ou estornada
  CANCELLED   // cancelada antes de processar
}

// Conta bancária da escola (destino de saques)
model BankAccount {
  id     String @id @default(cuid())
  unitId String

  bankName      String   // "Banco Inter" — descrição humana
  bankCode      String?  // COMPE (TED futuro)
  agency        String?
  accountNumber String?
  accountDigit  String?
  accountType   String?  // "CHECKING" | "SAVINGS"

  pixKey     String     // valor da chave (CNPJ, e-mail, telefone, EVP)
  pixKeyType PixKeyType // tipo — necessário para o payload Asaas
  pixKeyEnc  String?    // AES-256-GCM se pixKeyType = CPF ou PHONE

  isDefault Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit      Unit       @relation(fields: [unitId], references: [id], onDelete: Cascade)
  transfers Transfer[]

  @@index([unitId])
  @@map("bank_accounts")
}

model Transfer {
  id            String @id @default(cuid())
  unitId        String
  bankAccountId String

  amountCents Int            // valor transferido (centavos)
  feeCents    Int @default(0) // taxa Asaas (geralmente zero para PIX)

  status      TransferStatus @default(PENDING)
  asaasId     String?        // "tra_xxxx"
  asaasStatus String?        // status raw do Asaas

  scheduledDate DateTime?
  confirmedAt   DateTime?    // quando TRANSFER_DONE chegou

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  unit        Unit        @relation(fields: [unitId], references: [id], onDelete: Cascade)
  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id])

  @@index([unitId])
  @@map("transfers")
}

// Em Unit: adicionar
// bankAccounts BankAccount[]
// transfers    Transfer[]
```

`Unit.asaasWalletId` já existe — é o identificador da subconta para `GET /finance/balance`. Não muda.

---

## 5. Contratos Asaas

Todos com a API key da subconta (`Unit.asaasApiKeyEnc` descriptografada). Nunca a master.

### 5a. GET /finance/balance
```
GET https://sandbox.asaas.com/api/v3/finance/balance
Header: access_token: <subconta-apiKey>
```
```json
{ "balance": 1250.00, "availableValue": 980.00, "notYetAvailableValue": 270.00 }
```
- `availableValue`: liberado para saque (PIX/boleto). `notYetAvailableValue`: cartão em D+X.
- Converter para centavos: `* 100`. Chamar na carga e ao abrir modal.

### 5b. POST /transfers
```json
{
  "transferType": "PIX",
  "value": 980.00,
  "pixAddressKey": "12345678000195",
  "pixAddressKeyType": "CNPJ",
  "description": "Saque Education X — Kumon Camargos"
}
```
Borda: `value = Transfer.amountCents / 100`; `pixAddressKey` descriptografa `pixKeyEnc` se CPF/PHONE.
Salvar: `Transfer.asaasId = response.id`, `status = PENDING`, `asaasStatus = response.status`.

---

## 6. Regras de negócio (EARS)

**RN-01:** WHEN usuário abre `/financeiro` THEN o sistema SHALL buscar saldo via GET /finance/balance e separar `availableValue` de `notYetAvailableValue`.
**RN-02:** WHEN usuário abre modal de saque THEN o sistema SHALL pré-preencher o valor com `availableValue` e não permitir valor superior.
**RN-03:** WHEN usuário confirma saque THEN o sistema SHALL chamar POST /transfers em sandbox, registrar Transfer PENDING e exibir confirmação. Produção só com flag + confirmação do Rafa.
**RN-04:** WHEN `BankAccount` da Unit não existe THEN o sistema SHALL bloquear "Transferir para banco" com tooltip "Cadastre uma conta bancária primeiro".
**RN-09:** WHEN Asaas retorna erro THEN o sistema SHALL registrar o erro, exibir mensagem clara e não deixar o registro com status de sucesso.
**RN-11:** WHEN webhook `TRANSFER_DONE` chega THEN o sistema SHALL atualizar `Transfer.status = DONE` e `confirmedAt`.
**RN-13:** WHEN saldo é zero THEN o sistema SHALL exibir card zerado e desabilitar o saque (não esconder — a tela existe mesmo sem saldo).

---

## 7. Estados e transições

```
[usuário confirma saque]
        v
     PENDING --(Asaas erro)--> FAILED [terminal]
        |--(webhook TRANSFER_DONE)--> DONE [terminal]
        |--(cancelamento antes do PIX)--> CANCELLED [terminal]
```

---

## 8. Fluxo de coleta (UX, referência ao design)

**Fonte:** `screens-fin.jsx` — referência, não fonte de campos.

### Tela `/financeiro`
Card de saldo azul: valor grande (disponível PIX/boleto) + badge "R$ XXX em cartão — libera em D+X". Botão "Transferir para banco" (sólido) abre o modal de saque. (O botão "Antecipar recebíveis" pertence à `f2-03`.)

### Modal de saque
1. "Resgatar saldo" + "Transferência via PIX para a conta cadastrada da escola."
2. Campo valor (pré-preenchido com `availableValue`), validação em tempo real.
3. Card da conta destino (só leitura): banco, agência/conta mascaradas, tipo da chave, badge "PIX na hora".
4. Cancelar + "Confirmar resgate".
5. Pós: toast sucesso ou erro inline.

---

## 9. Definition of Done (binário)

```bash
pnpm typecheck && pnpm test:run

# Migration com os 2 models desta spec
pnpm prisma migrate dev --name add-bank-account-transfer && \
grep -E "model BankAccount|model Transfer" prisma/schema.prisma | wc -l | grep -q "^2$"

# Saque PIX: fluxo completo em sandbox (Transfer PENDING + asaasId)
pnpm dlx playwright test financeiro-saque --reporter=line
# Valor acima do saldo bloqueado (botão off, sem chamada Asaas)
pnpm dlx playwright test financeiro-saque-limite --reporter=line
# Sem conta bancária: botão desabilitado com tooltip
pnpm dlx playwright test financeiro-sem-conta --reporter=line
```
Toca dinheiro real: DoD inclui Playwright E2E, só sandbox.

---

## 10. Decisões fechadas

- **D-01 — BankAccount como model separado** (não campos em Unit): permite múltiplas contas + `isDefault` + encapsula PII.
- **D-02 — Saque via PIX é o único caminho agora. TED é futuro** (campos existem, não expostos na UI).
- **D-05 — Centavos no app, reais na borda Asaas** (`/100` ao enviar, `*100` ao receber).
- **D-06 — Sandbox primeiro, produção só com confirmação do Rafa** (regra `asaas.md`, ainda mais estrita para dinheiro).
- **D-07 — unitId em todos os models novos** (multi-tenant via sessão Clerk).

---

## 11. Pendências

- **P-02 — Webhook TRANSFER_DONE:** handler ainda não existe em `/api/webhooks/asaas`. Não bloqueia o fluxo do usuário (Transfer fica PENDING até o webhook), mas é obrigatório para o DoD completo.
- **P-03 — Cadastro da conta bancária:** esta spec define o model mas não a tela de cadastro. Opções: (a) `/configuracoes/conta-bancaria`, (b) step no onboarding (`mvp-01`). Decidir antes da Fatia 1.

---

## 12. Fatiamento em Task Contracts

Fatias ≤400 linhas, WIP = 1.

### Fatia 1 — Migration: BankAccount + Transfer
**Objetivo:** criar os 2 models com enums e relações.
**Scope in:** `prisma/schema.prisma` (enums `PixKeyType`, `TransferStatus`; models; relações em Unit); migration; `pnpm prisma generate`.
**Não inclui:** serviço, rota, UI, Anticipation.
**DoD:** `pnpm prisma migrate dev --name add-bank-account-transfer && pnpm typecheck`
**Pendência antes:** P-03.

### Fatia 2 — FinanceiroService (saldo + saque)
**Objetivo:** consulta de saldo e criação de Transfer via Asaas.
**Scope in:** `src/lib/services/financeiro.service.ts`: `getBalance(unitId)`, `createTransfer(unitId, amountCents)`. Testes com `AsaasMockClient`.
**Não inclui:** webhook, UI, antecipação.
**DoD:** `pnpm test:run src/lib/services/financeiro.service.test.ts`

### Fatia 3 — Rotas de API
**Objetivo:** expor saldo e saque.
**Scope in:** `src/app/api/financeiro/balance/route.ts` (GET), `.../transfers/route.ts` (POST). Auth Clerk; unitId da sessão.
**Não inclui:** antecipação, UI.
**DoD:** `pnpm typecheck && pnpm test:run src/app/api/financeiro/`

### Fatia 4 — UI: tela /financeiro + modal saque
**Objetivo:** página de saldo + modal de saque.
**Scope in:** `src/app/(app)/financeiro/page.tsx` (card saldo, botão transferir); modal (valor, conta destino só leitura, confirmar/cancelar); validação; estados loading/erro/sucesso; responsivo 375/768/1440, Alfabeto.
**Não inclui:** modal de antecipação, extrato, cadastro de conta.
**DoD:** `pnpm dlx playwright test financeiro-saque financeiro-saque-limite financeiro-sem-conta --reporter=line`

### Fatia 5 — Webhook TRANSFER_DONE / TRANSFER_FAILED
**Objetivo:** processar eventos Asaas de transferência.
**Scope in:** handlers em `/api/webhooks/asaas`: `TRANSFER_DONE` → `status=DONE`+`confirmedAt`; `TRANSFER_FAILED` → `FAILED`. Idempotência (checar status terminal antes).
**DoD:** `pnpm dlx playwright test webhook-transfer --reporter=line`

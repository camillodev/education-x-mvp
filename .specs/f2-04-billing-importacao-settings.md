# Spec — Billing da Plataforma, Importacao CSV e Configuracoes

> **Status:** rascunho (2026-06-19)
> **Fonte de verdade:** `prisma/schema.prisma` (BillingConfig, Unit) + doc oficial Asaas POST /payments + prototipos (`screens-d.jsx?v=10` aba Meu Plano, `screens-import.jsx?v=9`). PII: AES-256-GCM. Valores em centavos no app, reais na borda Asaas.
> **DS:** Alfabeto (azul `#0467DB`).
> **PENDENCIA CRITICA:** pricing dos planos Basico/Crescimento/Pro e MOCK no prototipo — Rafa define antes de implementar. Ver secao 11.

---

## 1. Objetivo

Permitir que a escola (Admin) gerencie sua relacao financeira com a Education X (IX cobra a escola), importe alunos em lote via CSV e configure os dados operacionais da unidade.

**DoD (Rafa):**
- Billing: a escola vê o plano ativo, troca de plano, atualiza cartão tokenizado e baixa PDF de qualquer fatura IX.
- Importacao: Admin sobe CSV ate 5.000 linhas, corrige erros inline, importa o lote valido e baixa relatorio dos erros.
- Settings: Admin edita dados da escola (razao, CNPJ, conta repasse, regras de cobranca), configura quem paga cada taxa e gerencia o plano — tudo em tres abas.

---

## 2. Dados necessarios (o coracao)

### 2a. Piso Asaas — POST /payments (IX cobra a escola)

Este e o billing **plataforma para escola**: a Impact X cobra a mensalidade SaaS da Education X direto do cartao da escola (asaasPaymentId na PlatformInvoice). Subconta da escola no Asaas nao e usada aqui — o pagamento sai da conta IX principal.

| Campo Asaas | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `customer` | string | Sim | ID Asaas da escola (Unit.asaasAccountId ou customer IX separado) |
| `billingType` | enum | Sim | `CREDIT_CARD` (cartao tokenizado da escola) |
| `value` | number (reais) | Sim | Mensalidade do plano em reais (converter de planPriceCents / 100) |
| `dueDate` | string YYYY-MM-DD | Sim | Dia 5 do mes seguinte (padrao IX, configuravel) |
| `externalReference` | string | Recomendado | PlatformInvoice.id — idempotencia |
| `description` | string | Opcional | "Mensalidade Education X — Plano Basico — Julho/2026" |
| `creditCard.holderName` | string | Sim (cartao) | Nome do titular |
| `creditCard.number` | string | Sim (cartao) | Numero (so no primeiro charge; depois tokenizar) |
| `creditCard.expiryMonth` / `Year` | string | Sim (cartao) | Validade |
| `creditCard.ccv` | string | Sim (cartao) | CVV — nunca persiste no banco |
| `creditCardHolderInfo.name` | string | Sim (cartao) | Nome completo |
| `creditCardHolderInfo.email` | string | Sim (cartao) | Email |
| `creditCardHolderInfo.cpfCnpj` | string | Sim (cartao) | CPF/CNPJ do titular |
| `creditCardHolderInfo.postalCode` | string | Sim (cartao) | CEP |
| `creditCardToken` | string | Sim (renovacao) | Token retornado pelo Asaas na cobranca inicial |

Taxa de negativacao (R$29,90/inclusao): item separado na mesma PlatformInvoice — nao e cobranca Asaas independente. Somada ao proximo ciclo de fatura.

### 2b. Negocio

| Dado | Origem | Descricao |
|---|---|---|
| planId | BillingConfig.planId | "basico", "crescimento", "pro", "custom" |
| planPriceCents | BillingConfig.planPriceCents | Snapshot do preco no momento da contratacao |
| Itens de fatura | PlatformInvoice.items (NOVO) | Mensalidade + taxas de negativacao do periodo |
| cardToken | Unit (campo novo) ou Asaas customer | Token do cartao da escola |
| negativacaoCount | Contagem de negativacoes do periodo | Para compor o item de taxa |

### 2c. Importacao CSV

| Coluna | Tipo | Obrigatorio | Validacao |
|---|---|---|---|
| `aluno` | string | Sim | Nao vazio |
| `nascimento` | date DD/MM/YYYY | Sim | Data valida, nao futura |
| `pagante` | string | Sim | Nao vazio |
| `cpf` | string | Sim | Formato 000.000.000-00 + digitos verificadores |
| `email` | string | Nao | Formato valido se presente |
| `telefone` | string | Nao | Formato valido se presente |
| `plano` | enum | Sim | Um de: Mensal, Trimestral, Semestral, Anual |
| `materias` | string (separado por `;`) | Sim | Cada item deve corresponder a Subject.name ativo da unidade |

### 2d. Fiscal / LGPD

| Campo | Tratamento |
|---|---|
| CPF importado (Guardian.cpfEnc) | AES-256-GCM antes de persistir — nunca plaintext no banco |
| Email importado (Guardian.emailEnc) | AES-256-GCM |
| Telefone importado (Guardian.phoneEnc) | AES-256-GCM |
| CVV do cartao da escola | Nunca persiste — somente no payload para o Asaas |
| Numero do cartao da escola | Somente para tokenizacao inicial; guardar so o token + mascara (••••8842) |
| IP do Admin no import | Logar em tabela de auditoria (LGPD Art. 37) |

---

## 3. Tabela de confronto

| Dado necessario | Origem | Obrigatorio? | Prisma (existe?/falta?) | Campo Asaas | No design? | Resolucao |
|---|---|---|---|---|---|---|
| planId da escola | BillingConfig.planId | Sim | Existe | — | Sim (aba Meu Plano) | Ja existe; expor na UI |
| planPriceCents snapshot | BillingConfig.planPriceCents | Sim | Existe | value (/ 100) | Sim | Ja existe |
| PlatformInvoice (fatura IX) | **FALTA** | Sim | Nao existe | externalReference | Sim (lista de faturas) | Criar model PlatformInvoice (ver secao 4) |
| Token cartao escola | **FALTA** | Sim (billing) | Nao existe | creditCardToken | Sim (forma de pagamento) | Adicionar Unit.asaasCardTokenEnc (AES-256-GCM) + mascara Unit.cardLast4 |
| ImportJob (lote CSV) | **FALTA** | Sim (import) | Nao existe | — | Nao | Criar model ImportJob (ver secao 4) |
| Conta para repasse (banco) | **FALTA** | Nao (settings exibe) | Nao existe | — | Sim (aba Dados) | Adicionar Unit.bankName + bankAgency + bankAccount + bankHolder — ou exibir dados da subconta Asaas |
| municipalRegistration | BillingConfig.municipalRegistration | Sim | Existe | — | Nao (settings nao exibe) | Expor em Dados da Escola aba Dados como campo somente leitura |
| closingDay / dueDay | BillingConfig | Sim | Existe | — | Sim (Regras de cobranca) | Expor e permitir edicao em Settings aba Dados |
| cardFeePayer / negativacaoFeePayer | BillingConfig | Sim | Existe | — | Sim (aba Taxas) | Expor e permitir edicao via Settings aba Taxas |
| Guardian.cpfEnc para import | Guardian.cpfEnc | Sim | Existe (cripto) | — | Nao explicitado | Criar no lote com AES-256-GCM obrigatorio |
| Student (aluno) | **NAO EXISTE** | Sim (import) | Nao existe | — | Campos aluno+nascimento no CSV | Criar Student vinculado a Guardian e Unit (ver fluxo 02 spec 02) |
| Enrollment (matricula) | Existe (spec 02) | Sim (import) | Existe | — | coluna plano+materias | Criar Enrollment em lote no import |

---

## 4. Deltas de schema

```prisma
// ─── Billing plataforma (IX cobra a escola) ──────────────────────────────────

enum PlatformInvoiceStatus {
  OPEN        // fatura gerada, aguardando cobrança
  PAID        // paga (webhook Asaas confirmou)
  FAILED      // cobrança falhou no cartão
  VOID        // cancelada manualmente
}

model PlatformInvoice {
  id                 String                @id @default(cuid())
  unitId             String
  // Periodo de referencia (ex: 2026-07)
  referenceMonth     String                // "2026-07"
  status             PlatformInvoiceStatus @default(OPEN)

  // Itens da fatura (JSON serializado)
  // Estrutura: [{ type: "mensalidade" | "negativacao", description: string, amountCents: Int, qty: Int }]
  itemsJson          String                @db.Text

  // Total em centavos (soma dos itens)
  totalCents         Int

  // Asaas
  asaasPaymentId     String?               // retornado pelo POST /payments
  asaasCreditCardToken String?             // token retornado pelo Asaas para proximas cobranças

  paidAt             DateTime?
  dueAt              DateTime
  createdAt          DateTime              @default(now())
  updatedAt          DateTime              @updatedAt

  unit               Unit                  @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@index([referenceMonth])
  @@map("platform_invoices")
}

// ─── Importacao em lote ───────────────────────────────────────────────────────

enum ImportJobStatus {
  PENDING     // arquivo recebido, aguardando processamento
  VALIDATING  // validando linhas
  READY       // validado, aguardando confirmacao do Admin
  IMPORTING   // importando (transacao em curso)
  DONE        // importado com sucesso
  PARTIAL     // importado com erros (linhas com erro ficaram de fora)
  FAILED      // erro critico — nada importado
}

model ImportJob {
  id               String          @id @default(cuid())
  unitId           String
  status           ImportJobStatus @default(PENDING)
  // Contagens apos validacao
  totalRows        Int             @default(0)
  validRows        Int             @default(0)
  errorRows        Int             @default(0)
  importedRows     Int             @default(0)
  // Erros serializado (JSON): [{ row: Int, field: String, message: String }]
  errorsJson       String?         @db.Text
  // Nome original do arquivo
  originalFilename String
  // ID do admin que fez o upload
  uploadedBy       String
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  unit             Unit            @relation(fields: [unitId], references: [id], onDelete: Cascade)

  @@index([unitId])
  @@map("import_jobs")
}

// ─── Campos novos em modelos existentes ──────────────────────────────────────

// Unit — adicionar:
// asaasCardTokenEnc  String?   // token do cartao da escola (AES-256-GCM)
// cardLast4          String?   // mascara para exibicao (ex: "8842")
// cardExpiry         String?   // "09/28" — sem CVV nunca
// bankName           String?   // nome do banco do repasse
// bankAgency         String?   // agencia
// bankAccount        String?   // conta (mascarada na exibicao)
// bankHolder         String?   // titular da conta
```

**Nota sobre Student:** o model Student e Guardian ja estao definidos na spec 02. O import apenas reutiliza o fluxo de criacao de Guardian + Student + Enrollment. Nao criar novamente aqui.

---

## 5. Contratos Asaas

### 5a. Primeira cobranca da escola (com dados do cartao)

```json
POST https://sandbox.asaas.com/api/v3/payments
Authorization: $ASAAS_IX_API_KEY

{
  "customer": "cus_000001234",
  "billingType": "CREDIT_CARD",
  "value": 450.00,
  "dueDate": "2026-07-05",
  "externalReference": "pi_clxxxxxxxxxxxxx",
  "description": "Mensalidade Education X — Plano Basico — Julho/2026",
  "creditCard": {
    "holderName": "RAFAEL CAMILLO",
    "number": "4242424242428842",
    "expiryMonth": "09",
    "expiryYear": "2028",
    "ccv": "123"
  },
  "creditCardHolderInfo": {
    "name": "Rafael Camillo",
    "email": "contato@kumoncamargos.com.br",
    "cpfCnpj": "12345678901",
    "postalCode": "30310-480"
  }
}
```

Resposta guarda: `id` (asaasPaymentId) + `creditCardToken` (asaasCreditCardToken na PlatformInvoice e depois Unit.asaasCardTokenEnc criptografado).

### 5b. Cobranças recorrentes (token ja salvo)

```json
POST https://sandbox.asaas.com/api/v3/payments
Authorization: $ASAAS_IX_API_KEY

{
  "customer": "cus_000001234",
  "billingType": "CREDIT_CARD",
  "value": 450.00,
  "dueDate": "2026-08-05",
  "externalReference": "pi_clyyyyyyyyyyyyyy",
  "description": "Mensalidade Education X — Plano Basico — Agosto/2026",
  "creditCardToken": "<token_salvo_criptografado>"
}
```

### 5c. Conversao de centavos

```typescript
// boundary function — usar SOMENTE na camada de servico Asaas
const centsToReais = (cents: number): number => parseFloat((cents / 100).toFixed(2));
// ex: planPriceCents 45000 => 450.00
```

---

## 6. Regras de negocio (EARS)

**Billing plataforma:**

- RN-01: WHEN Admin acessa aba "Meu plano", THEN system SHALL exibir plano atual (nome, limite, preco/mes, cobranças no mes, proxima fatura) sem latencia (dado local, nao chamada Asaas em tempo real).
- RN-02: WHEN Admin solicita troca de plano, THEN system SHALL mostrar os 4 planos (Basico/Crescimento/Pro/Sob medida) com preco e limite; o plano atual fica marcado.
- RN-03: WHEN Admin confirma troca de plano, THEN system SHALL atualizar BillingConfig.planId e BillingConfig.planPriceCents (snapshot do novo preco); a troca vige na proxima fatura, nao na atual.
- RN-04: WHEN Admin solicita "Falar com vendas" (plano Sob medida), THEN system SHALL enviar notificacao para equipe IX via webhook interno; nao trocar planId automaticamente.
- RN-05: WHEN Admin salva novo cartao, THEN system SHALL tokenizar via Asaas, salvar token criptografado (AES-256-GCM) em Unit.asaasCardTokenEnc, salvar mascara em Unit.cardLast4 e Unit.cardExpiry; CVV e numero completo NAO persistem.
- RN-06: WHEN fatura mensal vence, THEN system SHALL cobrar via POST /payments com token salvo; em falha, marcar PlatformInvoice.status = FAILED e notificar Admin por email.
- RN-07: WHEN webhook Asaas envia `PAYMENT_CONFIRMED`, THEN system SHALL atualizar PlatformInvoice.status = PAID e PlatformInvoice.paidAt; operacao idempotente por asaasPaymentId.
- RN-08: WHEN uma negativacao e incluida no SPC/Serasa, THEN system SHALL adicionar item de taxa (R$29,90) na PlatformInvoice.itemsJson do mes em aberto; nao gerar cobranca Asaas separada.
- RN-09: WHEN Admin solicita download de fatura, THEN system SHALL gerar PDF da PlatformInvoice com itens detalhados.

**Importacao CSV:**

- RN-10: WHEN Admin faz upload de CSV, THEN system SHALL validar linha a linha antes de criar qualquer registro no banco; nenhum dado e persistido na etapa de validacao.
- RN-11: WHEN o CSV tem mais de 5.000 linhas, THEN system SHALL rejeitar o arquivo inteiro com mensagem clara antes de processar qualquer linha.
- RN-12: WHEN uma linha tem erro (CPF invalido, plano inexistente, pagante vazio, etc.), THEN system SHALL marcar a linha como erro com descricao especifica; as linhas validas NAO sao afetadas.
- RN-13: WHEN ha linhas com erro, THEN system SHALL bloquear o botao "Importar" ate que todos os erros sejam corrigidos inline ou o Admin opte por "importar so as validas".
- RN-14: WHEN Admin confirma a importacao, THEN system SHALL criar Guardian + Student + Enrollment em lote dentro de uma unica transacao de banco; falha em qualquer linha do lote reverte tudo (atomicidade).
- RN-15: WHEN o CPF ja existe na unidade (Guardian duplicado), THEN system SHALL reutilizar o Guardian existente e criar novo Student/Enrollment sem duplicar o pagante.
- RN-16: WHEN a importacao e concluida, THEN system SHALL exibir relatorio (N importados, M erros) e disponibilizar download de CSV de erros com descricao por linha.
- RN-17: WHEN Admin baixa o modelo CSV, THEN system SHALL servir arquivo com cabecalho exato e 2 linhas de exemplo.

**Settings:**

- RN-18: WHEN Admin edita dados da escola (razao, CNPJ, conta repasse), THEN system SHALL exigir confirmacao de senha ou 2FA antes de salvar dados fiscais.
- RN-19: WHEN Admin altera dueDay ou closingDay, THEN system SHALL validar que ambos estao no intervalo 1..28 e que closingDay < dueDay (fechamento antes do vencimento).
- RN-20: WHEN Admin salva configuracao de taxa (cardFeePayer / negativacaoFeePayer), THEN system SHALL atualizar BillingConfig imediatamente; vale para cobranças geradas depois do save.
- RN-21: WHEN Admin ativa "Exigir contrato assinado", THEN system SHALL atualizar BillingConfig.requireSignedContract = true; proximas matriculas exigem o campo contractFileName.

---

## 7. Estados e transicoes

### PlatformInvoice

```
OPEN --[cobrança Asaas ok]--> PAID
OPEN --[cobrança Asaas falhou]--> FAILED
OPEN --[cancelada pelo Admin IX]--> VOID
FAILED --[Admin salva novo cartão + retenta]--> OPEN
```

### ImportJob

```
PENDING --[parse e validação ok]--> READY
PENDING --[> 5.000 linhas]--> FAILED
READY --[Admin confirma import]--> IMPORTING
IMPORTING --[transação ok, todos válidos]--> DONE
IMPORTING --[transação ok, alguns com erro]--> PARTIAL
IMPORTING --[erro crítico / rollback]--> FAILED
```

---

## 8. Fluxo de coleta (UX, referencia ao design)

### Aba "Meu plano" (screens-d.jsx?v=10, linhas 387-436)

3 cards em coluna:
1. Card destaque azul: nome do plano, preco/mes, limite, cobranças no mes, proxima fatura. Botao "Mudar de plano" (abre modal de 4 planos em grid 2x2).
2. Card "Forma de pagamento": mascara do cartao (•••• 8842), validade, badge "Ativo". Botao "Alterar" (abre modal com campos numero/validade/CVV).
3. Card "Faturas": lista cronologica — mes, valor, status (paga/aberta), botao "PDF".

### Fluxo importacao CSV (screens-import.jsx?v=9)

Stepper de 3 etapas: Arquivo → Validacao → Concluido.

**Etapa 1 (Arquivo):** dropzone com drag-and-drop + botao selecionar; limite 5.000 linhas visivel; link "Baixar modelo".

**Etapa 2 (Validacao):** 2 cards de contagem (validas/erros) + tabela com colunas aluno, pagante, CPF, plano, validacao (badge OK ou badge Erro com mensagem), botao "Corrigir" inline que abre modal de edicao com revalidacao ao salvar. Botao "Importar N matriculas" bloqueado enquanto houver erros (ou desbloqueado com aviso "importar so validas", a decidir — ver pendencias).

**Etapa 3 (Concluido):** icone check, contagem final, link para ver matriculas, botao "Relatorio de erros" (CSV) se houver linhas com erro.

### Settings — 3 abas (screens-d.jsx?v=10, linhas 305-482)

Aba **Dados da escola**: 4 cards de leitura (Dados escola, Conta repasse, Regras cobranca, Contrato) com botao "Editar" em cada; toggle "Exigir contrato assinado".

Aba **Taxas**: banner informativo (mensalidade so cobre geracao de cobranca) + card com 2 selecoes FeeChoice (cartao / negativacao) com opcoes "Responsavel paga" ou "Escola assume".

Aba **Meu plano**: descrito acima.

---

## 9. Definition of Done (binario)

```bash
# Typecheck + testes unitarios
pnpm typecheck && pnpm test:run

# E2E Playwright — billing plataforma
pnpm dlx playwright test billing-platform --reporter=line
# Deve provar:
# 1. Admin ve plano atual com dados corretos (nome, preco, limite, proxima fatura)
# 2. Admin troca de plano: BillingConfig.planId atualizado no banco
# 3. Admin salva cartao: token Asaas salvo criptografado, CVV nao persiste
# 4. Fatura exibe itens (mensalidade + taxa negativacao se houver)
# 5. Admin baixa PDF da fatura — arquivo valido, > 5KB

# E2E Playwright — importacao CSV
pnpm dlx playwright test csv-import --reporter=line
# Deve provar:
# 1. Upload de CSV com 7 linhas (4 validas, 3 com erro) — exibe contagem correta
# 2. Corrigir linha com erro inline — linha muda para OK
# 3. Clicar "Importar" com erros restantes — botao bloqueado
# 4. Importar apos corrigir todos — Guardian + Student + Enrollment criados no banco
# 5. Baixar relatorio de erros — CSV com as linhas que ficaram de fora
# 6. Upload de CSV > 5.000 linhas — rejeitado antes de processar

# E2E Playwright — settings
pnpm dlx playwright test settings --reporter=line
# Deve provar:
# 1. Alterar closingDay / dueDay validos — BillingConfig atualizado
# 2. Tentar closingDay >= dueDay — bloqueado com erro
# 3. Alterar cardFeePayer para "escola" — BillingConfig.cardFeePayer = ESCOLA no banco
# 4. Ativar "Exigir contrato assinado" — BillingConfig.requireSignedContract = true
```

---

## 10. Decisoes fechadas

1. **PlatformInvoice e separada de Invoice** (que e escola cobrando o responsavel). Nomes distintos, tabelas distintas, nunca misturar.
2. **Taxa de negativacao (R$29,90) e item de fatura**, nao cobranca Asaas avulsa — soma no proximo ciclo mensal da escola.
3. **Plano Sob medida (custom) nao tem preco automatico** — Admin cai em fluxo "Falar com vendas", equipe IX configura manualmente.
4. **Import e exclusivo do Admin IX** (role `ADMIN` da plataforma, nao o orientador da escola). A escola nao ve esta tela.
5. **Importacao e atomica**: ou tudo entra ou nada entra (uma transacao por lote). Linhas com erro ficam de fora se Admin confirmar "importar so validas" (a decidir — ver pendencias).
6. **CVV nunca persiste** — regra PCI DSS; so o token Asaas fica, criptografado.
7. **closingDay < dueDay** e invariante do dominio — validar no Zod e no banco (check constraint).
8. **Settings edita BillingConfig e Unit diretamente** — sem staging de mudancas; salvar e imediato.

---

## 11. Pendencias

| ID | Topico | Decisao pendente | Quem decide | Impacto |
|---|---|---|---|---|
| P-01 | Pricing dos planos | Basico/Crescimento/Pro: valores reais. No prototipo: R$450/R$599/R$799 — MOCK. Nao implementar como constante ate Rafa definir. | Rafa | PlatformInvoice.totalCents e BillingConfig.planPriceCents |
| P-02 | Importar so validas vs bloquear tudo | O prototipo bloqueia o botao enquanto ha erro. Alternativa: "importar N validas e ignorar M com erro". Decisao de produto afeta RN-13. | Rafa | UX da etapa de validacao |
| P-03 | Conta para repasse | Design exibe banco/agencia/conta no card "Conta para repasse". Schema nao tem esses campos — ou buscar da subconta Asaas (asaasWalletId) ou adicionar campos Unit.bankName etc. Prefere buscar do Asaas ou armazenar no banco? | Rafa | Migracao de schema vs chamada Asaas na hora |
| P-04 | Edicao de dados fiscais — autenticacao | RN-18 menciona confirmacao de senha ou 2FA antes de editar dados fiscais. Clerk ja tem re-auth flow? Ou verificar no Clerk antes de implementar. | Eng (verificar Clerk) | UX da aba Dados |
| P-05 | Atomicidade do import — rollback parcial | RN-14 define atomicidade total. Se o lote e grande (5.000 linhas), uma falha na linha 4.999 reverte tudo. Alternativa: processar em chunks com savepoints. Decisao de performance vs consistencia. | Eng | Implementacao do service de import |
| P-06 | Duplicidade de Guardian no import | RN-15 diz: CPF ja existe = reutilizar Guardian. Mas e se o nome divergir (ex: "Maria Silva" vs "Maria S.")? Alertar ou sobrescrever? | Rafa | Logica de merge no import |

---

## 12. Fatiamento em Task Contracts

### TC-09-A — PlatformInvoice + cobranca do cartao

**Objetivo:** criar o model PlatformInvoice, migrar o banco, implementar o service que gera a fatura mensal (mensalidade + itens de negativacao) e faz o charge via Asaas.

**Scope in:**
- Migration: PlatformInvoice + campos novos em Unit (asaasCardTokenEnc, cardLast4, cardExpiry, bankName, bankAgency, bankAccount, bankHolder)
- Service: `createPlatformInvoice(unitId, month)` — monta itens, gera PlatformInvoice OPEN, chama Asaas POST /payments
- Webhook handler: PAYMENT_CONFIRMED → PlatformInvoice PAID
- API routes: GET /api/platform-invoices, GET /api/platform-invoices/:id/pdf

**Nao incluido:** UI, troca de plano, tokenizacao de cartao (TC-09-B).

**DoD:**
```bash
pnpm typecheck && pnpm test:run
# + teste de integracao: createPlatformInvoice com Asaas sandbox => PlatformInvoice.status = PAID
```

---

### TC-09-B — UI Meu Plano (aba Settings)

**Objetivo:** implementar a aba "Meu plano" em Settings: card de plano atual, modal de troca, card de forma de pagamento (tokenizacao de cartao), lista de faturas com download de PDF.

**Scope in:**
- Componente `<PlanTab>` com os 3 cards do prototipo
- Modal de troca de plano (4 opcoes, PENDING P-01 — usar mock ate Rafa definir)
- Modal de alterar cartao: form → tokenizar via Asaas → salvar Unit.asaasCardTokenEnc
- Lista de faturas: buscar PlatformInvoice[], exibir status, link PDF

**Nao incluido:** logica de cobranca (TC-09-A), aba Dados, aba Taxas (TC-09-D).

**DoD:**
```bash
pnpm typecheck
pnpm dlx playwright test billing-platform --reporter=line
```

---

### TC-09-C — Importacao CSV

**Objetivo:** implementar o fluxo completo de importacao: upload, validacao linha a linha, correcao inline, importacao atomica, relatorio de erros.

**Scope in:**
- Model ImportJob + migration
- Parser CSV (papaparse ou equivalente) com validacao por schema Zod
- UI stepper 3 etapas (Arquivo / Validacao / Concluido) conforme prototipo
- Modal de correcao inline com revalidacao
- Service de importacao: Guardian + Student + Enrollment em lote (transacao unica)
- Download de CSV de erros
- Download do modelo CSV

**Nao incluido:** settings, billing, fluxo de matricula manual (spec 02).

**DoD:**
```bash
pnpm typecheck && pnpm test:run
pnpm dlx playwright test csv-import --reporter=line
# Inclui: upload valido, correcao inline, importacao ok, rejeicao >5.000 linhas
```

---

### TC-09-D — Settings abas Dados e Taxas

**Objetivo:** implementar as abas "Dados da escola" e "Taxas" em Settings — exibicao, edicao e persistencia.

**Scope in:**
- Aba Dados: 4 cards de leitura (Dados escola, Conta repasse, Regras cobranca, Contrato), modais de edicao para cada secao, toggle "Exigir contrato assinado"
- Aba Taxas: FeeChoice para cardFeePayer e negativacaoFeePayer, salvar em BillingConfig
- Validacao: closingDay < dueDay (Zod + constraint no banco)
- Modo escuro (toggle SettingsDarkCard — ja no prototipo)

**Nao incluido:** aba Meu Plano (TC-09-B), billing.

**DoD:**
```bash
pnpm typecheck && pnpm test:run
pnpm dlx playwright test settings --reporter=line
# Inclui: edicao de taxas, validacao closingDay/dueDay, toggle contrato
```

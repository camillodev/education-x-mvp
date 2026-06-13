# Épico 01 — Automação de Boleto + Nota Fiscal

> **Prioridade:** P0 · **Doc-mãe:** [00-visao.md](./00-visao.md) · **Status:** 🟡 Aguardando aprovação
> **Entrega:** uma Escola consegue gerar boletos (com PIX) para seus Responsáveis e
> emitir a nota fiscal quando a cobrança é paga.

---

## Por que este épico vem primeiro

É o coração do produto. Sem gerar boleto e nota fiscal, não há nada a vender para a
escola. Tudo o mais (régua de cobrança, negativação, cartão) só faz sentido depois que
existe uma cobrança no ar.

---

## Parte 1 — Experiência do usuário (Features)

### Feature 1.1 — Conectar uma Escola (Onboarding / Setup Fee)

> **User story**
> Como **admin da Education X**, quero cadastrar uma nova escola e conectá-la à Asaas,
> para que ela possa começar a emitir cobranças com o dinheiro caindo na conta dela.

**O onboarding é o único lugar de configuração específica da escola (regra dura):**
Toda configuração que varia por escola é definida aqui, no onboarding. Isso centraliza a
gestão de clientes da plataforma — o admin IX configura uma vez, por escola. Inclui:
- Dados cadastrais (nome, CNPJ, endereço, email, telefone)
- Regras de cobrança: dia de vencimento, dia de fechamento, **multa (%)**, **juros (%)**
- Régua de avisos (canais e dias) e régua de negativação (dias/valor/aviso)
- Nota fiscal (inscrição municipal, código de serviço, alíquota)
- Cartão de crédito (habilitar, repasse de taxa, parcelamento)
- Planos da escola e regras de cancelamento/multa (ver Épico de Planos)

**Critérios de aceite**
- [ ] Preencho os dados da escola (nome, CNPJ, endereço, email, telefone) em um formulário.
- [ ] Configuro **todas** as regras específicas da escola (vencimento, fechamento, multa, juros, régua, NFS-e, cartão).
- [ ] Ao confirmar, o sistema cria automaticamente a subconta da escola na Asaas.
- [ ] As credenciais da escola ficam guardadas de forma segura (criptografadas).
- [ ] Os avisos automáticos (régua) já nascem configurados na criação da subconta, com os valores definidos aqui.
- [ ] Multa e juros definidos aqui são aplicados automaticamente em toda cobrança da escola.
- [ ] Vejo uma tela de confirmação: "Escola conectada — pronta para emitir cobranças".
- [ ] Se a Asaas recusar (ex: CNPJ inválido), vejo uma mensagem clara e **nada** é salvo pela metade.
- [ ] Tentativa de cadastrar a mesma escola (mesmo CNPJ) duas vezes → erro claro, sem duplicar.
- [ ] Posso reabrir o onboarding depois para ajustar qualquer configuração da escola.

**Jornada resumida**
```
/configuracoes/onboarding
  Etapa 1: dados da escola
  Etapa 2: regras de cobrança (vencimento, multa, juros, régua, negativação)
  Etapa 3: nota fiscal + cartão
  Etapa 4: planos e regras de cancelamento
  Etapa 5: contratos (aceite IX) → Confirmar
  → "Kumon Camargos conectada. Subconta criada. Próximo: importar alunos."
```

---

### Feature 1.2 — Cadastrar um Responsável

> **User story**
> Como **Orientadora**, quero que um responsável seja registrado na Asaas automaticamente
> quando vou emitir a primeira cobrança dele, para não ter trabalho manual.

**Dados obrigatórios de todo Responsável (regra dura):**
Todo responsável **deve** ter **CPF, email e telefone** preenchidos. Não são opcionais —
são pré-requisito para cobrança multicanal (email + WhatsApp + SMS) e para negativação
SPC/Serasa (Épico 03, exige CPF). O cadastro de responsável sem um desses campos é bloqueado.

**Critérios de aceite**
- [ ] CPF, email e telefone são **campos obrigatórios** no cadastro/edição de responsável (validação Zod).
- [ ] CPF validado (formato + dígito verificador); email validado; telefone com DDD.
- [ ] Não consigo emitir cobrança para um responsável com qualquer um desses campos faltando — vejo um aviso para completar o cadastro primeiro.
- [ ] Ao emitir a primeira cobrança, o sistema verifica se o responsável já existe na Asaas (pelo CPF).
- [ ] Se não existe, cria automaticamente com nome, CPF, email e telefone.
- [ ] Se já existe, reutiliza o cadastro (não duplica).
- [ ] O vínculo responsável ↔ cliente Asaas fica salvo para as próximas cobranças.

---

### Feature 1.3 — Emissão de cobranças: automática + extras manuais

> **User story**
> Como **Orientadora**, quero que as mensalidades sejam emitidas automaticamente no
> fechamento, e poder emitir cobranças extras manuais para casos pontuais (multa de
> cancelamento, pagamento avulso) de um responsável já cadastrado.

**Dois caminhos de emissão (decidido):**

| Caminho | Quando | Quem dispara |
|---------|--------|--------------|
| **1. Automático (fechamento)** | Mensalidades recorrentes — o padrão | Sistema (cron) — Épico 02 |
| **2. Extra manual** | Pagamento pontual: multa de cancelamento, taxa avulsa, ajuste | Orientadora, para um responsável já cadastrado |

> ❌ **Removido:** emissão em lote sob demanda. A recorrência mensal é coberta pelo modo
> automático (Épico 02); o manual existe só para cobranças extras pontuais.

**Critérios de aceite — Cobrança extra manual**
- [ ] Seleciono um responsável **já cadastrado** e crio uma cobrança extra.
- [ ] Informo o motivo/descrição (ex: "Multa de cancelamento", "Material didático").
- [ ] **Posso editar o valor antes de gerar** (não fica preso ao valor do plano).
- [ ] O boleto já vem com PIX (mesmo QR na fatura).
- [ ] A multa e os juros configurados na escola são aplicados (se aplicável a essa cobrança).
- [ ] Vejo o boleto com status "Emitido", link do PDF e opção de copiar a linha digitável.
- [ ] Se a Asaas falhar, a cobrança fica "Erro" e posso tentar de novo.

> **Edição antes de gerar:** o ajuste de valor/desconto acontece **antes** da emissão na
> cobrança extra. A edição de cobrança já emitida (mas não paga) é a Feature 1.4.

---

### Feature 1.4 — Editar cobrança: valor, vencimento e desconto

> **User story**
> Como **Orientadora**, quero editar o valor de uma cobrança, mudar o vencimento e aplicar
> descontos antes do responsável pagar, para tratar casos especiais (bolsa, acordo, erro).

**Critérios de aceite**
- [ ] Enquanto a cobrança **não foi paga**, posso editar: valor, data de vencimento, desconto.
- [ ] Posso aplicar desconto em **percentual** (ex: 10%) ou **valor fixo** (ex: R$ 50).
- [ ] Posso configurar "desconto por pontualidade": vale só se pagar até N dias antes do vencimento.
- [ ] A edição reflete no boleto/PIX do responsável (o link atualiza).
- [ ] Cobrança **já paga** não pode ser editada (campos bloqueados).
- [ ] Toda edição fica registrada (auditoria: quem editou, o quê, quando).
- [ ] O desconto exclusivo do responsável (já existente no sistema) é respeitado no cálculo.

---

### Feature 1.5 — Enviar boleto ao Responsável (WhatsApp + Email)

> **User story**
> Como **Orientadora**, quero que o boleto chegue ao responsável por **WhatsApp e email**,
> para garantir que ele receba e pague — sem eu precisar mandar manualmente.

**Critérios de aceite**
- [ ] Ao emitir um boleto, o responsável recebe automaticamente por **email, WhatsApp E SMS** (os três).
- [ ] A mensagem traz o valor, vencimento, link do boleto e o PIX.
- [ ] Posso **reenviar** a cobrança a qualquer momento (botão "Reenviar") — útil se o responsável diz que não recebeu.
- [ ] Como CPF, email e telefone são obrigatórios (Feature 1.2), todos os três canais sempre têm destino — não há caso de "canal sem contato".
- [ ] Os canais ativos (email/WhatsApp/SMS) são configuráveis por escola (detalhe da régua no Épico 02).

> **Nota:** o envio é feito pela própria Asaas (nativo, sem custo de infraestrutura nossa).
> A configuração de quais canais e quando entra na régua do **Épico 02**, mas o envio
> básico "boleto emitido por email + WhatsApp + SMS" já funciona neste épico.

---

### Feature 1.6 — Receber a confirmação de pagamento

> **User story**
> Como **Orientadora**, quero que a cobrança mude para "Paga" sozinha quando o responsável
> pagar, para eu não precisar conferir manualmente o extrato.

**Critérios de aceite**
- [ ] Quando o responsável paga (boleto ou PIX), a Asaas avisa o Education X em tempo real.
- [ ] A cobrança muda automaticamente para "Paga", com data e valor do pagamento.
- [ ] Se a cobrança vence sem pagamento, muda para "Vencida".
- [ ] O aviso da Asaas é autenticado (ninguém de fora consegue forjar um "pagamento falso").

---

### Feature 1.7 — Emitir Nota Fiscal automaticamente (sempre)

> **User story**
> Como **Orientadora**, quero que a nota fiscal seja emitida sozinha sempre que a cobrança
> é paga, para cumprir a obrigação fiscal sem trabalho manual.

**Regra dura:** neste sistema **toda cobrança paga gera nota fiscal automaticamente**.
NFS-e não é opcional por escola — é padrão. O pré-requisito é a escola ter inscrição
municipal + código de serviço configurados na subconta (parte do onboarding).

**Critérios de aceite**
- [ ] Quando uma cobrança é paga, o sistema emite a NFS-e **automaticamente** (sempre).
- [ ] A nota fica vinculada à cobrança; vejo o número, o PDF e o XML quando emitida.
- [ ] Se a escola ainda não configurou a inscrição municipal, a emissão fica **pendente** e
      alerta a Orientadora ("Configure os dados fiscais para emitir a nota") — não some silenciosamente.
- [ ] Se a emissão falhar, vejo o status "Erro na nota" e o motivo, com opção de reemitir.
- [ ] Não emite nota duplicada para a mesma cobrança.
- [ ] A nota é enviada ao responsável junto com a confirmação de pagamento.

---

## Parte 2 — Subsection técnica

> Para evitar retrabalho. API Asaas, schema Prisma e payloads.

### 2.1 — Onboarding (subconta)

`POST /v3/accounts` (chamado com a API key da conta-mãe):
```json
{
  "name": "Kumon Camargos",
  "email": "financeiro@kumoncamargos.com.br",
  "cpfCnpj": "12345678000190",
  "companyType": "LIMITED",
  "address": "Rua X", "addressNumber": "123", "province": "Centro", "postalCode": "30130000",
  "webhooks": [{
    "name": "Payments",
    "url": "https://<app>/api/webhooks/asaas?unitId={unitId}",
    "authToken": "<secret-por-unidade>",
    "sendType": "SEQUENTIALLY", "interrupted": false, "enabled": true, "apiVersion": 3,
    "events": ["PAYMENT_CREATED","PAYMENT_UPDATED","PAYMENT_RECEIVED","PAYMENT_OVERDUE","PAYMENT_DUEDATE_WARNING"]
  }]
}
```
Resposta: `{ id, apiKey, walletId }` → salvar em `BillingConfig`.

### 2.2 — Cliente (Responsável)

- Buscar: `GET /v3/customers?cpfCnpj={cpf}` → reusar se existir.
- Criar: `POST /v3/customers` `{ name, cpfCnpj, email, mobilePhone }`.
- Salvar `asaasCustomerId` no `Guardian`.

**⚠️ Obrigatoriedade CPF/email/telefone (Feature 1.2):**
Hoje `Guardian.cpf`, `Guardian.email`, `Guardian.phone` são **opcionais** (`String?`) no
schema (`prisma/schema.prisma:119`). Plano:
1. **Validação na camada de aplicação primeiro** (Zod no cadastro/edição + guard na emissão)
   — não emite cobrança sem os 3 campos. Isso é não-quebrável e entra já.
2. **Migração de dados legados:** relatório de responsáveis sem CPF/email/telefone +
   fluxo para completar (a escola preenche no onboarding/edição).
3. **Tornar `NOT NULL` no schema** só **depois** que 100% dos registros estiverem completos
   (migração condicional — verificar `COUNT(*) WHERE cpf IS NULL OR email IS NULL OR phone IS NULL = 0`).
   Até lá, a obrigatoriedade vive na aplicação (mais seguro que quebrar a migration).

### 2.3 — Boleto + PIX

`POST /v3/payments` (com a API key da subconta no header `access_token`):
```json
{
  "customer": "{asaasCustomerId}",
  "billingType": "BOLETO",
  "value": 450.00,
  "dueDate": "2026-07-10",
  "externalReference": "{invoiceId}",
  "description": "Mensalidade Kumon Camargos — 2026-07",
  "fine": { "value": 2 },
  "interest": { "value": 1 }
}
```
Resposta relevante: `id`, `status`, `bankSlipUrl`, `invoiceUrl` (contém PIX), `barCode`.

**Emissão em lote (Feature 1.3, modo 2):** loop de `createPayment` no servidor, com
agregação de resultado `{ sucesso, erro, jaExistente }`. Idempotência por `externalReference`
garante que reprocessar não duplica.

### 2.3b — Editar cobrança (Feature 1.4)

`PUT /v3/payments/{id}` — só enquanto status ∈ {PENDING, OVERDUE} (não pago):
```json
{
  "value": 405.00,
  "dueDate": "2026-07-15",
  "discount": { "value": 10, "dueDateLimitDays": 5, "type": "PERCENTAGE" }
}
```
- `discount.type`: `"PERCENTAGE"` ou `"FIXED"`.
- `dueDateLimitDays`: dias antes do vencimento em que o desconto vale (0 = até o vencimento).
- Bloquear edição se `status` ∈ {RECEIVED, CONFIRMED}. Registrar em AuditLog.

### 2.3c — Enviar / reenviar ao Responsável (Feature 1.5)

O envio "boleto emitido" é disparado pela Asaas via evento `PAYMENT_CREATED`, nos canais
habilitados na subconta (`emailEnabledForCustomer` + `whatsappEnabledForCustomer = true`).

- Configuração dos canais: `PUT /v3/notifications/PAYMENT_CREATED` (feito no onboarding;
  régua completa no Épico 02).
- **Reenvio manual:** a Asaas reenvia ao atualizar a cobrança ou via reenvio nativo da
  fatura. Para o botão "Reenviar", confirmar endpoint exato de reenvio na implementação
  (candidato: reenvio da notificação ou novo `PAYMENT_UPDATED`).
- Pré-requisito: `Guardian.email` e `Guardian.mobilePhone` preenchidos. Sem canal → aviso na UI.

### 2.4 — Webhook de pagamento

`POST /api/webhooks/asaas?unitId={unitId}` — header `asaas-access-token` validado contra o
secret da unidade. Mapeamento:

| Asaas status | Invoice status |
|---|---|
| `RECEIVED` / `CONFIRMED` | PAID (paidAt, paidAmount = value × 100) |
| `OVERDUE` | OVERDUE |
| `REFUNDED` | CANCELLED |

### 2.5 — Nota Fiscal

`POST /v3/invoices` `{ payment: "{asaasPaymentId}" }` → status `SCHEDULED → AUTHORIZED`.
Webhook de NFS-e atualiza `NfseRecord` com `number`, `pdfUrl`, `xmlUrl`.

### 2.6 — Schema Prisma (mudanças)

```prisma
model BillingConfig {
  asaasEnabled       Boolean @default(false)
  asaasApiKey        String?  // criptografado
  asaasWalletId      String?
  asaasAccountId     String?
  asaasWebhookSecret String?  // criptografado
  asaasEnv           String   @default("sandbox")
  nfseEnabled        Boolean  @default(false)
  nfseMunicipalCode  String?
  nfseAliquot        Float    @default(0.05)
  lateFeePercent     Float    @default(2.0)
  interestPercent    Float    @default(1.0)
}

model Unit {
  cnpj          String? @unique
  companyType   String?
  phone         String?
  address       String?
  addressNumber String?
  complement    String?
  province      String?
  postalCode    String?
}

model Guardian {
  asaasCustomerId String?
}

model Invoice {
  asaasPaymentId  String?
  asaasCustomerId String?
  billingType     String  @default("BOLETO")
  bankSlipUrl     String?
  invoiceUrl      String?
  pixQrCode       String?
  barCode         String?
  // remover coraInvoiceId após migração
}

model NfseRecord {
  asaasInvoiceId String?
  status         String  @default("PENDING") // PENDING|ISSUED|ERROR|CANCELLED
  number         String?
  pdfUrl         String?
  xmlUrl         String?
}
```

### 2.7 — Testes (≥80%)

- Onboarding service: cria subconta, criptografa apiKey, rollback em falha, CNPJ duplicado.
- Boleto service: converte centavos→reais, externalReference, fine/interest, idempotência, erro→ERROR.
- Resolver cliente: cria se não existe, reusa se existe.
- Webhook: RECEIVED→PAID, OVERDUE→OVERDUE, token inválido→401, id desconhecido→ignora.
- NFS-e: emite no PAID, pula se nfseEnabled=false, não duplica.

### 2.8 — Já implementado (F0-A)

`src/lib/integration/asaas/` — cliente com `createSubAccount`, `createCustomer`,
`createPayment`, `createInvoice`, webhook helpers + mock. 65 testes, 96% coverage.

---

## ✏️ Decisões para você editar

> Edite as respostas aqui no Cursor. Cada item traz o que a Asaas permite de fato,
> para você decidir sem pesquisar. Marque sua escolha trocando `[ ]` por `[x]` ou
> escrevendo abaixo de cada pergunta.

### Q1 — Boleto puro ou boleto+PIX por padrão?
Na Asaas, `billingType: BOLETO` **já gera o PIX junto** (mesmo QR na fatura). Existe
também `billingType: PIX` (só PIX, sem boleto) e `UNDEFINED` (responsável escolhe na hora).
- [ ] Padrão **BOLETO** (boleto + PIX juntos — recomendado, cobre os dois)
- [ ] Padrão **UNDEFINED** (responsável escolhe boleto, PIX ou cartão na fatura)
- **Sua resposta:** _______________

### Q2 — Mostrar as taxas da Asaas para a escola?
✅ **Decidido: NÃO.** A taxa Asaas é problema interno nosso. O modelo de cobrança ao cliente
será por **planos baseados em quantidade** (boletos emitidos ou alunos cadastrados), com
várias faixas de tamanho, para medirmos nossa margem. A escola não vê a taxa Asaas.
> 📌 **Definição de planos e faixas: adiada** — decidimos depois. Por ora, sem limite/bloqueio
> no código; apenas registrar contadores para análise futura de margem.

### Q3 — Controle de quantidade (planos)
✅ **Decidido (parcial):** modelo será por **quantidade de boletos OU alunos cadastrados**,
com planos de vários tamanhos. As faixas de preço serão definidas depois.
- **Agora:** instrumentar contadores (boletos emitidos/mês por escola, alunos ativos) só para
  medição de margem. **Sem bloqueio.**
- **Depois:** definir faixas e se haverá bloqueio/upgrade automático.

### Q4 — Nota fiscal: sempre automática
✅ **Decidido: SEMPRE.** Toda cobrança paga gera NFS-e automaticamente (Feature 1.7).
Pré-requisito: inscrição municipal configurada na subconta (passo do onboarding). Para
Kumon Camargos, confirmar no setup se a inscrição municipal está pronta.

### Q5 — Vencimento e desconto por pontualidade?
✅ **Confirmado como Feature 1.4** — edição de valor + desconto (% ou fixo, com prazo de
pontualidade) entra neste épico. A Asaas suporta via `PUT /v3/payments/{id}`.
- **Decidido:** sim, incluso no épico 01.

### Q6 — Envio por WhatsApp + Email + SMS
✅ **Decidido:** email + WhatsApp + **SMS** (os três) ativos por padrão. Feature 1.5.

### Q7 — Modo de emissão padrão da escola
✅ **Decidido:** **automático no fechamento** é o padrão. Os modos manual e lote ficam
disponíveis para casos pontuais. A rotina automática é o Épico 02.

### Q8 — Dados obrigatórios do Responsável
✅ **Decidido:** CPF, email e telefone são **obrigatórios** para todo responsável.
Destrava cobrança multicanal e negativação SPC. Feature 1.2 (validação Zod + bloqueio de
emissão sem esses dados). Migração de dados existentes: responsáveis legados sem esses
campos precisam ser completados antes da primeira emissão.

### ⚠️ Nota técnica que preciso travar com você
A doc da Asaas usa **reais** em `POST /v3/payments` e **centavos** em `POST /v3/lean/payments`.
Vou usar `/v3/payments` (reais) e converter centavos→reais na borda. Confirma? **Sua resposta:** ___

# Design Handoff — Transferência de Saldo (Saque PIX)

> **Fase:** MVP · **Ordem:** 06 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-06-transferencia-saldo.md`](../mvp-06-transferencia-saldo.md) — fonte de verdade dos campos e regras.
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440.
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

## Como usar este handoff (conciliação com o protótipo existente)
Já existe um protótipo do Education X em andamento no Claude Design. **Não recrie do zero.** Para este fluxo:
1. Localize as telas deste fluxo que já existem no protótipo.
2. Concilie com a spec abaixo: mantenha o que já bate, ajuste o que divergir, crie só o que faltar.
3. Onde a spec e o protótipo conflitarem, **a spec vence**. Sinalize divergências ao Rafa.

---

## 1. Objetivo

Permitir que a escola veja o saldo disponível e transfira via PIX para a conta bancária cadastrada da própria escola, fechando o ciclo financeiro. **Nenhuma transferência real sem confirmação explícita em modal.**

A dona acessa `/financeiro`, vê o saldo disponível (PIX/boleto liberado) separado do que está a liberar (cartão em D+X), e transfere via PIX. Dados **sempre reais** via GET /finance/balance (sem cache — dinheiro real). Transferência é criada em PENDING no sandbox até o webhook confirmar.

---

## 2. Telas e passos

### 2.1 Tela `/financeiro` — Card de Saldo

**Card principal (azul Alfabeto `#0467DB`):**
- **Valor grande + destaque:** `R$ XXX` (= `availableValue` em reais, GET /finance/balance)
  - Font-size ≥ 24px, weight 700
  - Label acima: "Saldo Disponível"
  - Subtítulo: "PIX / boleto liberado — em sua conta agora"
- **Badge secundária:** "R$ YYY em cartão — libera em D+X"
  - Cinza/muted (bg: cinza de fundo, text: #666)
  - Educacional: separa "disponível agora" vs "a liberar"
  - Dados: `notYetAvailableValue` de GET /finance/balance
- **Botão "Transferir para banco"** (sólido, azul #0467DB, height ≥ 44px mobile)
  - Abre modal de saque PIX
  - **Desabilitado** se `BankAccount` não existe ou `availableValue == 0` (tooltip explicativo)
- **Botão "Antecipar recebíveis"** (existe, mas não detalhar — pertence a `f2-03` Fase 2)

**Dados & Cache:**
- Chamada GET /finance/balance **na carga e ao abrir modal** (sem cache — dinheiro real)
- Conversão: centavos → reais (divide por 100)

**Responsividade:**
- Mobile (375): card empilhado, valores em 18-20px, botões stacked
- Tablet (768): side-by-side badge e valor
- Desktop (1440): layout padrão

---

### 2.2 Modal "Resgatar saldo"

**Título:** "Resgatar saldo"  
**Subtítulo:** "Transferência via PIX para a conta cadastrada da escola."

**Seções internas:**

1. **Campo de valor**
   - Label: "Valor do resgate"
   - Máscara monetária (R$ XXXXX,XX)
   - **Pré-preenchido** com `availableValue` (GET /finance/balance)
   - Input editável (height 40px, border 1px #CCC, padding 8px, font-size 16px)
   - Validação tempo real: 
     - Erro se `≤ 0`: "Insira um valor maior que zero"
     - Erro se `> availableValue`: "Você não tem saldo suficiente. Máximo: R$ X,XX"
   - Max = `availableValue`
   - Botão "Confirmar resgate" desabilitado enquanto inválido

2. **Card da conta destino (só leitura, disabled state)**
   - Banco: `bankName` (ex: "Banco Inter")
   - Agência: `agency` mascarada (ex: "1234")
   - Conta: `accountNumber` + `accountDigit` mascarada (ex: "****5678")
   - **Chave PIX:** mascarada conforme `pixKeyType`:
     - CNPJ: "12.345.678/0001-**"
     - EMAIL: "user@****ail.com"
     - PHONE: "+55 (9) 9****-****"
     - EVP: "[chave criptografada]"
   - Tipo da chave: badge com `pixKeyType` enum
   - Badge extra: "PIX na hora" (verde/info)
   - Todos os campos com background cinza de fundo, texto #666 (visualmente disabled)

3. **Botões de ação**
   - "Cancelar" (outline/secundário, height ≥ 40px)
   - "Confirmar resgate" (sólido, azul #0467DB, só habilitado se valor > 0 e ≤ availableValue)

**Comportamento:**
- **Erro:** toast vermelho + modal permanece aberto (permite corrigir valor e tentar novamente)
- **Sucesso:** toast verde "Transferência iniciada! Você receberá em até 1 hora" + modal fecha + saldo do card atualiza (re-chama GET /finance/balance)
- **Loading:** spinner no botão "Confirmar", campos desabilitados durante POST

---

## 3. Estados da UI

| Estado | Condição | Visual | Ação |
|---|---|---|---|
| **Normal** | `availableValue > 0` + `BankAccount` existe | Card azul, botão azul sólido ativo | Clica "Transferir", abre modal |
| **Modal pré-preenchido** | Modal aberto | Input mostra `availableValue`, botão "Confirmar" ativo | Input editável, validação tempo real |
| **Loading** | POST /transfers em progresso | Spinner no botão "Confirmar", input + cancel desabilitados | Aguarda resposta Asaas |
| **Sucesso** | POST retorna 201 + Transfer PENDING criada | Toast verde "Transferência iniciada! Você receberá em até 1 hora" | Modal fecha automático, saldo atualiza |
| **Erro Asaas** | POST retorna 4xx/5xx | Toast vermelho (ex: "Erro ao processar. Tente novamente ou contate suporte") | Modal permanece aberto, valor mantido |
| **Validação falha** | Valor inválido (≤0 ou >availableValue) | Borda vermelha input + msg de erro inline, botão "Confirmar" off | Usuário corrige valor |
| **Saldo zerado** | `availableValue == 0` | Card com "R$ 0,00", botão "Transferir" desabilitado | Tooltip: "Saldo indisponível" |
| **Sem conta bancária** | `BankAccount` não existe para a Unit | Botão "Transferir para banco" desabilitado | Tooltip: "Cadastre uma conta bancária primeiro" |
| **Terminal (DONE/FAILED)** | Webhook `TRANSFER_DONE` ou `TRANSFER_FAILED` chega | Transfer em status DONE/FAILED (não renderiza aqui; histórico/painel financeiro) | Apenas leitura |

---

## 4. Campos, dados e integração

| Campo | Origem (API/DB) | Tipo | Unidade | Exibição na tela | Mascaramento |
|---|---|---|---|---|---|
| Saldo disponível (principal) | GET /finance/balance → `availableValue` | int | centavos → reais ÷100 | R$ XXX,XX em font-size 24px | Nenhum (monetário) |
| Saldo cartão a liberar | GET /finance/balance → `notYetAvailableValue` | int | centavos → reais ÷100 | R$ YYY em badge muted | Nenhum (monetário) |
| Banco | `BankAccount.bankName` | string | N/A | "Banco Inter" | Nenhum |
| Agência | `BankAccount.agency` | string | N/A | Mascarada na conta destino | Sim, últimos 2 dígitos |
| Conta | `BankAccount.accountNumber` + `accountDigit` | string | N/A | Mascarada (ex: ****5678) | Sim, últimos 4 dígitos |
| Chave PIX | `BankAccount.pixKey` (criptografado se CPF/PHONE) | string | N/A | Mascarada conforme `pixKeyType` | Sim, conforme tipo (vide 2.2) |
| Tipo da chave | `BankAccount.pixKeyType` | enum | N/A | Badge (CNPJ \| EMAIL \| PHONE \| EVP) | Nenhum |
| Valor a transferir | Input modal | int | centavos (até POST) | Campo R$ XXXXX,XX | Máscara monetária |

**API Contracts:**

**GET `/api/financeiro/balance`** (chamado na carga + ao abrir modal)
```json
{
  "availableValue": 98000,
  "notYetAvailableValue": 27000
}
```

**POST `/api/financeiro/transfers`** (confirmação do modal)
```json
Request: { "amountCents": 98000 }
Response (201): { 
  "id": "tra_xxx", 
  "status": "PENDING", 
  "asaasId": "tra_asaas_xxx",
  "createdAt": "2026-07-03T..."
}
Response (4xx/5xx): { "error": "..." }
```

**GET `/api/financeiro/bank-account`** (preencher card destino)
```json
{
  "id": "ba_xxx",
  "bankName": "Banco Inter",
  "agency": "1234",
  "accountNumber": "567890",
  "accountDigit": "1",
  "pixKey": "[criptografado se CPF/PHONE]",
  "pixKeyType": "CNPJ"
}
```

---

## 5. Regras que afetam a UI

### RN-02: Validação em tempo real (modal)
- **Valor ≤ 0:** Borda vermelha input + erro inline "Insira um valor maior que zero" + botão "Confirmar resgate" desabilitado
- **Valor > availableValue:** Borda vermelha + erro "Você não tem saldo suficiente. Máximo: R$ X,XX" + botão off

### RN-03: Confirmação obrigatória
- **Toda transferência passa por modal antes de chamada Asaas** (nunca POST direto de botão)
- Modal exibe conta destino **apenas em leitura** (cinza/disabled; neste fluxo não há edição de chave PIX)

### RN-04: Sem BankAccount cadastrada
- Botão "Transferir para banco" desabilitado + title tooltip "Cadastre uma conta bancária primeiro"
- **Página de saldo permanece visível** (educacional — mostra que o fluxo existe, mas precisa configurar conta)

### RN-13: Saldo zerado
- Card de saldo não desaparece (permanece visível com "R$ 0,00")
- Botão "Transferir para banco" desabilitado + tooltip "Saldo indisponível"
- Educacional: usuário vê que a funcionalidade existe, mas não há saldo agora

### Sandbox vs. Produção
- **Sandbox:** POST /transfers cria Transfer em status PENDING; Asaas mockado retorna sucesso
- **Produção:** bloqueada até flag Rafa + confirmação explícita (regra `asaas.md` — estrita para dinheiro real)
- Verificar `process.env.ASAAS_SANDBOX` antes de chamar POST

---

## 6. Referência visual (protótipo + marca)

- **Protótipo:** `screens-fin.jsx` (UX reference — concilie com spec abaixo)
- **Card azul:** Alfabeto #0467DB, border-radius ≥ 8px, padding ≥ 16px
- **Valores:** font-size 24px weight 700 (saldo disponível); 12px weight 400 (badge cartão)
- **Botões:** height ≥ 44px (mobile), min-width 120px, fundo primário #0467DB, texto branco
- **Input modal:** height 40px, border 1px #CCC, padding 8px, font-size 16px
- **Toast:** bottom-right, bg verde/vermelho, duração 4s
- **Responsividade:** 375 / 768 / 1440px testados
- **Brand:** shadcn/ui padrão + Alfabeto #0467DB
- **Acessibilidade:** WCAG 2.2, labels, contraste ≥ 4.5:1, tab order lógica

---

## 7. Integração com MVP

- **D-01:** `BankAccount` é model separado (não em Unit). Permite múltiplas contas + `isDefault`.
- **D-02:** TED é futuro; PIX é o único caminho neste MVP.
- **D-05:** Centavos no app, reais na borda Asaas (`/100` ao enviar, `*100` ao receber).
- **D-06:** Sandbox primeiro, produção só com flag Rafa + confirmação explícita (regra `asaas.md`, estrita para dinheiro).
- **Antecipação de recebíveis:** vive em `f2-03` (Fase 2). Botão existe no card, não detalhar neste handoff.
- **Webhook TRANSFER_DONE/FAILED:** handler em `/api/webhooks/asaas` atualiza `Transfer.status` + `confirmedAt`. Não bloqueia fluxo do usuário (Transfer fica PENDING até webhook).

---

## 8. Conciliação com protótipo — checklist

Ao implementar, **usar este checklist e sinalizar divergências ao Rafa:**

- [ ] Card saldo renderiza: `availableValue` grande + `notYetAvailableValue` em badge
- [ ] Botão "Transferir para banco" abre modal (desabilitado se sem conta ou saldo zero + tooltip)
- [ ] Modal abre com título "Resgatar saldo" + subtítulo PIX
- [ ] Modal pré-preenche input com `availableValue` (chamada GET /finance/balance ao abrir)
- [ ] Input validado tempo real: valor ≤ 0 ou > `availableValue` mostra erro + desabilita "Confirmar"
- [ ] Card conta destino: banco + agência/conta mascaradas + chave PIX mascarada + tipo + "PIX na hora"
- [ ] POST /transfers cria Transfer PENDING (sandbox; sempre validar env antes)
- [ ] Sucesso: toast verde "Transferência iniciada!" + modal fecha + saldo atualiza (re-chama GET /finance/balance)
- [ ] Erro: toast vermelho + modal permanece aberto (permite corrigir e tentar novamente)
- [ ] Todos os estados visuais testados: normal / loading / sucesso / erro validação / saldo zero / sem conta
- [ ] Responsivo 375 / 768 / 1440px
- [ ] Acessibilidade: labels, contraste, tab order
- [ ] E2E Playwright: `financeiro-saque`, `financeiro-saque-limite`, `financeiro-sem-conta`

**Divergências encontradas:**
- [ ] Campo/regra faltando no protótipo: ___________________
- [ ] Visual diferente (cor/espaçamento/tipografia): ___________________
- [ ] Fluxo diverge (ex: modal não pré-preenche): ___________________

Se encontrar divergências, edite esta seção e avise Rafa.

# Design Handoff — Transferência de Saldo (Saque PIX)

> **Fase:** MVP · **Ordem:** 06 · **Persona:** dona/orientadora
> **Spec-fonte:** [`mvp-06-transferencia-saldo.md`](../mvp-06-transferencia-saldo.md) (fonte de verdade dos campos e regras)
> **Marca:** Alfabeto azul `#0467DB` · shadcn/ui · pt-BR · reais na tela · PII mascarada · breakpoints 375/768/1440
> **Tom:** "falamos como você fala" — informal, direto, zero jargão. A dona não é dev.

---

## 1. Objetivo

A dona acessa `/financeiro`, vê o saldo disponível (PIX/boleto liberado) separado do que está a liberar (cartão em D+X), e transfere via PIX para a conta bancária cadastrada da escola, fechando o ciclo financeiro. **Nenhuma transferência real sem confirmação explícita em modal.**

---

## 2. Telas e Passos

### 2.1 Tela `/financeiro` — Card de Saldo

**Card principal (azul Alfabeto `#0467DB`):**
- **Valor grande + destaque:** `R$ XXX` (= `availableValue` em reais)
  - Label acima: "Saldo disponível para saque"
  - Subtítulo: "PIX / boleto liberado — em sua conta agora"
- **Badge secundária:** "R$ YYY em cartão — libera em D+X"
  - Muted/cinza
  - Explica que existe valor bloqueado mas não faz parte do saque
- **Botão "Transferir para banco"** (sólido, azul, clicar abre modal)
- **Botão "Antecipar recebíveis"** (existe mas NÃO detalhar — pertence à `f2-03/Fase 2`)

**Responsividade:**
- Mobile (375): card empilhado, valores em 18-20px
- Tablet (768): side-by-side badge e valor
- Desktop (1440): layout padrão

---

### 2.2 Modal "Resgatar saldo"

**Título:** "Resgatar saldo"  
**Subtítulo:** "Transferência via PIX para a conta cadastrada da escola."

**Seções internas:**

1. **Campo de valor**
   - Label: "Valor a transferir"
   - Máscara monetária real (R$ XXXXX,XX)
   - **Pré-preenchido** com `availableValue`
   - Input editável
   - Validação tempo real: aviso se > disponível ou ≤ 0
   - Max allowed = `availableValue`

2. **Card da conta destino (só leitura)**
   - Layout: banco logo/ícone + textos
   - Banco: `bankName` (ex: "Banco Inter")
   - Chave PIX: **MASCARADA** (ex: "12.345.678/0001-**" se CNPJ, "email@****ail.com" se e-mail)
   - Tipo da chave: badge com `PixKeyType` (CNPJ | EMAIL | PHONE | EVP)
   - Badge extra: "PIX na hora" (verde/destaque)
   - Tudo cinza claro (disabled), nenhum campo editável

3. **Botões de ação**
   - "Cancelar" (outline/secundário)
   - "Confirmar resgate" (sólido, azul, só habilitado se valor > 0 e ≤ availableValue)

**Comportamento:**
- Modal permanece aberto em caso de erro (permite corrigir valor e tentar novamente)
- Sucesso: toast verde + modal fecha + saldo atualiza na página

---

## 3. Estados da UI

| Estado | Condição | Visual | Interação |
|---|---|---|---|
| **Normal** | `availableValue > 0`, conta cadastrada | Card azul, botão azul sólido | Clica, abre modal |
| **Loading** | POST em progresso | Spinner no botão, campo off, modal não-interativo | Espera |
| **Sucesso** | Transfer criada em PENDING | Toast verde "Resgate solicitado", modal fecha, saldo atualiza | Modal desaparece |
| **Erro** | Asaas retorna erro ou validação falha | Toast vermelho (mensagem clara), modal permanece aberto | Corrige valor, tenta outra vez |
| **Saldo zerado** | `availableValue = 0` | Card cinza/desabilitado, botão off | Tooltip: "Nenhum saldo disponível para saque no momento" |
| **Sem conta bancária** | Nenhum `BankAccount` cadastrado | Botão "Transferir para banco" desabilitado | Tooltip: "Cadastre uma conta bancária primeiro" |
| **Terminal (DONE/FAILED)** | Webhook `TRANSFER_DONE` ou `TRANSFER_FAILED` chegou | Transfer aparece no histórico (não aqui), saldo reflete estado real | Apenas leitura |

---

## 4. Campos e Valores

| Campo | Origem | Tipo | Exibição | Mascaramento |
|---|---|---|---|---|
| Saldo disponível (principal) | `GET /finance/balance` → `availableValue` | number (reais) | R$ XXX,XX em 20-24px | Nenhum (monetário) |
| Saldo cartão a liberar | `GET /finance/balance` → `notYetAvailableValue` | number (reais) | R$ YYY em badge muted | Nenhum (monetário) |
| Banco | `BankAccount.bankName` | string | "Banco Inter" etc | Nenhum |
| Chave PIX | `BankAccount.pixKey` (criptografada se CPF/PHONE) | string | Mascarada no card (ex: "12.345.678/0001-**") | Sim, se type = CPF ou PHONE |
| Tipo da chave | `BankAccount.pixKeyType` | enum | Badge (CNPJ | EMAIL | PHONE | EVP) | Nenhum |
| Valor a transferir | Input modal | number | Campo com máscara R$ XXXXX,XX | Máscara monetária |

---

## 5. Regras que Afetam a UI

### Validação em tempo real
- **Valor ≤ 0:** desabilita botão "Confirmar resgate" + aviso "Insira um valor maior que zero"
- **Valor > availableValue:** desabilita botão + aviso "Valor não pode ser superior ao saldo disponível"

### Confirmação obrigatória
- Toda transferência passa por modal antes de chamada Asaas
- Modal exibe conta destino **apenas em leitura** (não permite editar chave PIX neste fluxo)

### Sem BankAccount cadastrada
- Botão "Transferir para banco" fica off
- Tooltip: "Cadastre uma conta bancária primeiro"
- **Não esconde a página de saldo.** A UI fica disponível, só o botão desabilitado

### Saldo zerado
- Card não desaparece (permanece cinza/muted)
- Botão desabilitado com tooltip "Nenhum saldo disponível para saque no momento"
- Educacional: mostra que o fluxo existe, mas não há dinheiro agora

### Sandbox vs. Produção
- **Sandbox:** Transfer criada em PENDING, Asaas mockado retorna sucesso
- **Produção:** bloqueada até flag + confirmação explícita do Rafa (regra `asaas.md`)

---

## 6. Referência Visual

- **Protótipo:** `screens-fin.jsx` (UX reference, não fonte de campos — spec é a verdade)
- **Card azul:** saldo grande + badge cartão
- **Modal:** campo de valor centrado, card conta só-leitura, botões base-12
- **Responsividade:** testar 375 / 768 / 1440px
- **Brand:** shadcn/ui padrão + Alfabeto azul `#0467DB`

---

## 7. Integração com o Restante do MVP

- **D-01:** `BankAccount` é model separado (não campos em Unit). Permite múltiplas contas + `isDefault`.
- **Antecipação de recebíveis:** vive em `f2-03`. Mesmo card financeiro tem botão "Antecipar recebíveis" mas não inclui neste design.
- **Webhook TRANSFER_DONE:** handler em `/api/webhooks/asaas` atualiza `Transfer.status = DONE` + `confirmedAt`. Não bloqueia o fluxo do usuário (Transfer fica PENDING até webhook).

---

## Checklist de Implementação

- [ ] Card saldo: `availableValue` grande + `notYetAvailableValue` em badge
- [ ] Botão "Transferir para banco" abre modal (desabilitado se sem conta ou saldo zero)
- [ ] Modal pré-preenche valor com `availableValue`
- [ ] Validação tempo real: valor ≤ 0 ou > `availableValue` desabilita "Confirmar"
- [ ] Card conta destino exibe banco + chave PIX mascarada + tipo + "PIX na hora"
- [ ] POST /transfers cria Transfer em PENDING (sandbox)
- [ ] Toast sucesso + modal fecha + saldo atualiza
- [ ] Toast erro + modal permanece (permite corrigir)
- [ ] Estados visuais: normal / loading / sucesso / erro / saldo zerado / sem conta
- [ ] Responsivo 375 / 768 / 1440px
- [ ] Acessibilidade: labels, contraste, tab order
- [ ] Playwright E2E: `financeiro-saque`, `financeiro-saque-limite`, `financeiro-sem-conta`

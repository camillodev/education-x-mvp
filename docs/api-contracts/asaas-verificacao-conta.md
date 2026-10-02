# Asaas — Verificação da conta sandbox

> Verificado em 2026-06-13 contra a conta sandbox real (chave `$aact_hmlg_...`), endpoint `https://sandbox.asaas.com/api/v3`. Não é chute — cada recurso foi consultado e retornou HTTP 200.

## Recursos disponíveis na conta (todos ✅)

| Recurso | Endpoint | Status |
|---------|----------|--------|
| Conta (myAccount) | `GET /myAccount` | ✅ 200 |
| Subcontas (onboarding de escola) | `GET /accounts` | ✅ 200 |
| Customers (responsável) | `GET /customers` | ✅ 200 |
| Cobranças (boleto/PIX/cartão) | `GET /payments` | ✅ 200 |
| **Negativação (dunning)** | `GET /paymentDunnings` | ✅ 200 — recurso liberado |
| **Antecipação de recebíveis** | `GET /anticipations` | ✅ 200 — recurso liberado |
| **Transfer (saque PIX)** | `GET /transfers` | ✅ 200 — recurso liberado |

## Conclusão das pendências do roadmap

As 3 pendências "verificar na conta" estão **RESOLVIDAS — todas liberadas**:
- ✅ `PAYMENT_DUNNING:WRITE` (negativação) — disponível
- ✅ Antecipação de recebíveis — disponível
- ✅ Transfer / saque — disponível

> Falta confirmar a **escrita** (POST) de cada uma no momento de implementar, mas o recurso está habilitado na conta. A leitura (GET) confirma o acesso.

## Ainda pendente (não verificável por GET simples)
- **CONFIRMED vs RECEIVED** — decisão de design (qual evento dispara PAID). Resolver ao implementar o webhook (Tarefa 3/4). Recomendação a validar: usar `PAYMENT_RECEIVED` (dinheiro efetivamente na conta) para disparar NF + regularização, e `PAYMENT_CONFIRMED` só para status visual "confirmado". Confirmar o comportamento real testando um pagamento sandbox.
- **Tokenização de cartão** — verificar no fluxo de cartão (Tarefa 7.2): endpoint `POST /creditCard/tokenize` ou `POST /payments` com `creditCard` + `creditCardHolderInfo`.
- **Inscrição municipal Kumon Camargos** (NFS-e) — lado do cliente, não da conta Asaas.

## Como reproduzir
```bash
source .env.local   # ASAAS_MASTER_API_KEY com $ e aspas simples
curl -s -w '%{http_code}' "$ASAAS_BASE_URL/paymentDunnings?limit=1" \
  -H "access_token: $ASAAS_MASTER_API_KEY" -H "Content-Type: application/json"
```

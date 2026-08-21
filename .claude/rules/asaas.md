# Regras de Integração Asaas — Education X

Carrega ao tocar em `src/lib/integration/asaas/`, services de cobrança/pagamento.

## Cliente tipado
Toda chamada Asaas passa pelo **cliente tipado** (`interface + AsaasLiveClient + AsaasMockClient`, migrado de `education-x-new/src/lib/integration/asaas/`). Nunca `fetch` direto à Asaas.

## Sandbox primeiro (inegociável)
- Default **sandbox** (`https://sandbox.asaas.com/api/v3`).
- Produção **só com confirmação explícita do Rafa, por operação**.
- Confirmar antes de mover dinheiro real: emissão real, antecipação, transfer, estorno.

## Auth e valores
- Header `access_token: {apiKey}` (**NÃO** Bearer). Nunca logar/commitar o token.
- API key de subconta criptografada no banco (AES-256-GCM). Ver `security.md`.
- **A API Asaas usa REAIS, não centavos.** Conversão centavos→reais acontece **na borda do cliente**. O resto do app é centavos.

## Contratos antes do código
Descobrir os payloads reais via **MCP** (`.mcp.json` do projeto tem o server `asaas`; precisa `ASAAS_MASTER_API_KEY` sandbox no `.env.local` pra executar chamadas) em sandbox, salvar em `docs/api-contracts/asaas-*.md`, **antes** de implementar o que depende.

### Pendências — separadas por tipo (não são todas "corrigir")

**Decisão de design (sua, não é bug):**
- **CONFIRMED vs RECEIVED** — qual evento Asaas dispara o estado PAID interno. CONFIRMED = banco confirmou; RECEIVED = dinheiro caiu na conta. Afeta quando emitimos NF e regularizamos negativação. Decidir antes do webhook (3.3).

**Verificar na conta (estado real desconhecido — checar via MCP/painel sandbox, NÃO assumir):**
- `PAYMENT_DUNNING:WRITE` (negativação) liberado na conta? — pode já estar OK.
- Tokenização de cartão / cobrança recorrente disponível?
- `transfer` (saque PIX) e antecipação de recebíveis disponíveis?

> Não tratar as 3 acima como "pendência" sem checar — verificar primeiro. Podem já estar liberadas.

**Não é Asaas (lado do cliente):**
- Inscrição municipal do Kumon Camargos (necessária pra NFS-e) — depende do Pimenta/Camargos, não da conta Asaas.

## Webhook
- Idempotente (skip de evento duplicado via `WebhookEvent`).
- Token no header `X-Asaas-Token` (não em query string).
- **Event bus**: handlers se registram (NFS-e, regularização); não editam o core do webhook.

Operações detalhadas: skill do projeto `.claude/skills/edx-asaas/SKILL.md` (auto-contida no repo) + contratos em `docs/api-contracts/asaas-*.md`.

# Regras de Segurança — Education X

Carrega ao tocar em auth, middleware, queries, API routes.

## Isolamento de tenant (CRÍTICO)
- `unitId` **SEMPRE** vem da sessão Clerk via `getUnitContext(auth)`, **NUNCA** de parâmetro HTTP.
  - Exceção única: o webhook público da Asaas (`/api/webhook`) não tem sessão Clerk — autentica via
    header `asaas-access-token` comparado contra `ASAAS_WEBHOOK_TOKEN`, e resolve `unitId`
    internamente a partir do payload (via `Invoice.asaasPaymentId` ou `externalReference`) antes
    de usar `forUnit(unitId)`. Nunca aceitar `unitId` vindo direto do payload/query do webhook.
- **Prisma client extension** injeta `unitId` automaticamente em toda query — nenhuma query pode "esquecer" o scope.
- Escola A acessando dado da escola B → **403** (por construção, não por checagem manual).

## Trust boundaries (3)
- **Admin IX** — todas as Units.
- **Orientador** — só a Unit dele.
- **Público** — rotas de matrícula (não autenticadas, **sempre rate-limited**).

## Secrets
- Sempre `${VAR}` / env. Nunca hardcoded (hook `block-secrets.sh` bloqueia).
- API key de subconta Asaas **criptografada** no banco: AES-256-GCM, **IV aleatório por chamada**. Decrypt com chave errada → lança erro.
- Nunca logar/commitar token, chave, ou secret.
- **Verificar se uma secret existe/tem valor plausível sem ler o conteúdo**: `Read`/`cat`/`grep`
  direto em `.env`/`.env.local` é bloqueado por permissão global (correto, não contornar). Use
  `source .env* 2>/dev/null; echo "${#VAR_NAME}"` — reporta só o comprimento, nunca o valor. Serve
  pra confirmar presença e formato plausível (ex: token de webhook Asaas tem 32-255 chars) antes
  de assumir que uma secret está ausente e pedir de novo ao Rafa.

## PII
Proteção de dados pessoais (CPF mascarado, PII fora de logs, cartão só token) → ver `lgpd.md`.

# Regras de Segurança — Education X

Carrega ao tocar em auth, middleware, queries, API routes.

## Isolamento de tenant (CRÍTICO)
- `unitId` **SEMPRE** vem da sessão Clerk via `getUnitContext(auth)`, **NUNCA** de parâmetro HTTP.
  - Exceção única: o webhook público da Asaas usa `unitId` em query, validado pelo token secreto da subconta (não é rota autenticada por Clerk).
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

## PII
Proteção de dados pessoais (CPF mascarado, PII fora de logs, cartão só token) → ver `lgpd.md`.

---
status: aguardando aprovação
data: 2026-08-05
---

# RFC: Gate de CI/CD (branch protection + trigger de branches empilhadas)

## Contexto

`ci.yml` já existe e cobre typecheck+lint+unit+build+Playwright E2E. Deploy já é automático via Vercel Git integration. Duas lacunas confirmadas:

1. `main` não tem branch protection (`gh api repos/.../branches/main/protection` → 404) — merge não é bloqueado por CI vermelho.
2. `ci.yml` só dispara em PRs com base `main`/`develop`. O fluxo real do MVP usa branches empilhadas (F2 nasce de F1, F3 de F2...) — PRs intermediários não rodam CI hoje.

## Decisão

1. Remover o filtro `branches: [main, develop]` do trigger `pull_request:` em `.github/workflows/ci.yml` — CI roda em todo PR, qualquer base.
2. Branch protection na `main`: required status checks = `"Typecheck · Lint · Test · Build"` e `"Playwright E2E (375 / 768 / 1440)"` (nomes confirmados via `gh api .../commits/main/check-runs`), PR obrigatório, branch atualizada antes de mergear.

## Fora de escopo (decisão consciente)

- CD explícito via Actions — Vercel nativo já cobre preview+produção, redundante recriar.
- Sentry/observability — sem tráfego real (0 pilotos pagos), nada a instrumentar ainda. Vira issue no Linear com gatilho "primeira escola em produção".

Detalhe completo (abordagens consideradas, riscos, mermaid): vault second-brain, `profissional/wiki/decisions/WIP-rfc-cicd-gate-education-hub.md`.

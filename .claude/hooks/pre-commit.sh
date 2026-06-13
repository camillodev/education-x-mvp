#!/bin/bash
# Pre-commit gate — roda lint + typecheck + test antes de permitir commit.
# Instalar como git hook: ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit
# Bloqueia commit direto em main/develop.

set -e

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  echo "✗ Commit direto em '$branch' bloqueado. Use feature/ | fix/ | chore/ + PR."
  exit 1
fi

# Só roda os gates se o projeto já tem package.json com os scripts (pós-scaffold)
if [ -f package.json ]; then
  echo "→ typecheck..."; pnpm typecheck 2>/dev/null || { echo "✗ typecheck falhou"; exit 1; }
  echo "→ lint...";      pnpm lint 2>/dev/null      || { echo "✗ lint falhou"; exit 1; }
  echo "→ test...";      pnpm test:run 2>/dev/null  || { echo "✗ testes falharam"; exit 1; }
  echo "✓ gates passaram"
fi

exit 0

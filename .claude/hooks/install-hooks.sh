#!/usr/bin/env bash
# Instala os git hooks do projeto. Idempotente e seguro em ambientes sem .git
# (CI, Vercel) — sai sem erro se não houver repositório git.
set -e

# Raiz do repo (diretório acima de .claude/hooks/)
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Sem .git (CI/deploy/tarball) → nada a fazer, sai limpo.
if [ ! -d "$ROOT/.git" ]; then
  exit 0
fi

HOOK_SRC="$ROOT/.claude/hooks/pre-commit.sh"
HOOK_DST="$ROOT/.git/hooks/pre-commit"

if [ -f "$HOOK_SRC" ]; then
  ln -sf "../../.claude/hooks/pre-commit.sh" "$HOOK_DST"
  chmod +x "$HOOK_SRC"
  echo "✓ pre-commit hook instalado (.git/hooks/pre-commit → .claude/hooks/pre-commit.sh)"
fi

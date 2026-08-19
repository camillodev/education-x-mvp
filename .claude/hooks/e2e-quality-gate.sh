#!/usr/bin/env bash

# Runs E2E tests before declaring feature complete
# Stop hook — exits 2 if E2E fails, 0 otherwise. Avoids loops via stop_hook_active flag.
#
# ALSO enforces Gate 3 (homologação humana) — docs/PLANO-TIME-AGENTS.md §5 e
# .claude/skills/edx-homologacao/SKILL.md. Mesmo padrão de marker file de
# linear-mark-ticket.sh/no-edit-tests.sh: se a sessão tocou código de produção
# (diff não commitado em src/ ou prisma/, incluindo staged e untracked) e o
# marker de Gate 3 não existe, bloqueia o Stop (exit 2) até o pacote de
# homologação (skill edx-homologacao) ser confirmado. Marker é per-ticket —
# remover depois do PR (Gate 4), senão o gate fica permanentemente aberto
# depois da primeira confirmação.
#
# Nada hoje TOCA esse marker automaticamente (edx-homologacao é markdown pro
# Rafa, não grava arquivo) — quem confirma o Gate 3 precisa criar o marker à
# mão: `touch .claude/.gate3-confirmed`. A mensagem de bloqueio abaixo diz
# isso explicitamente.

input=$(cat)

# Avoid infinite loops if this hook is already running
stop_hook_active=$(jq -r '.stop_hook_active // false' <<<"$input" 2>/dev/null)
if [[ "$stop_hook_active" == "true" ]]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-.}"

# --- Gate 3: homologação ---------------------------------------------------
GATE3_MARKER="$project_dir/.claude/.gate3-confirmed"

prod_diff=$(git -C "$project_dir" status --porcelain -- src prisma 2>/dev/null)

if [[ -n "$prod_diff" && ! -f "$GATE3_MARKER" ]]; then
  echo "BLOCKED (Gate 3): há mudança não commitada em código de produção (src/ ou prisma/) e a homologação ainda não foi confirmada." >&2
  echo "Rode a skill edx-homologacao (pacote de 5 itens: o que mudou, como testar, o que olhar de perto, o que ficou fora, evidência) e, depois do Rafa aprovar, crie o marker: touch $GATE3_MARKER" >&2
  echo "Remova o marker depois do PR (Gate 4) — ele é por ticket, não deve ficar 'confirmado' permanentemente." >&2
  exit 2
fi
# --- fim Gate 3 -------------------------------------------------------------

# Check if package.json exists
if [[ ! -f "$project_dir/package.json" ]]; then
  exit 0
fi

# Check if test:e2e script exists
if ! grep -q '"test:e2e"\|"e2e"' "$project_dir/package.json" 2>/dev/null; then
  exit 0
fi

# Run E2E tests if npm is available
if command -v npm &> /dev/null; then
  echo "Running E2E tests..." >&2

  if npm run test:e2e --silent 2>/dev/null || npm run e2e --silent 2>/dev/null; then
    exit 0
  else
    echo "E2E TESTS FAILED: Do not declare feature complete until tests pass." >&2
    exit 2
  fi
fi

exit 0

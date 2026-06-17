#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: força validação Playwright nos 3 breakpoints antes de
# git push / gh pr create / gh pr ready, quando o diff toca UI ou rotas.
# Espelha o padrão de pre-commit-tdd-gate.sh.

SESSION_ID="${CLAUDE_SESSION_ID:-${CLAUDE_SESSION:-unknown}}"
MARKER_DIR="/tmp"

STDIN=$(cat)
COMMAND=$(echo "$STDIN" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# Bypass explícito (config/CI-only fixes sem mudança comportamental)
if [[ "${PLAYWRIGHT_SKIP:-}" == "1" ]] || [[ "$COMMAND" == *"PLAYWRIGHT_SKIP=1"* ]]; then
  exit 0
fi

# Só intercepta integração final
if ! [[ "$COMMAND" =~ (gh[[:space:]]+pr[[:space:]]+create|gh[[:space:]]+pr[[:space:]]+ready|git[[:space:]]+push[[:space:]]+origin) ]]; then
  exit 0
fi

# Self-test escape: evita auto-bloqueio quando o próprio comando invoca o hook pra testar
if [[ "$COMMAND" == *"playwright-required.sh"* ]]; then
  exit 0
fi

# Determina base branch (develop > main)
BASE_BRANCH="develop"
if ! git rev-parse --verify "origin/${BASE_BRANCH}" >/dev/null 2>&1; then
  if git rev-parse --verify "origin/main" >/dev/null 2>&1; then
    BASE_BRANCH="main"
  fi
fi

CHANGED=$(git diff "origin/${BASE_BRANCH}...HEAD" --name-only 2>/dev/null || git diff "${BASE_BRANCH}...HEAD" --name-only 2>/dev/null || echo "")

# Sem diff? Deixa passar (push de nova branch sem commits novos vs base é raro mas ok)
if [[ -z "$CHANGED" ]]; then
  exit 0
fi

# Mudança visual/de rota?
if ! echo "$CHANGED" | grep -qE '^src/app/.*\.(tsx|ts)$|^src/components/|^src/features/'; then
  exit 0
fi

# Verifica que existe um comentário de validação visual cobrindo o HEAD atual.
# O comentário é postado por pw-validation-comment.sh e carrega o marcador
# <!-- PW-VALIDATION:<sha> -->. Durável e auditável (vive no PR), ao contrário
# de markers em /tmp.
HEAD_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
MARKER="PW-VALIDATION:${HEAD_SHA}"

VALIDATED=0
if gh pr view --json comments >/dev/null 2>&1; then
  if gh pr view --json comments --jq '.comments[].body' 2>/dev/null | grep -qF "$MARKER"; then
    VALIDATED=1
  fi
fi

if [[ "$VALIDATED" -ne 1 ]]; then
  cat >&2 <<EOF
🛑 Validação visual obrigatória — push/PR bloqueado.

Diff toca UI/rotas (src/app/, src/components/, src/features/) mas NÃO há comentário
de validação Playwright cobrindo o commit atual (${HEAD_SHA:0:7}) no PR.

Fluxo correto antes de "$COMMAND":

1. Suba o dev (telas protegidas precisam do bypass):
     DISABLE_CLERK=true DEV_USER_ROLE=admin_ix npx next dev --port 3001

2. Para cada rota mudada, nos 3 breakpoints (375/768/1440):
     browser_resize → browser_navigate → browser_console_messages (esperar [])
     → browser_take_screenshot → e LEIA o .png (Read). Print sem olhar não conta.

3. Poste o veredito no PR (vira registro auditável):
     echo "<o que você viu: rotas, ✓/✗ por breakpoint, console, achados>" \\
       | .claude/hooks/pw-validation-comment.sh -

   Isso grava o marcador PW-VALIDATION:<sha-do-HEAD> que este gate procura.
   Reavalie e reposte a cada novo commit que toque UI.

Auditoria com olhos de verdade: agente edx-ui-reviewer.

Bypass do gate (SÓ fix de config/CI sem mudança visual):
  PLAYWRIGHT_SKIP=1 <comando>
EOF
  exit 2
fi

exit 0

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

# Checa 3 markers
MISSING=()
for BP in 375 768 1440; do
  [[ -f "${MARKER_DIR}/claude-pw-${SESSION_ID}-${BP}" ]] || MISSING+=("$BP")
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  cat >&2 <<EOF
🛑 Validação Playwright obrigatória — push/PR bloqueado.

Diff toca UI/rotas (src/app/, src/components/, src/features/) mas faltam screenshots em: ${MISSING[*]}

Antes de "$COMMAND": rodar Playwright nos 3 breakpoints E LER cada screenshot
(Read na .png — tirar print sem olhar NÃO conta, foi assim que bug visual passou).

Telas protegidas (sob /onboarding): suba o dev com bypass:
  DISABLE_CLERK=true DEV_USER_ROLE=admin_ix npx next dev --port 3001
Auditoria visual com olhos de verdade: agente edx-ui-reviewer.

Para cada rota mudada:

  1. browser_resize {width: 1440, height: 900}
     browser_navigate <rota>
     browser_console_messages {level: 'error'}   # esperar []
     browser_take_screenshot {filename: 'pw-1440-<slug>.png'}

  2. browser_resize {width: 768, height: 1024}
     browser_navigate <rota>
     browser_console_messages {level: 'error'}   # esperar []
     browser_take_screenshot {filename: 'pw-768-<slug>.png'}

  3. browser_resize {width: 375, height: 667}
     browser_navigate <rota>
     browser_console_messages {level: 'error'}   # esperar []
     browser_take_screenshot {filename: 'pw-375-<slug>.png'}

Bypass (USE COM CUIDADO — só para fix de config/CI sem mudança comportamental):
  PLAYWRIGHT_SKIP=1 <comando>

Detalhes: ~/.claude/skills/ix-dev/SKILL.md §6 + AGENTS.md.
EOF
  exit 2
fi

exit 0

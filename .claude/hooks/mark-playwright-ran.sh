#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: marca breakpoints de Playwright como completados.
# Espelha o padrão de mark-test-ran.sh + pre-commit-tdd-gate.sh.
# Detecta o viewport a partir do filename do screenshot (ex: pw-375-rota.png)
# OU do último resize gravado em /tmp/claude-pw-${SESSION}-last-resize.
# Sempre exit 0 (PostToolUse nunca bloqueia).

SESSION_ID="${CLAUDE_SESSION_ID:-${CLAUDE_SESSION:-unknown}}"
MARKER_DIR="/tmp"

STDIN=$(cat)

# Tool name pra distinguir resize vs screenshot
TOOL_NAME=$(echo "$STDIN" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# Caso 1: browser_resize — armazena o viewport mais recente pra usar depois
if [[ "$TOOL_NAME" == *browser_resize ]]; then
  WIDTH=$(echo "$STDIN" | jq -r '.tool_input.width // empty' 2>/dev/null || echo "")
  if [[ -n "$WIDTH" ]]; then
    echo "$WIDTH" > "${MARKER_DIR}/claude-pw-${SESSION_ID}-last-resize"
  fi
  exit 0
fi

# Caso 2: browser_take_screenshot — cria marker do breakpoint
FILENAME=$(echo "$STDIN" | jq -r '.tool_input.filename // empty' 2>/dev/null || echo "")
BREAKPOINT=""

if [[ "$FILENAME" =~ (-|_)1440|desktop ]]; then
  BREAKPOINT="1440"
elif [[ "$FILENAME" =~ (-|_)768|tablet ]]; then
  BREAKPOINT="768"
elif [[ "$FILENAME" =~ (-|_)375|mobile ]]; then
  BREAKPOINT="375"
elif [[ -f "${MARKER_DIR}/claude-pw-${SESSION_ID}-last-resize" ]]; then
  WIDTH=$(cat "${MARKER_DIR}/claude-pw-${SESSION_ID}-last-resize" 2>/dev/null || echo "")
  case "$WIDTH" in
    1440) BREAKPOINT="1440" ;;
    768)  BREAKPOINT="768"  ;;
    375)  BREAKPOINT="375"  ;;
  esac
fi

if [[ "$BREAKPOINT" =~ ^(375|768|1440)$ ]]; then
  touch "${MARKER_DIR}/claude-pw-${SESSION_ID}-${BREAKPOINT}"
fi

exit 0

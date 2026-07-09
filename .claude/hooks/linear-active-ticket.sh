#!/usr/bin/env bash

# SessionStart hook — injects reminder to check/activate a Linear EDU ticket
# before starting any work. Never touches Linear itself (no API key here) —
# the Claude turn makes the MCP call. Always exits 0 (informative only).

cat >/dev/null # drain stdin

read -r -d '' MSG <<'EOF'
Antes de começar qualquer trabalho nesta sessão: verifique o ticket ativo no Linear.

1. Chame list_issues no time EDU (teamId e5623300-f420-4627-ab05-1612f7b2f981) filtrando estado "In Progress".
2. Se houver um issue em progresso → esse é o WIP (WIP=1). Mostre-o ao Rafa e trabalhe nele.
3. Se não houver → liste o backlog priorizado do time EDU e peça ao Rafa para escolher UM antes de codar.

Linear é a única casa de tarefas deste projeto (Trello e Plane estão congelados).
EOF

jq -n --arg msg "$MSG" '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $msg}}'

exit 0

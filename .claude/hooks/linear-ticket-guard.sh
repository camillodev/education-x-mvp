#!/usr/bin/env bash

# UserPromptSubmit hook — reminds to activate/create a Linear EDU ticket
# before starting engineering work, unless a ticket was already activated
# this session (marker file dropped by linear-mark-ticket.sh).
# Never blocks. Always exits 0.

input=$(cat)
prompt=$(echo "$input" | jq -r '.prompt // empty' 2>/dev/null)
session_id=$(echo "$input" | jq -r '.session_id // empty' 2>/dev/null)

if [[ -z "$prompt" ]]; then
  exit 0
fi

marker="${TMPDIR:-/tmp}/linear-ticket-${session_id}"
if [[ -f "$marker" ]]; then
  exit 0
fi

if echo "$prompt" | grep -qiE 'feature|bug|fix|refactor|implementa|cria|build|deploy|debug|codar'; then
  read -r -d '' MSG <<'EOF'
Qual ticket EDU no Linear você está trabalhando? Ative um "In Progress" ou crie um novo antes de começar (WIP=1). Linear é a única casa de tarefas — não usar Trello/Plane.
EOF
  jq -n --arg msg "$MSG" '{hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $msg}}'
fi

exit 0

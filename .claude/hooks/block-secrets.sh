#!/bin/bash
# PreToolUse hook (Edit|Write) — bloqueia secret hardcoded antes de escrever.
# Lê o tool_input do stdin (JSON), checa o conteúdo por padrões de secret.
# Exit 2 = bloqueia a operação.

input=$(cat)
content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null)

if [ -z "$content" ]; then
  exit 0
fi

# Padrões de secret (chaves Asaas, Clerk, Supabase, tokens, senhas inline)
patterns='(asaas[_-]?(api[_-]?key|token)\s*[:=]\s*["'"'"']?\$?aact_|sk_live_|sk_test_|pk_live_|CLERK_SECRET_KEY\s*[:=]\s*["'"'"']?sk_|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'"'"']?eyJ|password\s*[:=]\s*["'"'"'][^"'"'"'$][^"'"'"']{6,}|access_token\s*[:=]\s*["'"'"'][a-zA-Z0-9]{20,})'

if echo "$content" | grep -qiE "$patterns"; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Secret hardcoded detectado. Use ${VAR} / env, nunca o valor cru. (.claude/hooks/block-secrets.sh)"
    }
  }'
  exit 2
fi

exit 0

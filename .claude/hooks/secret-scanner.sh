#!/usr/bin/env bash

# Scans Edit/Write operations for hardcoded secrets and API keys
# PreToolUse(Edit/Write) hook — exits 2 if secret detected, 0 otherwise

content=$(jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null)

if [[ -z "$content" ]]; then
  exit 0
fi

# Dangerous patterns: AWS keys, API keys, passwords, tokens
if echo "$content" | grep -qiE 'sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|password\s*=\s*["'"'"'][^"'"'"']{6,}|api[_-]?key\s*=\s*["'"'"'][^"'"'"']+["'"'"']|bearer\s+[A-Za-z0-9\._\-]{20,}|token\s*=\s*["'"'"'][^"'"'"']+["'"'"']'; then
  echo "SECRET DETECTED: Hardcoded API key, password, or token found. Use environment variables instead." >&2
  exit 2
fi

exit 0

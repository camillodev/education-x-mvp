#!/usr/bin/env bash

# Blocks dangerous bash commands: rm -rf /, git push --force, git reset --hard, SQL DROP
# PreToolUse(Bash) hook — exits 2 to BLOCK execution, 0 if safe

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)

if [[ -z "$cmd" ]]; then
  exit 0
fi

# Check for dangerous patterns
if echo "$cmd" | grep -qiE 'rm -rf /|rm -rf ~|git push.*--force|git reset --hard|DROP TABLE|DROP DATABASE'; then
  echo "BLOCKED: Dangerous command detected: $cmd" >&2
  exit 2
fi

exit 0

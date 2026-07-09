#!/usr/bin/env bash

# PostToolUse hook — drops a session marker when a Linear issue is
# created/updated via MCP, so linear-ticket-guard.sh stops nagging.
# Always exits 0.

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty' 2>/dev/null)

if [[ -z "$session_id" ]]; then
  exit 0
fi

touch "${TMPDIR:-/tmp}/linear-ticket-${session_id}"

exit 0

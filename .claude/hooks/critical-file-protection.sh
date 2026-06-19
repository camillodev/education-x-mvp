#!/usr/bin/env bash

# Warns before editing critical files (auth, payment, migrations, workflows)
# PreToolUse(Edit) hook — exits 2 to require human confirmation, 0 otherwise

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$file" ]]; then
  exit 0
fi

# Critical file patterns that should require explicit human approval
if echo "$file" | grep -qiE 'middleware|migrations/|\.github/workflows|auth|payment|billing|security'; then
  echo "CRITICAL FILE: Editing sensitive infrastructure. Please review carefully." >&2
  echo "  File: $file" >&2
  echo "  Confirm this change is intentional and tested." >&2
  exit 2
fi

exit 0

#!/usr/bin/env bash

# Runs TypeScript type check after .ts/.tsx edit (informative only)
# PostToolUse(Edit/Write) hook — always exits 0 (never blocks)

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$file" ]]; then
  exit 0
fi

# Only check TypeScript files
if ! [[ "$file" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-.}"

# Check if tsconfig.json exists
if [[ ! -f "$project_dir/tsconfig.json" ]]; then
  exit 0
fi

# Run type check if tsc is available
if command -v tsc &> /dev/null; then
  echo "TypeScript check: $file" >&2
  tsc --noEmit 2>&1 | head -20 >&2 || true
fi

exit 0

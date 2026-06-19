#!/usr/bin/env bash

# Runs lint check before git commit if script exists in package.json
# PreToolUse(Bash) hook — exits 2 if lint fails, 0 otherwise

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null)

if [[ ! "$cmd" =~ git\ commit ]]; then
  exit 0
fi

# Check if package.json exists and has lint script
project_dir="${CLAUDE_PROJECT_DIR:-.}"
if [[ ! -f "$project_dir/package.json" ]]; then
  exit 0
fi

if ! grep -q '"lint"' "$project_dir/package.json" 2>/dev/null; then
  exit 0
fi

# Run lint — if npm/prettier/biome doesn't exist, gracefully degrade
if ! command -v npm &> /dev/null; then
  exit 0
fi

if ! npm run lint --silent 2>/dev/null; then
  echo "LINT FAILED: Fix linting errors before committing" >&2
  exit 2
fi

exit 0

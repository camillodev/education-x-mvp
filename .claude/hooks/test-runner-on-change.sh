#!/usr/bin/env bash

# Runs test suite after file edit (informative only)
# PostToolUse(Edit/Write) hook — always exits 0 (never blocks)

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$file" ]]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-.}"

# Check if package.json exists with test script
if [[ ! -f "$project_dir/package.json" ]]; then
  exit 0
fi

if ! grep -q '"test"' "$project_dir/package.json" 2>/dev/null; then
  exit 0
fi

# Run tests if npm is available
if command -v npm &> /dev/null; then
  echo "Running tests..." >&2
  if command -v vitest &> /dev/null; then
    npm run test -- --related "$file" 2>&1 | tail -20 >&2 || true
  else
    npm test --silent -- --bail 2>&1 | tail -20 >&2 || true
  fi
fi

exit 0

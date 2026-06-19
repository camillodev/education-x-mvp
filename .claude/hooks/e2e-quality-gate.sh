#!/usr/bin/env bash

# Runs E2E tests before declaring feature complete
# Stop hook — exits 2 if E2E fails, 0 otherwise. Avoids loops via stop_hook_active flag.

# Avoid infinite loops if this hook is already running
stop_hook_active=$(jq -r '.stop_hook_active // false' 2>/dev/null)
if [[ "$stop_hook_active" == "true" ]]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-.}"

# Check if package.json exists
if [[ ! -f "$project_dir/package.json" ]]; then
  exit 0
fi

# Check if test:e2e script exists
if ! grep -q '"test:e2e"\|"e2e"' "$project_dir/package.json" 2>/dev/null; then
  exit 0
fi

# Run E2E tests if npm is available
if command -v npm &> /dev/null; then
  echo "Running E2E tests..." >&2

  if npm run test:e2e --silent 2>/dev/null || npm run e2e --silent 2>/dev/null; then
    exit 0
  else
    echo "E2E TESTS FAILED: Do not declare feature complete until tests pass." >&2
    exit 2
  fi
fi

exit 0

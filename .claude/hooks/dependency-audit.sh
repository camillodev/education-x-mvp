#!/usr/bin/env bash

# Checks npm dependencies for high-severity vulnerabilities at session start
# SessionStart hook — always exits 0 (informative only, never blocks)

project_dir="${CLAUDE_PROJECT_DIR:-.}"

# Check if package.json exists
if [[ ! -f "$project_dir/package.json" ]]; then
  exit 0
fi

# Run audit if npm is available
if command -v npm &> /dev/null; then
  echo "Checking dependencies for vulnerabilities..." >&2
  audit_output=$(npm audit --audit-level=high 2>/dev/null || true)

  if echo "$audit_output" | grep -qi "vulnerability\|high\|critical"; then
    echo "$audit_output" >&2
    echo "RECOMMENDATION: Run 'npm audit fix' to patch vulnerabilities" >&2
  else
    echo "Dependencies: No high-severity vulnerabilities detected ✓" >&2
  fi
fi

exit 0

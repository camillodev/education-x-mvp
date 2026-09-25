#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit) — runs check-language.mjs against the file just
# touched so an agent gets immediate feedback instead of finding out at `pnpm lint`.
# See .claude/rules/code-standards.md.

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$file" ]]; then
  exit 0
fi

case "$file" in
  *.ts|*.tsx|*.mjs|*.js) ;;
  *) exit 0 ;;
esac

cd "$CLAUDE_PROJECT_DIR" || exit 0

if [[ ! -f "$file" ]]; then
  exit 0
fi

rel_file=$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], sys.argv[2]))" "$file" "$CLAUDE_PROJECT_DIR" 2>/dev/null || echo "$file")

output=$(node scripts/check-language.mjs --files "$rel_file" 2>&1)
status=$?

if [[ $status -ne 0 ]]; then
  echo "$output" >&2
  echo "" >&2
  echo "Fix per .claude/rules/code-standards.md before continuing (delete > rename > translate)." >&2
  exit 2
fi

exit 0

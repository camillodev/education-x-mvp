#!/usr/bin/env bash

# Runs formatter (prettier/biome) on file after edit
# PostToolUse(Edit/Write) hook — always exits 0 (informative only, never blocks)

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [[ -z "$file" ]]; then
  exit 0
fi

project_dir="${CLAUDE_PROJECT_DIR:-.}"

# Check if prettier or biome exists
if command -v prettier &> /dev/null; then
  prettier --write "$file" 2>/dev/null || true
  exit 0
fi

if command -v biome &> /dev/null; then
  biome format --write "$file" 2>/dev/null || true
  exit 0
fi

# No formatter found, gracefully degrade
exit 0

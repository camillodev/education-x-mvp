#!/usr/bin/env bash

# Reminds to use superpowers skill before coding on feature/bug/fix/refactor
# UserPromptSubmit hook — always exits 0 (informative only)

prompt=$(jq -r '.prompt // empty' 2>/dev/null)

if [[ -z "$prompt" ]]; then
  exit 0
fi

# Check for engineering keywords that trigger superpowers workflow
if echo "$prompt" | grep -qiE 'feature|bug|fix|refactor|implementa|cria|build|deploy|debug|test|review|PR'; then
  cat >&2 <<'EOF'

┌─ ENGINEERING WORKFLOW REMINDER ─┐
│                                  │
│ Use superpowers skill BEFORE     │
│ coding on this task:             │
│                                  │
│ • superpowers:brainstorming      │
│   (if intent unclear)            │
│ • superpowers:writing-plans      │
│   (if ≥3 files involved)         │
│ • superpowers:test-driven-dev    │
│   (for new features)             │
│ • superpowers:systematic-debug   │
│   (for bugs)                     │
│ • superpowers:verification-      │
│   before-completion (before done)│
│                                  │
│ Skill is mandatory, not optional.│
└──────────────────────────────────┘

EOF
fi

exit 0

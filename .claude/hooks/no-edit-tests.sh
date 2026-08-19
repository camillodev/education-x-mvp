#!/usr/bin/env bash

# PreToolUse(Edit|Write|MultiEdit) hook — blocks edits to test files
# (*.spec.ts, *.test.ts, *.spec.tsx, *.test.tsx) while the code-implementer
# agent has an active turn.
#
# WHY A MARKER FILE INSTEAD OF DETECTING THE CALLER DIRECTLY:
# The PreToolUse payload this Claude Code version sends does not include a
# subagent_type / agent-identity field. The documented/observed payload shape
# is limited to: session_id, transcript_path, cwd, hook_event_name, tool_name,
# tool_input (cross-checked against an independent hook-observability
# integration found on this machine at
# ~/projetos/_archive/claude-code-hooks-multi-agent-observability/app_docs/send_event_with_model_how_to.md,
# which documents PreToolUse payload fields and shows subagent identity only
# appearing in dedicated SubagentStart/SubagentStop events, not PreToolUse).
# No hook in *this* repo reads subagent identity from a PreToolUse payload
# either, which is consistent with that field not being available. So this
# hook CANNOT ask "did code-implementer make this call?" directly — that
# information isn't in its input.
#
# Design chosen: same marker-file pattern as linear-mark-ticket.sh /
# linear-ticket-guard.sh, but keyed on a FIXED per-project path, not on
# session_id. Reason: it is unconfirmed whether a Task-spawned subagent
# shares its parent's session_id. If it gets a fresh one, a marker keyed on
# session_id (set by the orchestrator) would be invisible inside the
# subagent's own hook invocations, and this hook would silently never fire —
# the worst failure mode for a safety gate. A fixed path avoids that risk at
# the cost of being coarser (any concurrent Task in this project sees the
# same marker).
#
# code-implementer (introduced in Phase 3) is responsible for touching this
# marker: create it when its turn starts, remove it when its turn ends. Until
# code-implementer exists, nothing ever sets the marker, so this hook is a
# permanent no-op (never blocks) — verified by the synthetic tests below.
#
# Rejected alternative: block unconditionally for every caller. Rejected
# because docs/PLANO-TIME-AGENTS.md §3 defines a `test-writer` agent with
# Read/Write/Edit/Bash whose entire job is to write *.spec.ts files — an
# unconditional block would permanently break that documented agent.
#
# Exit code 2 blocks (same convention as dangerous-command-blocker.sh).

MARKER="${CLAUDE_PROJECT_DIR:-.}/.claude/.code-implementer-active"

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty' 2>/dev/null)

# Only Edit/Write/MultiEdit reach this hook per the settings.json matcher,
# but keep the check defensive in case the matcher is ever widened.
case "$tool_name" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

if [[ ! -f "$MARKER" ]]; then
  exit 0
fi

file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)

if [[ -z "$file_path" ]]; then
  exit 0
fi

if echo "$file_path" | grep -qE '\.(spec|test)\.(ts|tsx)$'; then
  echo "BLOCKED: code-implementer não pode editar arquivos de teste ($file_path). Isso é CI gaming — se o teste está falhando, o código precisa mudar, não o teste. Peça pro test-writer ajustar o teste se ele estiver genuinamente errado." >&2
  exit 2
fi

exit 0

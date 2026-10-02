# Data privacy in multi-agent dispatch

Domain rule for any orchestration that dispatches a subagent with a prompt built from live data. Applies whenever an orchestrator hands off context to a subagent that doesn't need the raw sensitive values to do its job.

## The problem

Parallel/dispatched subagents often receive a prompt assembled from real data (financial figures, strategic plans, personal information) so they have enough context to work — but the actual task (drafting, summarizing, formatting) rarely needs the exact values, only the shape of them.

## Pattern

Before dispatching a subagent whose prompt contains sensitive data:

1. **Detect** — scan the prompt for the sensitive categories relevant to the domain (e.g. revenue figures, compensation, account numbers, personal identifiers).
2. **Mask** — replace exact values with a confidentiality header/wrapper that:
   - States the data is confidential and must not be echoed back in full.
   - Lists what must be masked vs. what derived output is allowed (trends, ranges, ratios — not absolute values).
   - Instructs the subagent not to invent numbers if it doesn't have them, and not to repeat masked values verbatim.
3. **Return derived output only** — the subagent should reason about and report on relative/derived signals, not restate the raw sensitive value; if it needs an exact figure, it asks the orchestrator rather than guessing or leaking what it was given.

## Responsibilities

- **Orchestrator**: applies the mask before dispatch — either by prepending the header manually or via a detection step in the dispatch pipeline.
- **Subagent**: honors the protocol — never exposes absolute values in its output, requests the exact figure from the orchestrator if genuinely needed.
- **Reviewer** (human or agent): spot-checks subagent output/logs for leaked values.

## Why this belongs at the orchestration layer, not the subagent's judgment

A subagent cannot be trusted to decide on its own what's sensitive — it only sees the prompt it was given. The masking decision has to happen before dispatch, at the point where the orchestrator still has the full context to know what's actually sensitive in a given domain.

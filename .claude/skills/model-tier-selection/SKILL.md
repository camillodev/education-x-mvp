---
name: model-tier-selection
description: Use when about to read context files, write mechanical code, or decide architecture — before dispatching a subagent or doing the work yourself. Symptoms — "should I read this myself or delegate", "is this a Sonnet or Opus decision", "am I burning an expensive model on grunt work". Cost-efficiency companion to superpowers:dispatching-parallel-agents, which covers *when to parallelize*, not *which model tier to use*.
---

# Model Tier Selection

## Overview

The goal is cost: never spend a Sonnet/Opus token reading a file, transcribing data, or writing mechanical code that a Haiku subagent does for a fraction of the cost. Never spend an Opus token on a decision Sonnet already handles well. This is the tier-selection half of efficient orchestration — for the *parallelism* half (when to split work across N concurrent agents), see `superpowers:dispatching-parallel-agents`. Use both together: this skill picks the tier, that skill structures the dispatch.

## Quick reference

| Tier | Use for | Never for |
|---|---|---|
| **Haiku** (subagent) | Reading files/context, extracting data, transcribing, mechanical/boilerplate code, isolated refactors, format conversion | Architectural judgment, weighing trade-offs, anything where being wrong is expensive |
| **Sonnet** (you, or orchestrating) | Reasoning over what Haiku already found, reviewing output, architecture within an established pattern, integrating parallel results | Reading raw file contents end-to-end when a Haiku summary would do the same job for less |
| **Opus** (`advisor()` or an Opus-tier agent) | Decisions that fail the reversibility test (below) — schema, tenant isolation, payment contract, irreversible structural choice | Routine feature work, anything Sonnet already resolves correctly |

## The core rule

**Sonnet and Opus should almost never read a file end-to-end just to gather context.** If the task is "go read these 5 files and tell me what's there," dispatch a Haiku subagent (or several, in parallel — see `dispatching-parallel-agents`) and have it return a distilled summary. Reserve your own reading for the file that IS the decision — the diff you're about to edit, the one artifact whose exact wording matters for what you write next.

## Escalating Sonnet → Opus: the reversibility test

Don't escalate on vibes ("this feels important"). Ask one question:

> **Does this decision reverse in a small PR, or does the product get stuck with it for months?**

- **Small PR** → Sonnet decides. Most feature work, most bug fixes, most blueprints inside an established pattern.
- **Months** → Opus territory. Concretely: schema changes that need a data migration once real rows exist, tenant/auth isolation model, a payment integration's contract (idempotency key shape, webhook URL/token format), or introducing a second way to do something that already has one established pattern.

This is the same test `system-architect` and `edx-adr` already use for when a decision needs a written ADR — it's one test, reused everywhere a tier decision comes up, not a separate rule to memorize.

**Always confirm with the user before spending an Opus call** — it's the expensive tier; a wrong escalation costs real money for no benefit.

## Applying this

1. About to read multiple files just to build context? → Haiku subagent(s), not you.
2. About to write boilerplate/mechanical code with no judgment call? → Haiku subagent.
3. About to decide something inside a pattern that already exists? → Sonnet, no escalation.
4. About to decide something that fails the reversibility test above? → Escalate to Opus, but confirm with the user first.
5. Multiple independent things to read or build in parallel? → Combine with `dispatching-parallel-agents` for the dispatch structure; this skill only picked the tier for each piece.

## Common mistakes

- Reading 5 context files yourself "because it's faster than delegating" — the token cost of a Sonnet/Opus read is the thing being optimized away; perceived speed isn't the metric.
- Escalating to Opus because a task "sounds architectural" without running the reversibility test — plenty of architecture-flavored work reverses easily and belongs at Sonnet.
- Using Haiku for a decision with real trade-offs (it will produce a plausible-sounding but shallow answer) instead of for the mechanical retrieval/writing it's actually good at.

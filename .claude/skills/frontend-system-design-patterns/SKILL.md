---
name: frontend-system-design-patterns
description: Use when designing the architecture of a frontend feature or app-level UI system — component/store/data-layer boundaries, client-server data flow, or where a piece of state should live. Symptoms — "should this be client or server state", "where does this computation belong", "how do components talk to each other", "what's the data model for this screen". Loaded by feature-architect when blueprinting a new feature or screen inside the established pattern.
---

# Frontend System Design Patterns

## Overview

The **RADIO framework** (Requirements → Architecture → Data model → Interface → Optimizations) structures how to design a frontend feature or app end-to-end — not just which component to render, but where state lives, how data flows, and what's actually worth optimizing. Companion to `system-design-patterns` (backend/general) and `api-design-patterns` (contracts) — this skill is the frontend-specific lens on the same discipline: name the real forces in tension before reaching for a pattern.

## RADIO framework

| Phase | Weight | What happens |
|---|---|---|
| **R**equirements | ~10% | Name the core use cases (not every possible feature). Split functional (must work) from non-functional (perf, a11y, offline — improve but don't block). Write requirements down and hold the design to them. |
| **A**rchitecture | ~20% | Identify components and their relationships: server (treated as a black box exposing an API), view layer (renders + local state), store/model layer (centralized shared state), data access layer (fetching, caching, error handling). Draw the data-flow, don't just list boxes. |
| **D**ata model | ~10% | For each entity: fields, types, who owns it. Classify by origin — server-originated (multi-device, needs sync), client-originated persistent (form input that must reach the backend), client-originated ephemeral (UI-only state like "is this accordion open"). |
| **I**nterface | ~20% | Define every contract between components: server↔client (REST/GraphQL/WebSocket/SSE — see `api-design-patterns` for the server side of this) and client↔client (props/callbacks, store actions, pub/sub). Name each API's parameters and response shape. |
| **O**ptimizations | ~40% | The deep dive — whatever is unique to *this* product: perf, networking, UX polish, accessibility, SEO, i18n, security. Deliberately skip generic framework/tooling debates here; only go deep on what this specific feature actually needs. |

Non-linear: treat it as a checklist to revisit, not a waterfall. A data-model insight in phase D can (and should) send you back to revise Architecture.

## Where state lives — the recurring decision

The single most common frontend architecture question RADIO's "Architecture" and "Data model" phases exist to answer: **client state, server state, or ephemeral UI state — and who owns it?**

| State type | Lives in | Example | Anti-pattern |
|---|---|---|---|
| Server-originated | Data access layer (React Query/Apollo-style cache), not component state | User profile, list of invoices | Re-fetching in `useEffect` when a Server Component could have fetched it once, before render |
| Client-originated, persistent | Local form state → synced to server on submit/blur | Draft form input, user settings toggle | Writing every keystroke to the server (chatty, unnecessary round-trips) |
| Client-originated, ephemeral | Component-local state or a lightweight UI store (Zustand-style) — never the server | "Is this modal open", "which tab is active" | Pushing UI-only state into the same global store as server data — couples unrelated concerns and forces unnecessary re-renders |

This table is the frontend-specific instance of the general principle in `system-design-patterns`: name the real force in tension (here: sync cost vs. staleness vs. re-render cost) before picking where something lives.

## Applying this to a real decision

1. Run Requirements first — a design built before requirements are named tends to over-build the Architecture phase for cases that don't exist.
2. In Architecture, draw the four layers (view / store / data-access / server-as-black-box) even for a small feature — skipping this is how business logic ends up inside a component (see `.claude/rules/frontend.md` "Component nunca chama Prisma/Asaas direto" for the concrete rule this prevents).
3. In Data model, classify every field by origin (table above) before writing a single line of state management code.
4. In Interface, the server-side contract follows `api-design-patterns`; the client-side contract (props, store actions) follows the same discipline — name parameters and shape explicitly, don't leave it implicit in the component body.
5. Optimizations is where 40% of the real thinking happens — resist the urge to front-load it. A feature's actual bottleneck (a large list needing virtualization, a form needing debounce, a screen needing SSR for SEO) only becomes visible once the first four phases are named.

## Common mistakes

- Skipping Requirements and jumping to component structure — produces an Architecture sized for imagined edge cases instead of the actual core use case.
- Treating ephemeral UI state and server state as the same kind of "state" and putting both in one global store — causes unnecessary re-renders and makes the server-sync boundary fuzzy.
- Doing all four non-Optimization phases from memory without drawing the data-flow — the diagram is what surfaces a missing layer (e.g. a component about to call an API directly, skipping the data-access layer).
- Spending Optimization-phase time on generic topics (which framework, which bundler) instead of what's actually unique to this feature — see `.claude/rules/frontend.md` "Anti-padrões de performance" in the active repo for the concrete instances (`useEffect` fetch that a Server Component could avoid, barrel-file imports bloating the client bundle).

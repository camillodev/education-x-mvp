---
name: system-design-patterns
description: Use when deciding foundational architecture — schema, tenancy model, async/webhook design, caching, or any structural choice that would take a rewrite (not a small PR) to reverse. Symptoms — "should this be a queue or a cron", "do we need sharding", "how should tenants be isolated", "is this over-engineering for our scale". Loaded by system-architect before proposing any irreversible decision.
---

# System Design Patterns

## Overview

Vocabulary and a decision framework for evaluating architecture trade-offs — not a textbook. Each pattern below pairs with a real, named case so it can be recognized and applied, not just recited. Companion to `engineering:system-design` (the generic 5-step process: Requirements → High-Level Design → Deep Dive → Scale/Reliability → Trade-off Analysis) — that skill is the process skeleton; this one is the content that fills its "Trade-off Analysis" and "Scale and Reliability" steps with named patterns instead of invented generalities.

**Core principle:** every architecture decision balances competing forces. The skill is naming which forces are actually in tension for *this* decision, then checking whether the current scale justifies paying for the trade-off at all.

## The decision triangle(s)

Not one triangle — the right one depends on what kind of force is in tension. Pick first, then reason inside it.

| Decision is about... | Triangle | Use when |
|---|---|---|
| Distributed data (DB, cache, replicas) | **CAP** — Consistency / Availability / Partition tolerance | Choosing replication, cache invalidation, multi-region reads |
| How to build the system itself | **Simplicity / Delivery speed / Future scale** | Monolith vs. services, framework choice, build-vs-buy |
| Async/background reliability | **Latency / Consistency / Retry cost** | Webhooks, queues, crons, event processing |

Most real decisions are the middle one — teams reach for CAP-flavored reasoning on problems that are actually about delivery speed vs. premature scale, which is how a 10-tenant product ends up with a message queue it doesn't need.

## Decision flow

```
1. Name which triangle is in play (table above).
2. Name the REAL current volume (users, tenants, req/s) — not the volume you might hit someday.
3. Ask: does a plain, boring version handle that volume? If yes, that's the answer — stop.
4. If no, pick the ONE pattern below that addresses the specific bottleneck, cite its case.
5. Reversibility test: does this reverse in a small PR, or does the product get stuck with it for months?
   → Small PR: decide it yourself, move on.
   → Months: this is system-architect territory — write the ADR (see edx-adr).
```

Step 3 is the one people skip. Most "should we use X pattern" questions resolve at step 3.

## Patterns, by category

Each row: the pattern, the one-line trade-off, and a real case to anchor it — not a toy example.

### Data

| Pattern | Trade-off | Case |
|---|---|---|
| Sharding | Horizontal write scale, but cross-shard queries and rebalancing get hard | Instagram — sharded Postgres with IDs encoding shard + timestamp, avoiding a central ID-generation bottleneck |
| Read replica | Cheap read scale, but replication lag means reads can be stale | Standard pattern once read load, not write load, is the bottleneck |
| CQRS | Read and write models optimized separately, but you maintain two models and a sync path | Justified when read and write shapes have genuinely diverged — not by default |
| Event sourcing | Full audit trail and replay, but every read is a projection you must build and keep correct | Justified when the audit trail itself is the product requirement (e.g. financial ledgers), not for CRUD |

### Async consistency

| Pattern | Trade-off | Case |
|---|---|---|
| Idempotency key (deterministic) | Safe retries, no double-processing — costs one unique constraint | Stripe — every mutating request carries a client-generated `Idempotency-Key`; retried requests return the original result instead of double-charging |
| Saga (vs. 2PC) | No distributed lock, but you write compensating actions for every step | Justified when a transaction spans services/providers that can't share a DB transaction |
| Outbox pattern | Guarantees "write to DB" and "publish event" don't diverge, at the cost of a poller/relay | Justified once "DB committed but event never published" has actually caused a bug |

### Resilience

| Pattern | Trade-off | Case |
|---|---|---|
| Circuit breaker | Stops hammering a failing dependency, but requests fail fast during the open window | Netflix/Hystrix — trip after N failures, fail fast, half-open probe to recover, so one slow dependency doesn't cascade into a full outage |
| Retry with exponential backoff | Absorbs transient failures, but naive retries amplify load during an outage — always cap + jitter | Standard for any external API call (payment gateway, third-party webhook) |
| Bulkhead | Isolates failure domains so one slow path doesn't starve the rest | Justified once a single overloaded dependency has taken down unrelated request paths |

### Read/traffic scale

| Pattern | Trade-off | Case |
|---|---|---|
| Cache-aside vs. write-through | Cache-aside is simpler and lazy; write-through stays fresher but writes cost more | Default to cache-aside unless staleness is provably unacceptable |
| Fanout-on-write vs. fanout-on-read | Write fanout makes reads instant but costs storage + write amplification; read fanout is cheap to write, expensive to read at scale | Twitter — celebrity accounts break naive write-fanout (millions of followers), so high-follower accounts fall back to read-time fanout |
| Rate limiting (token bucket vs. sliding window) | Token bucket allows bursts within a budget; sliding window is smoother but costs more state | Pick based on whether bursty traffic is legitimate (token bucket) or should be flattened (sliding window) |

### Multi-tenancy

| Pattern | Trade-off | Case |
|---|---|---|
| Isolation by application layer | No DB-level guarantee, but simple, testable, no per-tenant DB overhead | Education Hub ADR-0002 — Prisma Client Extension injects `unitId` on every query (`src/lib/db.ts`); chosen because the product runs 10-50 tenants, not thousands, so app-layer isolation is sufficient and RLS would be premature |
| Row-Level Security (RLS) | DB enforces isolation even if application code forgets — the safety net app-layer isolation lacks | Justified once tenant count or compliance requirement makes "app code always remembers" an unacceptable risk |
| Schema-per-tenant / DB-per-tenant | Strongest isolation, but migrations and connection pooling multiply per tenant | Justified only at enterprise-tenant scale where a handful of large, high-compliance tenants dominate — wrong default for many-small-tenants products |

## Anti-patterns by stage

The same pattern is correct at one stage and pure over-engineering at another. Name the stage before rejecting or adopting anything.

| Stage | Reject by default | Revisit when |
|---|---|---|
| MVP / early (this describes most new products, including Education Hub today: 10-50 tenants, 50-300 users each) | Dedicated queue (Redis/BullMQ), distributed cache, multi-region, microservices, CQRS, event sourcing | Real volume — not projected volume — breaks the boring version at step 3 of the decision flow |
| Scale-up (hundreds of tenants, sustained write load) | Still resist microservices; do reach for read replicas, RLS, targeted caching | A single, measured bottleneck (not a vague "it might get slow") |
| Large scale (thousands of tenants / millions of users) | — | This is where sharding, dedicated queues, and service boundaries earn their complexity cost |

Education Hub's own `docs/product/SYSTEM-DESIGN.md` §8 ("O que NÃO implementar agora") is a real, already-written instance of this table's MVP row — same reasoning, applied and documented.

## Applying this to a real decision

1. Read the request — what's actually being decided (not what pattern someone already assumes).
2. Run the decision flow above.
3. If it clears the reversibility test as irreversible: write the ADR — see `edx-adr` for format, and check `docs/decisions/` for a prior ADR this would contradict or extend.
4. Per-layer anti-patterns already documented for a specific repo live in that repo's `.claude/rules/{backend,database,infra,frontend}.md` — point to those instead of re-deriving them here.

## Common mistakes

- Reaching for a pattern because it's famous, not because the named volume requires it (cargo-culting Twitter's fanout split onto a 200-user app).
- Treating CAP as the only triangle — most early-stage decisions are actually simplicity-vs-scale, not consistency-vs-availability.
- Skipping step 3 of the decision flow (does the boring version work?) and jumping straight to pattern selection.
- Citing a pattern without its trade-off — "we should use CQRS" without naming what gets harder is not a decision, it's a name-drop.

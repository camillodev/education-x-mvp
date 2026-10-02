---
name: api-design-patterns
description: Use when designing or reviewing an API contract — endpoint naming, HTTP method choice, status codes, pagination, versioning, idempotency, or error response shape. Symptoms — "should this be POST or PUT", "how do we version this", "what status code for X", "how do we prevent duplicate charges on retry". Loaded by system-architect for structural API decisions (REST vs GraphQL, versioning strategy) and by feature-architect when blueprinting a new endpoint inside the established pattern.
---

# API Design Patterns

## Overview

Nine principles and a REST conventions checklist for designing API contracts that are consistent, safe to retry, and evolve without breaking clients. Default to REST unless a specific requirement (real-time push, complex nested queries) justifies something else — REST is the right default in most system design, not a compromise.

## Nine core principles

1. **Resource-centric** — model around entities (`orders`, `invoices`), not actions (`/createOrder`). An endpoint list that reads like a list of nouns, not verbs, is doing this right.
2. **Consistency** — identical naming convention, casing, and response envelope across every endpoint. One inconsistent endpoint costs more trust than ten missing ones.
3. **Principle of least surprise** — HTTP semantics mean what they conventionally mean: GET retrieves, DELETE removes, 200 means success. Don't repurpose a verb to save an endpoint.
4. **Statelessness** — every request carries all context needed to process it; no server-side session state between requests.
5. **Safe retries (idempotency)** — a client must be able to retry a request after a timeout without causing a duplicate side effect. This is the single highest-leverage principle for anything that touches money or triggers an external system.
6. **Pagination from day one** — anything that can grow unbounded needs pagination before it grows, not after the first timeout in production.
7. **Security by default** — every endpoint requires auth unless it's deliberately public; public is the exception you name, not the default you forget to lock down.
8. **Non-breaking evolution** — add fields freely; never rename or remove a field a client might already depend on. That's what versioning is for.
9. **Actionable errors** — every error response gives a machine-readable code AND a human-readable message; a client (and a developer reading logs) should never have to guess what went wrong.

## REST conventions checklist

| Concern | Rule |
|---|---|
| HTTP methods | GET (retrieve, safe+idempotent) · POST (create, NOT idempotent) · PUT (replace whole resource, idempotent) · PATCH (partial update) · DELETE (remove, idempotent) |
| Data placement | Path params for required resource identity (`/orders/{id}`) · query params for optional filter/sort (`?status=paid`) · body for complex create/update payloads |
| Status codes | 200 (success) · 201 (created) · 204 (success, no body) · 400 (malformed/invalid request) · 401 (missing/invalid auth) · 403 (authenticated but not allowed) · 404 (not found) · 500 (server error) |
| Pagination | Cursor-based for real-time/frequently-changing data (avoids skip/duplicate on insert) · offset-based acceptable for stable, smaller datasets |
| Idempotency | Client-generated idempotency key on risky POSTs (payments, bookings, anything with an external side effect) — server dedupes by key, returns the original result on retry |
| Versioning | URL-based (`/v1/orders`) preferred for visibility and cacheability over header-based; whichever is chosen, apply it consistently |
| Auth | JWT for user-facing APIs; API key or mTLS for service-to-service |
| Error shape | Consistent envelope: `{ error: "MachineReadableCode", message: "human sentence", details: [...] }` — never a bare stack trace or a string-only error |

## Idempotency — the pattern worth over-indexing on

The one principle most likely to cause a real production incident if skipped: a retried request (client timeout, network blip, user double-click) must not double-charge, double-book, or double-send.

**Case: Stripe idempotency keys.** Every mutating request carries a client-generated `Idempotency-Key` header. The server stores the key alongside the result of the first successful execution; any retry with the same key returns that stored result instead of re-executing the operation. This is the mechanism, not just the name — the key must be generated once per logical operation (not once per retry) and reused across all retries of that same operation.

This maps directly onto any billing/payment integration: a deterministic external-reference key generated once at creation time (not regenerated per retry) plus a lookup-before-create step is the same pattern under a different name.

## Applying this to a real decision

1. Is this a new resource, or a new action on an existing resource? If it's an action that doesn't map to CRUD (e.g. "approve", "cancel"), model it as a sub-resource or state transition (`POST /orders/{id}/cancel`), not a new top-level verb endpoint.
2. Does this endpoint touch money, send a message, or trigger an external system? If yes, idempotency key is not optional — treat its absence as a bug, not a nice-to-have.
3. Will this response set grow past what one round-trip should return? Add pagination now, not when the first timeout happens.
4. Structural choices (REST vs GraphQL, global versioning strategy) are `system-architect` territory — reversibility test applies (see `system-design-patterns`). Applying the established convention to one new endpoint is `feature-architect` territory — no new ADR needed.

## Common mistakes

- Action-named endpoints (`/createUser`, `/updateStatus`) instead of resource + HTTP method (`POST /users`, `PATCH /orders/{id}`).
- POST used for an operation that's actually idempotent (should be PUT) — makes safe retry impossible without extra machinery.
- Returning 200 for an error, with the real status buried in a JSON `success: false` field — breaks every HTTP-aware client/cache/proxy.
- Removing or renaming a field on version bump without a deprecation window — the "non-breaking" principle isn't optional just because it's inconvenient.
- Building pagination only after a `findMany()` without `take` has already caused a production timeout — see `.claude/rules/backend.md` and `.claude/rules/database.md` in the active repo for language-specific instances of this same mistake.

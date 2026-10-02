# Product ticket standards

Domain rule for writing or triaging work-tracking tickets, tool-agnostic (applies regardless of which issue tracker is in use).

## Philosophy

1. **A good ticket is a short ticket** — if it takes more than one screen to read, it's too long.
2. **A clean backlog beats a complete backlog** — 10 well-prioritized tickets beat 50 accumulated ones.
3. **Acceptance criteria are the deliverable** — if it isn't in the ACs, it doesn't count as done.
4. **No vanity labels** — only labels that are actually used to filter or decide something.

## Ticket format

```
## [Type]: [Concise title — action + object, max ~10 words]

### Problem
[1-2 sentences: what's wrong or what needs to exist]

### Solution
[1-3 bullets: what to do — not how to implement it]

### Acceptance Criteria
- [ ] [verifiable criterion 1]
- [ ] [verifiable criterion 2]

### Size: [XS | S | M | L | XL]
### Priority: [P0 | P1 | P2 | P3]
```

- **Title**: action + object ("Implement JWT auth", not "We need authentication").
- **Problem**: minimum context needed, not a history lesson.
- **Solution**: the WHAT, not the HOW.
- **Acceptance criteria**: verifiable by review or a test, not vague ("login works well" is not a criterion; "user can log in and lands on dashboard" is).
- **Size**: roughly XS (<2h) · S (half day) · M (1 day) · L (2-3 days) · XL (should be split into smaller tickets before starting).
- **Priority**: P0 blocks everything · P1 this cycle · P2 next cycle · P3 whenever.

## Anti-patterns

- Tickets with 3+ paragraphs of backstory.
- Vague acceptance criteria ("works correctly").
- Mixing problem, solution, and implementation detail in one block.
- A backlog with dozens of open, unprioritized tickets.
- Labels nobody actually filters by.
- Epics left undecomposed into workable tickets.
- Committing a cycle to more than its real capacity.
- A ticket without a type or priority.

## Triage

When a backlog needs cleanup: classify each open item (actively relevant / valid but not now / dead — no movement and no relevance), then prioritize the "actively relevant" set by impact × confidence × ease, and update priorities to match.

# Security checklist

Domain rule for any code that handles authentication, user data, or external input. Applies whenever an agent writes, reviews, or audits backend/API code — regardless of stack.

## OWASP Top 10 — threat model

**1. Injection** — never interpolate user input into a query. Use an ORM or parameterized queries. Validate every parameter passed to a raw/RPC-style query before it reaches the database.

**2. Broken authentication** — validate tokens server-side, never trust a client-supplied session object. Verify signature, expiry, and issuer on every request. Store refresh tokens in httpOnly cookies, never in localStorage. Rate-limit auth endpoints.

**3. Sensitive data exposure** — anything shipped to the browser (public env vars, client bundles) is public by definition; never put admin keys, signing secrets, or write-capable API keys there. Never log emails, tokens, passwords, or financial data — mask in structured logs.

**4. Security misconfiguration** — whitelist CORS origins explicitly, never wildcard in production. Disable stack traces in error responses outside development. Remove default/permissive policies before going live.

**5. XSS** — trust the framework's auto-escaping; never inject raw HTML from user input. Sanitize explicitly if raw HTML is unavoidable. Restrict script sources via CSP.

**6. Broken access control** — enable row-level security (or equivalent) on every table holding user data; without it, data is public by default. Every read/write policy must filter by the requesting user's identity, not trust a client-supplied ID. Test policies with more than one user role, including anonymous.

**7. SSRF** — validate any URL before a server-side fetch: protocol, and block requests to private/internal IP ranges. Whitelist allowed domains for webhooks and callbacks.

**8. Input validation** — validate at every system boundary (API input, webhook payload, form data) with a schema, not ad-hoc checks. Fail fast. Never trust data from an external API without validating it first. Validate file uploads by content, not just extension.

## Financial/sensitive-data specific

When a system moves money or holds financial data:
- Every financial query must be scoped to the requesting user — no exceptions.
- Money movement requires a confirmation or second-auth step.
- Audit log every financial operation: who, what, when, amount.
- Store currency as integer cents (or fixed-point decimal), never floating point.
- Rate-limit financial endpoints more aggressively than general API traffic.

## Environment variables

- Validate all env vars at startup with a schema; crash on invalid config rather than falling back silently.
- Never commit files containing real secrets.
- Never log env vars or echo them in error responses.
- Rotate secrets periodically, and always after a team member with access leaves.

## RLS/row-level-security checklist for a new table

- [ ] Row-level security enabled
- [ ] Read policy scoped to the requesting identity
- [ ] Write policy scoped to the requesting identity (if writes are allowed)
- [ ] Update policy with ownership check
- [ ] Delete policy (or explicitly disallowed)
- [ ] Tested with more than one user identity
- [ ] Tested with no auth (anonymous)

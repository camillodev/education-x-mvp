# Backend layering

Domain rule for backend/API code, stack-agnostic. Applies whenever an agent writes or reviews server-side code.

## Separation of HTTP from business logic

Two layers, never merged:

- **Controller/route handler** — HTTP concerns only: parse request, validate input, call the service, shape the response. No business logic here.
- **Service** — business logic, stateless with respect to HTTP. No knowledge of request/response objects, headers, or status codes.

Route handlers that contain business logic, or services that reach into `req`/`res`, are the failure mode this separates against — it makes the logic untestable without spinning up an HTTP layer.

## Organize by domain, not by type

Group everything related to one business capability together (its controller, service, schema, types, tests) rather than grouping all controllers in one folder, all services in another. A domain folder should be understandable in isolation.

## Consistent API response shape

Every endpoint returns the same envelope shape — success and error both carry the same top-level keys (data vs. error), never bespoke shapes per endpoint. Consistency here is what lets a single client-side handler process every response.

## Error handling

- Define a small hierarchy of typed error classes (not-found, validation, unauthorized, etc.) that carry a machine-readable code and an HTTP status.
- One global error handler translates typed errors to the response envelope; anything untyped becomes a generic 500 with no internal detail leaked to the client.

## Database patterns

- Use an ORM or parameterized queries — never raw string-interpolated SQL.
- Version migrations in the repo; never hand-run ALTER TABLE against production.
- Add `created_at`/`updated_at` to every table; prefer soft delete (`deleted_at`) over hard delete for user-facing data.

## Environment validation

Validate all environment variables against a schema at process startup. The app should refuse to start on invalid config — no silent defaults for anything security- or correctness-critical.

## Testing

- Unit-test services (business logic) — the layer with the most branching and the most value from coverage.
- Integration-test controllers (the HTTP layer) to catch wiring mistakes the unit tests can't see.

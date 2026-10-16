# Enrollment Form Rules

Applies to every public and school-admin enrollment creation, review, and edit
flow.

## Required structure

- Put Zod schemas and schema-inferred input/output types in
  `[feature]-form.schema.ts`. Keep React imports out of schema files.
- Put `useForm`, `useFieldArray`, step state, validation gates, CEP lookup
  state, and submit/navigation handlers in `use-[feature]-form.ts`.
- Keep each step component presentational. Use `register`, `Controller`,
  `errors`, or `useFormContext`; do not duplicate validation or persistence
  logic in JSX.
- Keep `[feature]-form.tsx` as the flow orchestrator. Use `FormProvider` when
  multiple step components share form state.
- Server Actions and services must independently parse inputs with the same Zod
  schema or a server-specific schema derived from the same field contract.
  Client validation is not a security boundary.

## Validation and field behavior

- Derive TypeScript types from Zod; do not maintain duplicate field interfaces.
- Guardian billing fields: full name, CPF or CNPJ, email, and Brazilian mobile
  are required. Optional address, landline, and additional emails stay optional
  and must be validated when supplied.
- Student fields: full name, birth date, and email are required. CPF, mobile,
  RG, and issuer are optional and validated when supplied.
- Validate CPF/CNPJ check digits locally. Support numeric and alphanumeric CNPJ.
  A checksum does not establish registration status or identity ownership.
- CEP lookup must live behind a service and a form hook, handle
  invalid/not-found/network cases, avoid stale responses, and never overwrite
  address values manually changed by the user.
- Keep Brazilian user-facing labels and validation messages in pt-BR; use
  English identifiers and comments.

## Persistence, privacy, and tests

- Treat guardian and student contact/address/document data as PII. Persist
  encrypted values only, use nullable fields for legacy records, and never
  include PII in logs or URLs.
- Send only the supported Asaas customer fields; keep document/address
  normalization at the service boundary.
- Add schema tests for required/optional fields and valid/invalid documents;
  service tests for CEP success, invalid/not-found/network failures; component
  tests for errors, dynamic students, navigation, submission, and preserving
  manual edits; integration/E2E coverage for persistence and the full enrollment
  journey.
- Write tests before implementation and run the relevant suite,
  `pnpm typecheck`, `pnpm lint`, and `pnpm build` before completion.

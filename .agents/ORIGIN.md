# Origin of this configuration

Copied verbatim (MIT) from PostHog/posthog @ 9245121 (see posthog-agents/UPSTREAM.md). Only AGENTS.md is adapted (Hub facts, trigger paths, tooling map).

- Skills (15): writing-code-comments, writing-tests, writing-pr-descriptions, writing-user-facing-copy, writing-ui-components, qa-frontend, playwright-test, react-doctor, security-audit, editing-agents-md, writing-skills, announcing-behavior-changes, fixing-flaky-tests, splitting-oversized-modules, autoresolving-pr-conflicts
- Agents (3): code-reviewer, systematic-debugger, test-writer
- Rules (2): agents-md, writing-tests
- `.github/pull_request_template.md`

Not ported (PostHog infrastructure, no Hub equivalent): merging-prs, stacking-prs, triaging-merge-queue-failures, debugging-ci-failures, authoring-ci-workflows, running-ci-preflight, establishing-code-ownership, gating-production-deploys, gating-sensitive-actions, adding-inbound-webhooks, routing-outbound-api-calls, reviewing-with-coderabbit, building-product-empty-states.
Known gaps this leaves: no webhook skill (the Hub has an Asaas webhook), no outbound-API skill (Asaas client), no tenant-isolation rule.

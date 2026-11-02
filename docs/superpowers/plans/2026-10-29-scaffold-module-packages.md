# Scaffold Module Packages Implementation Plan

> **For agentic workers:** Implement the approved option A. Coordinate independent extraction tasks with the parallel-agent workflow; keep shared manifest, lockfile, and integration edits with the primary agent.

**Goal:** Make selectable scaffold modules easier to remove and maintain through dedicated backend packages and module folders in the existing UI package.

**Architecture:** Billing, notifications, audit, webhooks, flags, onboarding, and MCP own their backend implementations in workspace packages. Existing AI and jobs packages gain related reusable implementations. Web routes, authentication/request adapters, tRPC controllers, configuration and registration stay in the app. Module UI remains inside `packages/ui` and receives data/actions through props.

**Tech Stack:** TypeScript, pnpm workspaces, Next.js, Prisma, Vitest, scaffold manifests and marker regions.

**Spec:** Approved option A in the conversation: backend module packages plus module folders inside existing `packages/ui`.

## Global Constraints

- Preserve observable behavior, server authorization, transaction boundaries, webhook idempotency, module dependencies and provider pruning.
- Packages must never import app code or the app's `@/` alias.
- Keep Prisma models and migrations in `packages/database`; create no migration files.
- Preserve billing-disabled credit recording and flags-disabled code defaults with small app adapters/stubs.
- Use module markers for optional cross-package integrations and prune their dependency declarations with manifests.
- Update source, overrides and manifests; regenerate managed templates rather than editing generated output.
- No commit, publish, deployment or production migration is part of this request.

## Review Focus

- Disabled modules leave no dangling workspace dependencies or module-owned identifiers.
- Provider-specific package dependencies are removed with their implementation branches.
- Server-only dependencies never enter shared UI/browser entry points.
- Configuration and request context reach extracted services explicitly without circular dependencies.
- Existing tests, fresh frozen installs and scaffold variants exercise real extracted implementations.

## Tasks

- [x] 1. Extract billing provider/services and usage logic into `packages/billing`; preserve payment route verification, duplicate handling and the disabled credit fallback.
- [x] 2. Extract notifications and outgoing webhooks into `packages/notifications` and `packages/webhooks`; retain delivery registration and optional notifications integration.
- [x] 3. Extract audit, flags, onboarding and MCP backend logic into their packages with explicit app configuration/request adapters.
- [x] 4. Extend `packages/ai` with speech utilities and `packages/jobs` with persistence services; retain app orchestration.
- [x] 5. Extract remaining module management views into `packages/ui` using props for app data and actions; retain platform wiring.
- [x] 6. Rewrite consumers, test mocks, manifests/provider rules and package dependencies; update lockfile and scaffold builder version.
- [x] 7. Document ownership and extension points; regenerate templates and validate package/web/UI tests and typechecks, architecture, scaffold matrix and staged starter build.

## Execution Notes

- User authorized implementation with “Go with A”; proceed through all tasks without a second design-approval round.
- Work in the current checkout; do not create a worktree without a user preference for one.
- Existing behavioral tests provide refactor coverage. Add targeted tests for new injection boundaries and scaffold package removal rather than duplicating implementation checks.

## Validation Ledger

- Baseline: 49 focused app tests passed before extraction.
- Source web suite: 902 tests passed, one skipped; the exhaustive 3,072-subset suite was not run; the separate pairwise/provider matrix validates the 71 planned variants. Used two workers and a 30-second timeout to avoid filesystem-copy timeouts while fresh variants run concurrently.
- Selected backend packages: 76 tests passed; shared UI: 77 tests passed.
- Workspace typechecking, web/UI linting and architecture checks passed. A new architecture rule rejects UI imports of the backend module packages.
- Staged starter production build passed (web, desktop and backend tasks).
- Static scaffold matrix: all 71 pairwise/platform/provider variants passed. Full install/generate/typecheck/architecture validation passed for all 71 variants using four isolated generated workspaces. Results: `.generated/variants/summary.md`.
- Independent review: no actionable findings. A prior UI review identified and fixed the webhook reset/refetch ordering race with regression coverage.
- Ruling: JSON dependency pruning skips a missing file only when a prior explicit removal covers that path; unexplained missing files still fail. This supports optional package consumers without hiding manifest drift.
- Ruling: analytics leak checks target SDK imports/dependencies and runtime identifiers rather than arbitrary provider URLs in marketing content. Regression coverage preserves SDK detection.
- Ruling: keep application flag registry/defaults in web and inject it into the flags package, so the package can be fully removed while code-default flags still work.
- Existing landing tests lacked the transaction mock required by their existing production code; fixed the fixture. Cleared two existing test-only lint warnings while retaining mock call signatures.

- Final staged test discovery found the root-only feature-catalog test reading the scaffold registry, which the starter intentionally does not ship. Added that test to template exclusions; source coverage remains intact.

- Final verification: `pnpm template:test` passed all 18 test tasks, including the Python backend. `pnpm template:build` passed all 3 build tasks. Template sync and whitespace checks passed; no migration files were created or changed.

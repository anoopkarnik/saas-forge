# Roadmap progress

Work the specs in rank order, one commit per spec on `main` (local only, never pushed).
A session resumes at the first `todo` row. Mark a spec `in-progress` with notes when a
session ends mid-spec, so the next session continues instead of starting over.

Rules for every spec:

- Verify before committing: `pnpm --dir apps/web typecheck` (or `pnpm typecheck`), `pnpm lint`,
  `pnpm arch:check`, the touched packages' tests, `pnpm template:check-sync`, and
  `pnpm scaffold:matrix` when templates or scaffold modules change.
- Migrations: dev and production share one Neon database. Generate the migration, read the SQL,
  and apply only additive changes. Any DROP, rename or type change means stop and ask the owner.
- Jobs (#12) use Inngest (self-hosted on :8288; INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY).
- After each spec, set its `data-status` to `done` in the roadmap artifact
  (https://claude.ai/artifact/JMeTunUX4ndKPb454LBs6T) and add the commit here.

| # | Spec | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 01 | Scaffold variant matrix CI | done | 1cae886 | Marker engine, matrix, boot smoke, lockfile pruning |
| 02 | Single-source pricing & module catalog | done | 5df88a2 | 409 price_changed guard on all four charging routes |
| 03 | Secret-free downloads | done | e9fa901 | Shared buildProjectZip now ships the pruned lockfile; .env.secrets.template left to #9 |
| 04 | Cached & async scaffold builds | done | 62e0d3a | R2 cache, refunds, free re-downloads; builds stay synchronous until #12; admin prewarm instead of publish-script prewarm |
| 05 | AI backend module split (ai_agents) | done | 93371c4 | Saved projects with `ai` now download without the Python service; owners add ai_agents |
| 06 | API Keys module manifest | done | 6808954 | Saved projects listing api_keys now pay 5 credits |
| 07 | Pre-purchase file-tree preview | done | 1b11dec | Index built lazily per deployed starter; preview UI not yet clicked through in a browser |
| 08 | create-saas-forge CLI v2 | done | 1c2607f | npm publish is a release step (not run); `upgrade` ignores the server URL in .saas-forge.json unless it matches the configured one |
| 09 | Post-download setup doctor | done | f369d08 | Doctor imports env.ts itself (no separate requirements module) and fills apps/web/.env directly (no .env.secrets.template). E2E: fresh `none` variant → doctor → production boot + sign-up. Found apps/web/.env on prod-boilerplate, 3 additive migrations behind (owner to deploy) |
| 10 | Upgrade center | done | 4bfac2b | No releases/*.json yet (history had no usable notes); the next release drafts one with `pnpm release:notes`. Emails are sent by an admin from My Projects, not on publish. UI not clicked through in a browser (local web uses the prod DB) |
| 11 | Provider-level pruning | todo | | |
| 12 | Jobs & cron module | todo | | Inngest, not QStash (owner decision) |
| 13 | Notifications module | todo | | |
| 14 | Runtime site config | todo | | |
| 15 | Audit log module | todo | | |
| 16 | Outgoing webhooks module | todo | | |
| 17 | Usage metering dashboard | todo | | |
| 18 | Feature flags module | todo | | |
| 19 | Onboarding module | todo | | |
| 20 | Product analytics | skipped | | Owner: not now |

## Fixes outside the specs

- 1db9b85 fix(doctor): env files written 0600 (security review of #9).
- 7f1f4de fix(scaffold): Vercel never shipped `scaffold-modules/` (registry, manifests) with any route, so pricing, the catalog and downloads threw ENOENT in production; the v1 download/upgrade routes and the preview procedures also lacked the starter. Registry now traced everywhere, starter on archive routes, template-reading tRPC calls go to `/api/scaffold/trpc`. Predates the roadmap.
- Production database (`prod-boilerplate`) is 4 additive migrations behind dev and nothing in the build migrates it; owner runs `migrate:deploy` (documented in the release workflow, step 7).

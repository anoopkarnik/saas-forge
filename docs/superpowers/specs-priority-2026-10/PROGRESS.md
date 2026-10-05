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
| 04 | Cached & async scaffold builds | in-progress | | See design notes below |
| 05 | AI backend module split (ai_agents) | todo | | |
| 06 | API Keys module manifest | todo | | |
| 07 | Pre-purchase file-tree preview | todo | | |
| 08 | create-saas-forge CLI v2 | todo | | |
| 09 | Post-download setup doctor | todo | | |
| 10 | Upgrade center | todo | | |
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

## #4 design notes (in progress)

- Production image storage is Vercel Blob, which only supports public access, so build
  archives go to the R2 bucket (credentials set in both envs). Cache is on when R2 creds
  exist. Object name = HMAC(BETTER_AUTH_SECRET, buildKey), so keys cannot be guessed
  even if the bucket has a public domain. Archives are only served through our
  authenticated routes, never through storage URLs.
- Cache the compiled base archive (no env files, no SETUP.md), keyed by templateVersion,
  sorted modules, sorted platforms and BUILDER_VERSION. Per download, append the env
  files, SETUP.md and .boilerplate-version to the cached base with appendFilesToZip, so one
  cached build serves every buyer and config.
- ScaffoldJob gains (additive): status enum (building | ready | failed, default ready),
  buildKey, platforms, envVars (public only), refundedAt, index (userId, buildKey).
- Charge before building; refund automatically if the build fails. A user who already
  owns a ready build of the same buildKey re-downloads free.
- Builds stay synchronous (seconds) with job status tracked; a real queue comes with #12.
- "My downloads" list on /projects with free re-download.
- Restore free re-downloads on the session path (/api/scaffold ignored lastBuiltHash;
  ProjectList now shows full price).


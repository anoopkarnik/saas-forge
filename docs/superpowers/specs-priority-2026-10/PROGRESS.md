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

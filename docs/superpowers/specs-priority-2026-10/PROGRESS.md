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
| 11 | Provider-level pruning | done | 73d8394 | `packageJsonRemove` not added: existing `jsonRemove` covers dependencies. Keep-all output differs from pre-#11 only in the refactored provider files (no pruning). Minimal providers (all modules): 2,012 vs 2,210 installed packages, 1,872 vs 1,921 MB. Wizard file preview (#7) still counts keep-all files |
| 12 | Jobs & cron module | done | 8696ec2 | Inngest instead of QStash: `/api/inngest` replaces `/api/jobs/run` and `/api/cron/[name]`, cron lives in Inngest (no `vercel.json`, no Redis driver; self-hosters run the Inngest server). `JobRun` stores dead letters only. Admin shows each schedule's last run, not the next. Price 15 credits is my pick (adjust in the registry). Switch on with `JOBS_DRIVER=inngest` |
| 13 | Notifications module | done | b8262dd | Types: invitation sent, payment succeeded/failed (Stripe, Dodo), credits low, organization invitation. Email goes through the `notification.deliver` job. Deferred: the "AI job finished" event (the Python worker writes job status straight to the DB, so there is no web hook to emit from). Preferences live in the bell popover rather than a Settings tab; mobile shows the list and mark-read only. Price 5 credits (registry default) |
| 14 | Runtime site config | done | 461b99e | Settings: product name, description, theme, appearance, the four sign-in buttons, Calendly, GA ID, registration mode (keeps its `registration_mode` row, so `packages/auth` enforcement is unchanged). Not runtime: company name and support email (only `packages/email` reads them; the support email is the Resend sender). The root layout now renders dynamically (`connection()`), so `/sign-in`, `/sign-up` and `/_not-found` are no longer prerendered. Not done: desktop and mobile reading `siteConfig.get` (spec: follow-on); in-app docs unchanged (handbooks updated). Verified with a clean-install `template:build`; local `apps/web` build fails on stale March symlinks, see fixes below |
| 15 | Audit log module | done | c61ffea | 33 actions: Better Auth admin endpoints (audited in the auth route after success, actor read before the call), admin invitations, site config, org changes, API keys, CMS landing, docs, AI prompts. Prisma-backed writes audit inside their transaction; Better Auth writes audit after success. Emit sites use `audit_log` markers rather than a no-op stub (same as #13). Retention and IP/UA recording are non-public site settings. No v1 route mutates in the starter, so `actorType=apiKey` is supported but not emitted yet. Credit adjustments not audited (no admin endpoint exists). Desktop/mobile audit viewers not built. Price 10 credits |
| 16 | Outgoing webhooks module | done | 4132493 | Events: webhook.test, payment.succeeded/failed, org.member.added/removed, api_key.created/revoked. Not emitted: user.created (Better Auth hooks live in packages/auth, which cannot import apps/web), credits.low, ai.job.completed (the Python worker writes job status directly). Secrets AES-256-GCM encrypted under `WEBHOOK_SECRET_KEY`, which is optional at boot (endpoint creation needs it; a weak key is refused) so the boot smoke and Docker setups keep working. Retries need `JOBS_DRIVER=inngest`; inline jobs make one attempt. Pause threshold 15 consecutive failed attempts. Desktop/mobile UI not built. Price 10 credits. Also fixed #15 in cf21ad0 (a file that existed only with audit_log+multi_tenancy broke the pre-purchase preview) |
| 17 | Usage metering dashboard | todo | | |
| 18 | Feature flags module | todo | | |
| 19 | Onboarding module | todo | | |
| 20 | Product analytics | skipped | | Owner: not now |

## Fixes outside the specs

- 1db9b85 fix(doctor): env files written 0600 (security review of #9).
- 7f1f4de fix(scaffold): Vercel never shipped `scaffold-modules/` (registry, manifests) with any route, so pricing, the catalog and downloads threw ENOENT in production; the v1 download/upgrade routes and the preview procedures also lacked the starter. Registry now traced everywhere, starter on archive routes, template-reading tRPC calls go to `/api/scaffold/trpc`. Predates the roadmap.
- Production database (`prod-boilerplate`) is 8 additive migrations behind dev (through `20261007123820_webhooks`) and nothing in the build migrates it; owner runs `migrate:deploy` (documented in the release workflow, step 7).
- Local only (not committed): `apps/web/node_modules/next` and 122 other links under `apps/*`/`packages/*/node_modules` point into a March `node_modules/.pnpm` store that predates `node-linker=hoisted`. With inngest (#12) resolving the hoisted `next`, a local `pnpm --dir apps/web build` fails on duplicate `NextRequest` types. Fresh installs (Vercel, CI, `template:prepare`) build fine. Fix locally by deleting those links and running `pnpm install --frozen-lockfile`.
- 73d8394 (with #11): local env files (`.env.production`, `.env.local`…) were copied into the synced starter and only a file named exactly `.env` was kept out of archives. Audit (read-only) of the R2 bucket found no build archives ever written, so nothing leaked.

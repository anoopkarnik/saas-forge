# Plan: Saved Project Configs + API/Credit Downloads + Delta Upgrades

Status: **All phases complete** (code) — persistence + isolation (Phase 1),
API-key/credits v1 endpoints incl. create/update/download (Phase 2), and the
Claude Code upgrade kit + `/upgrade` endpoints + tier-bump UI (Phase 3). Remaining:
`pnpm generate` + `typecheck` (deferred while the dev server holds the Prisma DLL),
and deduping `project-write.ts` against `projectProcedures.ts`. Owner: platform
(saas-forge root only).

## Goal

Let users (1) **save project configurations**, (2) **download or upgrade** a project
programmatically via **API key + credits**, and (3) **upgrade between tiers / add
features**, paying only the delta.

## Hard constraints

- All new code lives in the **root platform** (`apps/web`, `packages/*`,
  `scaffold-modules/`). **Nothing** ships in the downloaded boilerplate
  (`templates/saas-boilerplate/`). Enforced by `pnpm sync-template --check`.
- **No secret/env collection.** Saved configs store only non-secret selections.
  Every download/patch ships `.env.example` + a generated `SETUP.md` describing
  how to obtain each required env var for the selected modules/tier.
- New DB tables live in a dedicated **`scaffold_schema`**.
- Migrations: edit Prisma + `pnpm generate`; the owner runs `pnpm migrate`.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Secrets | Never collected/stored. Generate acquisition **steps** (`SETUP.md`) at the end |
| Upgrade delivery | **Claude Code-driven, local**: download ships a CC slash command (`.claude/commands/upgrade-boilerplate.md`) + `UPGRADE_SPEC.json` + staged delta files; the user runs Claude Code in their repo to integrate. Runs on the **user's** Anthropic key; credits only pay to generate the kit |
| API access | Any authenticated user with credits (no account-tier gate) |
| Postgres schema | Dedicated `scaffold_schema` |
| `tierUpgradeCreditsPerStep` | `3` |
| Empty modules (multi_tenancy/api_keys/notifications) | Flip `downloadEnabled: true`, **charge 0** until manifests authored |

## Data model — `packages/database/prisma/scaffold.prisma` (root only)

- `ProjectConfig` — id, userId, name, slug, productTypeId?, tierId, versionId,
  platforms[], modules[], config(Json, non-secret), templateVersion,
  lastBuiltHash?, lastBuiltAt?, timestamps. `@@unique([userId, slug])`,
  `@@schema("scaffold_schema")`.
- `ScaffoldJob` — build ledger for history + idempotency + audit: type
  (download|upgrade), source (web|api), from/toModules[], from/toTierId,
  creditsSpent, templateVersion, `idempotencyKey @unique`. `@@schema("scaffold_schema")`.
- Enums `SCAFFOLD_JOB_TYPE`, `SCAFFOLD_JOB_SOURCE` under `scaffold_schema`.
- `User` gains `projectConfigs`, `scaffoldJobs` relations (root-only edit).
- Datasource `schemas` gains `"scaffold_schema"`.

## Isolation (template-sync.manifest.json)

`exclude` (stripped from template):
- `packages/database/prisma/scaffold.prisma`
- `packages/database/prisma/migrations/20260817001340_project_upgrade` (the
  scaffold_schema DDL — excluded so the boilerplate never creates these tables)
- `packages/database/.env`, `apps/web/.env`, `apps/web/.env.production` (local secrets)
- `apps/web/lib/scaffold-service.ts`
- `apps/web/lib/scaffold-setup-guide.ts`
- `apps/web/trpc/routers/projectProcedures.ts` (+ `__tests__/projectProcedures.test.ts`)
- `apps/web/app/api/v1/projects`, `apps/web/app/api/v1/credits`, `apps/web/app/api/v1/scaffold`
- `apps/web/app/(home)/projects`

`templateOverrides` (template keeps its own copy under `template-overrides/saas-boilerplate/`):
- `packages/database/prisma/schema.prisma` (4-schema datasource, no scaffold_schema)
- `packages/database/prisma/user.prisma` (User without scaffold relations)
- `apps/web/trpc/routers/_app.ts` (no projectRouter)

Note: `scaffold-modules/` is already outside `include`, so registry edits never leak.
API-key scope additions in `packages/auth/.../scopes.ts` sync as harmless unused
strings (acceptable) — override only if strict purity is wanted.

## No env collection → generated steps

`apps/web/lib/scaffold-setup-guide.ts` formats `resolvePreset(...)`'s
`accountsNeeded` / `secretsToFill` / `steps` / `cost` / `delivery` (from
`packages/ui/src/lib/constants/presets.ts`) into `SETUP.md`. Downloads ship
`.env.example` (non-secret toggles pre-filled, secrets as placeholders) + `SETUP.md`.
Export `getAccounts`/`getSecrets` from presets.ts for custom (non-preset) configs.

## Backend / API / upgrades

- `projectRouter` (session tRPC): `list/get/save/update/duplicate/delete`,
  `estimateDownload`, `estimateUpgrade`. Registered in root `_app.ts`.
- Shared `scaffold-service.ts`: `resolveScaffoldPlan`, `buildScaffoldZip`,
  `buildUpgradeKit`, `chargeCreditsAtomic` (transactional balance check +
  ScaffoldJob insert + P2002 idempotency; fixes current race in
  `apps/web/app/api/scaffold/route.ts`).
- v1 REST (API key + credits): `GET/POST /api/v1/projects`,
  `GET/PATCH /api/v1/projects/:slug`, `POST …/download` (`scaffold:download`),
  `POST …/upgrade` (`scaffold:upgrade`), `GET /api/v1/credits`,
  `GET /api/v1/scaffold/pricing`. `Idempotency-Key` supported.
- Scopes added: `read:projects`, `write:projects`, `scaffold:download`,
  `scaffold:upgrade`, `read:credits`.
- **Upgrade kit (Claude Code-driven, local):** `/upgrade` computes the module/tier
  delta (two-build diff for the added module's files) and emits an **upgrade kit**:
  `UPGRADE_SPEC.json` (from/to modules, tier delta, target files, new env vars,
  boilerplate version) + staged delta files + `SETUP.md`. Every download ships a
  Claude Code slash command `.claude/commands/upgrade-boilerplate.md` (synced via
  the `.claude` include). The user runs Claude Code in their project; it reads the
  spec + staged delta and integrates the module/tier into their *customized* code
  (wires `_app.ts`, Prisma models + migration, `.env.example`, deps, typecheck),
  resolving conflicts a mechanical patch can't. Runs on the **user's** Anthropic
  key; saas-forge credits only pay to generate the kit. No `apply-patch.mjs`, no
  server-side agent.

## Pricing

- First download: `base(20) + Σ module.creditsCost`.
- Re-download unchanged (`lastBuiltHash` + same templateVersion): `0`.
- Upgrade add modules: `Σ creditsCost(added)`.
- Tier bump: `3 × (order(to) − order(from))`.
- Downgrade / remove: `0`, no refund.
- multi_tenancy/api_keys/notifications: `downloadEnabled: true` but effective cost
  `0` until manifests exist.

## Phasing

1. Persistence + isolation: model, manifest, `projectRouter`, My Projects page,
   `scaffold-setup-guide.ts`, `sync-template --check`.
2. Shared service + API: extract `scaffold-service.ts`, scopes, v1 endpoints,
   ScaffoldJob idempotency.
3. Claude Code upgrade kit: `buildUpgradeKit` (delta + `UPGRADE_SPEC.json`), ship
   `.claude/commands/upgrade-boilerplate.md` in the template, `/upgrade` endpoint,
   tier-bump UI, flip modules + author manifests.

## Tests

`projectRouter` CRUD/ownership; pricing/delta math; upgrade-delta (compile A vs B →
added files + `UPGRADE_SPEC.json`); v1 auth/scope/credits/idempotency;
`sync-template --check` guard.

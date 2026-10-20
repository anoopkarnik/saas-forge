# Release Kits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A downloaded project can see it is behind and get a free kit of the code changed between its version and the latest, for its own variant; module upgrades carry those changes too.

**Architecture:** `pnpm template:publish` uploads a per-version snapshot (staged starter + module/provider rules) to R2. Upgrade code resolves an optional "from" base (that snapshot, unpacked to `/tmp`) and compiles the old variant from it with its own rules; the "to" side stays the deployed starter. The kit adds `.upgrade-base/` old files and release metadata; CLI, MCP, REST and web reach it through the existing upgrade endpoints.

**Tech Stack:** Next.js route handlers, tRPC, Vitest, `@aws-sdk/client-s3` (R2), `archiver` + `jszip`, plain Node ESM for the CLI and scripts (Node 24 type stripping for `.ts` imports).

**Spec:** `docs/superpowers/specs/2026-10-20-release-kits-design.md`

## Global Constraints

- Release kits are free (0 credits); module/tier/provider prices are unchanged.
- The kit "from" version is the project's file version when the CLI/MCP sends `fromVersion`, else `ProjectConfig.templateVersion`.
- Snapshot objects use HMAC-derived names (bucket may be public): never a plain version in the key.
- Snapshot code imported by `scripts/*.mjs` uses relative imports only (no `@/`).
- Root-only: nothing new ships into the starter except the `upgrade-boilerplate` command text.
- Bump `BUILDER_VERSION` when `compileScaffoldVariant`/`buildBaseArchive` sources change.
- No migrations, no Prisma schema change.
- Keep `upgrade --mark-current` / `mark_project_current` as the fallback.

## Review Focus

- `fromVersion` newer than latest, malformed, or equal to latest → treated as current / 400, never a crash or an empty "release kit". (Task 5 test)
- No R2 configured or snapshot missing for the version → module upgrades still work (latest-vs-latest), release kit answers `release_kit_unavailable`. (Tasks 3, 5 tests)
- Kit from an old base must not contain files of modules/providers the project lacks. (Task 3 test)
- Re-download pricing unchanged after download stamping: second unchanged re-download still free. (Task 4 test)
- Snapshot cache in `/tmp` reused across calls and not half-written on a failed unpack. (Task 2 test)

---

### Task 0: Commit the existing mark-current work

- [ ] Run `pnpm --dir apps/web exec vitest run lib/scaffold/__tests__/mcp-tools.test.ts "app/api/v1/projects/[slug]/mark-current"` and `pnpm --dir packages/create-saas-forge test`; expect PASS.
- [ ] Commit the uncommitted files as `feat(projects): mark a downloaded project current after a hand-applied release`.

### Task 1: Compile a variant with another version's rules

**Files:**
- Modify: `apps/web/lib/scaffold-modules.ts` (loaders, `getModuleRoot`, provider helpers, `compileScaffoldVariant`)
- Modify: `apps/web/lib/scaffold/build-cache.ts` (`BUILDER_VERSION` 15 → 16)
- Test: `apps/web/lib/scaffold/__tests__/scaffoldRulesRoot.test.ts`

**Interfaces:**
- Produces: `loadScaffoldRegistry(rulesRoot?: string)`, `loadModuleManifest(id, rulesRoot?)`, `loadProviderRegistry(rulesRoot?)`, `compileScaffoldVariant({ ..., rulesRoot?: string })`. `rulesRoot` is a directory containing `scaffold-modules/` and `scaffold-providers/`; absent → today's `resolveWorkspacePath` behaviour.

- [ ] **Test** `compiles with the rules found under rulesRoot`: copy `scaffold-modules/` and `scaffold-providers/` to a temp rules dir; in the copy, add `LICENSE` (present in the starter root) to `ai`'s `unselected.remove`. Compile `selectedModules: []` with and without `rulesRoot`; expect `LICENSE` missing only with `rulesRoot`. Also `loadScaffoldRegistry(rulesDir).modules.length` equals the default's.
- [ ] Run, expect FAIL (option ignored).
- [ ] Implement: a private `rulesPath(rel, rulesRoot?)` → `rulesRoot ? path.join(rulesRoot, rel) : resolveWorkspacePath(rel)`; thread `rulesRoot` through every loader used by `compileScaffoldVariant` (default registry also from `rulesRoot`).
- [ ] Bump `BUILDER_VERSION` to 16; run test file + `lib/scaffold/__tests__/build-cache.test.ts` + `scaffoldVariants.test.ts`; expect PASS.
- [ ] Commit `feat(scaffold): compile a variant with another version's module rules`.

### Task 2: Release snapshots (pack, store, load)

**Files:**
- Create: `apps/web/lib/scaffold/release-snapshots.ts`
- Test: `apps/web/lib/scaffold/__tests__/release-snapshots.test.ts`

**Interfaces:**
- Produces:
  - `type UpgradeBase = { version: string; starterRoot: string; rulesRoot: string }`
  - `type SnapshotStore = { get(version: string): Promise<Uint8Array | null>; put(version: string, bytes: Uint8Array): Promise<void> }`
  - `getReleaseSnapshotStore(env = process.env): SnapshotStore | null` — R2 from `R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET_NAME`, key `release-snapshots/<hmac-sha256(secret, "v"+version)>.zip`; null without credentials.
  - `packReleaseSnapshot({ starterRoot, rulesRoot }): Promise<Uint8Array>` — zip with `starter/…`, `rules/scaffold-modules/…`, `rules/scaffold-providers/…`; skips `node_modules`, `.next`, `.turbo`, `dist`, `build`, `coverage`, `.git`, local `.env*` (keep `.env.example`).
  - `unpackReleaseSnapshot(bytes, dir): Promise<UpgradeBase-without-version>` → `{ starterRoot: dir/starter, rulesRoot: dir/rules }`.
  - `loadReleaseSnapshot(version, { store = getReleaseSnapshotStore(), cacheRoot = os.tmpdir() } = {}): Promise<UpgradeBase | null>` — reuses `<cacheRoot>/saas-forge-release-<version>/` when its `.complete` marker exists; otherwise unpacks into a sibling temp dir and renames; null when no store or no object.
- Relative imports only.

- [ ] **Tests:** round trip (pack a tiny fixture starter + rules, unpack, files equal, `node_modules`/`.env` skipped, `.env.example` kept); `loadReleaseSnapshot` with a fake store calls `get` once across two loads (cache) and returns null when `get` returns null or store is null; a failing unpack leaves no `saas-forge-release-<v>` dir; `getReleaseSnapshotStore({})` is null.
- [ ] Run, expect FAIL; implement; run, expect PASS.
- [ ] Commit `feat(scaffold): per-release starter snapshots in R2`.

### Task 3: Upgrade kits diff from an old release

**Files:**
- Modify: `apps/web/lib/scaffold/service.ts` (`compileUpgradeDiff`, `previewUpgrade`, `buildUpgradeKit`, `renderUpgradeReadme`, new `resolveUpgradeBase`)
- Test: `apps/web/lib/scaffold/__tests__/releaseKit.test.ts`

**Interfaces:**
- Consumes: Task 1 `rulesRoot`, Task 2 `UpgradeBase`, `loadReleaseSnapshot`, `compareVersions` (`release-notes.ts`), `Release` type (`release-notes.ts`).
- Produces:
  - `previewUpgrade({ ..., fromBase?: UpgradeBase })`, `buildUpgradeKit({ ..., fromBase?: UpgradeBase, releases?: Release[] })` — unchanged when `fromBase` absent.
  - `type UpgradeBaseResolution = { status: "current" } | { status: "snapshot"; base: UpgradeBase } | { status: "missing"; version: string } | { status: "invalid" }`
  - `resolveUpgradeBase(fromVersion: string, load = loadReleaseSnapshot): Promise<UpgradeBaseResolution>` — `invalid` unless `/^\d+\.\d+\.\d+$/`; `current` when `>= getTemplateVersion()`.
  - Kit spec adds `kind: "release" | "upgrade"` (`release` when no module/tier/provider change), `fromVersion` (base version or latest), `toVersion`, `releases`, `changedFiles` unchanged.
  - Kit adds `<slug>/.upgrade-base/<path>` for every modified and removed file (from the "from" variant), and `<slug>/.claude/commands/upgrade-boilerplate.md` from the target variant.
- From-side compile uses `fromBase.starterRoot`, `rulesRoot: fromBase.rulesRoot` and `loadScaffoldRegistry(fromBase.rulesRoot)`.

- [ ] **Tests** (fixture base = `fs.cpSync` of the scaffold root and of `scaffold-modules`/`scaffold-providers` into a temp dir, then edit `apps/web/lib/utils.ts`-like shared file present in every variant, and edit a billing-only file):
  - `release kit for modules [] stages only the shared change`: `.upgrade/` has exactly the shared file, `.upgrade-base/` has its old text, spec `kind: "release"`, `fromVersion` = base version, the billing-only file absent.
  - `module upgrade from an old base carries release changes`: `[] → ["billing"]` includes the shared file in `modified` and billing files in `added`; `kind: "upgrade"`.
  - `previewUpgrade with fromBase counts what the kit stages`.
  - `resolveUpgradeBase`: `"abc"` → invalid; latest and newer → current; older with loader null → `missing`; loader result → `snapshot`.
- [ ] Run, expect FAIL; implement; run plus `upgradePreview.test.ts`, `scaffoldProviders.test.ts`; expect PASS.
- [ ] Commit `feat(scaffold): upgrade kits diff from the project's own release`.

### Task 4: Stamp the version on download and after a release kit

**Files:**
- Modify: `apps/web/lib/scaffold/project-service.ts` (`markProjectBuilt`, new `recordProjectVersion`, `markProjectCurrent` uses it)
- Modify: `apps/web/app/api/v1/projects/[slug]/download/route.ts`
- Test: `apps/web/app/api/v1/projects/[slug]/download/__tests__/*` (existing) and `apps/web/lib/scaffold/__tests__/mcp-tools.test.ts` (mark-current stays green)

**Interfaces:**
- Produces: `markProjectBuilt(projectId, { lastBuiltHash, templateVersion })`; `recordProjectVersion(project: ProjectDetail, version: string): Promise<void>` — sets `templateVersion`, and `lastBuiltHash = computeBuildHash({...project, templateVersion: version})` only when the stored hash matched `computeBuildHash(project)`.
- Download route stamps `templateVersion: getTemplateVersion()` and `lastBuiltHash: computeBuildHash({ ...project, templateVersion: latest })`.

- [ ] **Test** in the download route tests: after a download the update has `{ templateVersion: "<latest>", lastBuiltHash: <hash with latest>, lastBuiltAt: any Date }`; a project whose stored version equals latest and hash matches downloads with `free: true`.
- [ ] Run, FAIL; implement; run, PASS (plus mcp-tools tests).
- [ ] Commit `fix(projects): record the starter version a download delivers`.

### Task 5: Release kits through the upgrade endpoints

**Files:**
- Modify: `apps/web/app/api/v1/projects/[slug]/upgrade/route.ts`, `apps/web/app/api/scaffold/upgrade/route.ts`, `apps/web/trpc/routers/projectProcedures.ts` (`upgradePreview`)
- Test: `apps/web/app/api/v1/projects/[slug]/upgrade/__tests__/upgrade.test.ts`

**Interfaces:**
- Consumes: `resolveUpgradeBase`, `previewUpgrade/buildUpgradeKit` with `fromBase`/`releases`, `recordProjectVersion`, `getProjectReleases({ ...project, templateVersion: fromVersion }, …)`.
- GET `?fromVersion=x.y.z` → `{ preview, releases, releaseKit: { available: boolean, fromVersion, latestVersion, reason?: "current" | "missing_snapshot" } }`; `preview` uses `fromBase` when resolved.
- POST body `fromVersion?: string`. No module/tier/provider change: `current` → 400 `nothing_to_upgrade`; `missing` → 422 `release_kit_unavailable` (message names release notes and `upgrade --mark-current`); `invalid` → 400 `invalid_version`; `snapshot` → kit with 0 credits via `chargeScaffoldCredits({ amount: 0, job: { type: "upgrade", ... } })`, header `X-Upgrade-Kind: release`, then `recordProjectVersion(project, latest)`. With changes: same as today plus `fromBase` when resolved (missing snapshot → today's behaviour).
- Web route: same rules (session; body `fromVersion` optional, defaults to DB); errors `{ error }` with 422 for unavailable.
- tRPC `upgradePreview`: resolves base from `project.templateVersion`.

- [ ] **Tests:** POST with nothing changed and `fromVersion: "1.4.0"` (latest 1.4.1, resolver mocked `snapshot`) → 200, `mockCharge` amount 0, `mockBuildKit` called with `fromBase`, `X-Upgrade-Kind: release`; resolver `missing` → 422 `release_kit_unavailable`; `fromVersion: "1.4.1"` → 400 `nothing_to_upgrade`; `fromVersion: "9.9.9"` → 400; `fromVersion: "x"` → 400 `invalid_version`; GET returns `releaseKit.available`.
- [ ] Run, FAIL; implement; run, PASS; `pnpm --dir apps/web typecheck`.
- [ ] Commit `feat(scaffold): free release kits from the upgrade endpoints`.

### Task 6: MCP quotes the release kit

**Files:**
- Modify: `apps/web/lib/scaffold/mcp-tools.ts` (`quote_upgrade` input `fromVersion?`, nothing-to-upgrade branch, `platformMcpInstructions`)
- Test: `apps/web/lib/scaffold/__tests__/mcp-tools.test.ts`

- [ ] **Tests:** behind + snapshot → `{ nothingToUpgrade: false, kind: "release", credits: 0, command: "npx create-saas-forge upgrade --yes" }` and files counts; behind + missing → message contains `mark_project_current`; current → as today; `fromVersion` input overrides DB version.
- [ ] Implement; run, PASS.
- [ ] Commit `feat(mcp): quote_upgrade offers the free release kit`.

### Task 7: CLI status and release upgrades

**Files:**
- Modify: `packages/create-saas-forge/src/api.mjs` (`upgradePreview` adds `fromVersion`), `src/commands.mjs` (`runStatus`, `runUpgrade`), `bin/create-saas-forge.mjs` (help, `status`)
- Test: `packages/create-saas-forge/test/cli.test.mjs`

**Interfaces:**
- `projectVersion(cwd, marker)`: `marker.templateVersion` → else `.boilerplate-version` → else undefined.
- `runStatus(flags, io)` → logs `v<from> → v<latest>` and release entries, or `up to date`; returns `{ behind, fromVersion, latestVersion, releaseKit }`.
- `runUpgrade`: sends `fromVersion` on preview and POST; with no `--add/--tier/--provider`: if `releaseKit.available`, log files and notes, confirm "Get this free update?", POST, extract, write marker `templateVersion: latestVersion`; if `reason === "missing_snapshot"`, explain release notes + `--mark-current`; else "Nothing to upgrade.". Paid upgrades also update marker `templateVersion` after extracting.

- [ ] **Tests:** status behind/current; upgrade with no flags behind → `client.upgrade` called with `{ fromVersion: "1.4.0", modules, tierId }`, marker becomes `1.4.1`; missing snapshot → throws message containing `--mark-current`; `.boilerplate-version` fallback.
- [ ] Implement; `pnpm --dir packages/create-saas-forge test` PASS.
- [ ] Commit `feat(cli): status command and free release upgrades`.

### Task 8: Web "Get update" button

**Files:**
- Modify: `apps/web/components/projects/ProjectList.tsx` (`upgradeProject` handles release kits), `apps/web/components/projects/UpgradeCenter.tsx` (`ReleaseNotesPanel` button)

- [ ] `ReleaseNotesPanel` shows `Get update (free)` when `behind > 0`; click POSTs `/api/scaffold/upgrade` `{ slug }`, downloads `<slug>-update.zip`, toasts the 422 message on unavailable, invalidates `project.releases`/project list.
- [ ] `pnpm --dir apps/web typecheck` and `pnpm --dir apps/web lint` on the files; PASS.
- [ ] Commit `feat(projects): get a release update from the Upgrade Center`.

### Task 9: Publish, backfill, merge instructions, docs

**Files:**
- Modify: `scripts/publish-template-branch.mjs` (upload snapshot before commit; `--no-snapshot`; loads `apps/web/.env` via `process.loadEnvFile` when R2 vars are unset; fails without a store unless `--no-snapshot`)
- Create: `scripts/backfill-release-snapshots.mjs` (`<version>=<commit> …`, `--dry-run`): worktree → `node scripts/sync-template.mjs --stage` → verify the all-modules variant (snapshot rules) equals `git archive template/v<version>` minus `.boilerplate-version` → upload
- Modify: `.claude/commands/upgrade-boilerplate.md` (`kind: "release"`, `.upgrade-base/` three-way merge, clean `.upgrade-base/`), then `pnpm template:sync`
- Modify: `packages/database/src/docs/scaffold.mdx`, `CLAUDE.md` (release step 6 mentions snapshot; scaffold section line on release kits), `packages/create-saas-forge` README if present
- [ ] `pnpm template:check-sync` PASS; run backfill `2.1.1=6184ed2` (verification must pass, then upload).
- [ ] Commit `feat(release): snapshot each release for release kits`.

### Task 10: End-to-end check

- [ ] Local script in scratchpad: build a snapshot from `526506e` (manifest 2.1.0) in memory, then `buildUpgradeKit` release kit for ekarvo's modules/platforms; confirm it stages only the 2.1.0→2.1.1 fix files and `.upgrade-base/` exists. Load the uploaded 2.1.1 snapshot from R2 and confirm a 2.1.1 release kit is empty (current).
- [ ] Full: `pnpm --dir apps/web typecheck`, `pnpm --dir apps/web test`, `pnpm arch:check`, `pnpm --dir packages/create-saas-forge test`, `pnpm template:check-sync`, `pnpm scaffold:matrix --static`.

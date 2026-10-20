# Release kits: bring a downloaded project up to the latest release

Date: 2026-10-20
Status: builder-checked; awaiting owner approval

## Why

A buyer downloads one compiled variant of the starter (their modules, providers
and platforms). When SaaS Forge ships a release that only fixes or improves
existing code, the project shows "1 release behind" on `/projects`, but there is
no way to get the code. Upgrade kits only exist for module, tier or provider
changes, and both sides of their diff are compiled from the *current* starter,
so release changes never appear in them. The only fallback today is reading the
release notes and editing by hand, then `upgrade --mark-current` (uncommitted
work on `feat/mark-project-current`).

Triggering case: a bug fix in saas-forge after `template/v2.1.1` becomes 2.1.2.
The owner's project `ekarvo` (sibling folder, `.saas-forge.json` says 2.1.1, **not
a git repo**) should be able to pull exactly the changed files that exist in its
variant.

## Goals

1. Any buyer can see whether their downloaded project is behind, from the CLI,
   from Claude (MCP), and from `/projects`.
2. Any buyer can get a **release kit**: the files that changed between the
   project's recorded version and the latest, compiled for the project's own
   modules, providers and platforms. Changes to modules they don't have never
   appear.
3. The kit is applied with the existing `/upgrade-boilerplate` Claude command,
   which merges into a customised codebase instead of overwriting.
4. Release kits are free. After a kit is issued, the project records the latest
   version.
5. Module/tier/provider upgrades also carry the release changes when the project
   is behind (one combined kit; price stays modules-only).

## Non-goals

- Auto-applying files to the buyer's tree. Everything is staged; Claude merges.
- Requiring git in the buyer's project.
- One-release-at-a-time stepping. One kit always covers project version → latest.
- Changing release notes, release emails or the Upgrade Center's notes listing.

## Anti-goals (failure even if it "works")

- A kit that contains changes for modules or providers the project doesn't have.
- A kit that charges credits for a release-only update.
- Overwriting buyer customisations, or a kit whose diff is polluted by noise that
  makes Claude rewrite untouched files.
- Breaking existing module-upgrade kits, free re-download rules (`lastBuiltHash`)
  or the scaffold build cache.
- Shipping the scaffold/release-kit server code into the starter (it stays
  root-only, like `/api/scaffold`).

## Decided design

### 1. Release snapshots in R2

- `pnpm template:publish --version X` (in `scripts/publish-template-branch.mjs`,
  after a successful publish, skipped on `--dry-run`) uploads one archive per
  release: the staged starter `.generated/saas-boilerplate` (with markers) plus
  root `scaffold-modules/` and `scaffold-providers/`. ~58 MB uncompressed today.
- Stored in the same R2 bucket and credentials the build cache uses
  (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`),
  under its own prefix keyed by version.
- Publish and backfill read R2 credentials from `apps/web/.env`; production
  reads the same bucket (owner confirmed).
- Because the snapshot is uploaded from the staged folder during publish, it
  always matches what was published, even when publish runs on a dirty tree.
- One-off backfill script for past releases, taking explicit
  `version=commit` pairs. The `(from saas-forge@<sha>)` in template commit
  titles is **not** reliable: `template/v2.1.1` names `526506e`, whose manifest
  still says 2.1.0; the published content is `6184ed2` (publish ran on
  uncommitted changes). For each pair, stage that commit in a temporary
  worktree, then **verify** before uploading: compile the all-modules variant
  from the snapshot (with its own rules) and compare it with the
  `template/v<version>` tag tree, refusing on mismatch. At minimum 2.1.1
  (`6184ed2`) must be backfilled so ekarvo works.
- Deploys can ship starter changes before a version bump (owner confirmed this
  happens). Accepted: a project downloaded in such a window gets a kit that
  repeats changes it already has, which the three-way merge treats as no-ops.
  Snapshots stay keyed by version.
- The latest version needs no snapshot: it is the starter the deploy already
  ships (`getScaffoldRoot()` and the root manifests).

### 2. Compiling an old variant

`compileScaffoldVariant` and the registry/manifest loaders (`loadScaffoldRegistry`,
`loadModuleManifest`, `loadProviderRegistry`, `getProviderRoot`, `getModuleRoot`)
currently resolve `scaffold-modules/` and `scaffold-providers/` from the working
directory. They gain an optional rules root so an old snapshot is compiled with
**its own** manifests. Default behaviour (no rules root) is unchanged. Old
snapshots compile with today's compiler code.

### 3. Which version a kit starts from

The version in the project's own files is the truth (owner decision):

- The CLI sends `fromVersion` from `.saas-forge.json` (`templateVersion`, else
  `.boilerplate-version`) on the GET preview and POST upgrade. MCP tools take an
  optional `fromVersion` the agent reads from the repo. Web uses the DB value.
  The server validates it as a published version with a snapshot, or the latest.
- Downloads start stamping `ProjectConfig.templateVersion` (today
  `markProjectBuilt` only stamps `lastBuiltHash`/`lastBuiltAt`; `createProject`
  sets the version once). This fixes false "behind" badges on re-downloaded
  projects such as, probably, ekarvo. `lastBuiltHash` must stay consistent with
  `computeBuildHash` (which includes `templateVersion`).
- Existing rows that module upgrades stamped "latest" without release changes
  are not corrected; the CLI path uses the file version anyway.
- Because the CLI can send its version, a lost kit can be fetched again even
  after the DB says latest.

### 4. The diff

New "from" side: the project's variant at its `fromVersion`
(snapshot) with its current modules/providers. New "to" side: latest starter
with the target modules/providers (same as before for upgrades; same as "from"
for a release-only kit). Platforms are the project's.

- Release-only kit: from = (old version, project config), to = (latest, project
  config).
- Module/tier/provider upgrade while behind: from = (old version, old config),
  to = (latest, new config). One combined kit.
- Upgrade while already current: unchanged from today.
- If no snapshot exists for the project's version: module upgrades fall back to
  today's behaviour (both sides latest); a release-only kit is unavailable and
  the response says so and points to release notes + `mark-current`.

### 5. Kit contents

Same layout as today's upgrade kit, so `/upgrade-boilerplate` keeps working:

- `<slug>/.upgrade/<path>`: new version of every added or modified file.
- `<slug>/.upgrade-base/<path>`: **new.** The old version of every modified or
  removed file, so Claude can do a three-way merge (old SaaS Forge / new SaaS
  Forge / buyer's file). Matters because projects may have no git.
- `<slug>/UPGRADE_SPEC.json`: gains `kind` (`"release"` or `"upgrade"`),
  `fromVersion`, `toVersion`, and the release notes in between (filtered to the
  project's modules, as `getProjectReleases` already does).
- `<slug>/UPGRADE.md`: lists versions and release-note entries.
- `<slug>/SETUP.md`: as today.
- `<slug>/.claude/commands/upgrade-boilerplate.md`: the latest command, staged
  so an old project gets the three-way-merge instructions. (Builder decides
  whether it is written directly or staged under `.upgrade/`.)
- `.saas-forge.json` and `.boilerplate-version` updates are listed as steps in
  the spec (the CLI writes `.saas-forge.json` itself after extracting).

### 6. Server entry points (root-only)

- `GET /api/v1/projects/[slug]/upgrade` already returns `{ preview, releases }`.
  Its preview and the `upgradePreview` tRPC procedure use the new "from" side,
  so file counts include release changes.
- Release-only kit download, API key: `POST /api/v1/projects/[slug]/upgrade` with
  a body that changes nothing now returns a free release kit when the project is
  behind (instead of `400 nothing_to_upgrade`); still 400 when current. Scope
  `scaffold:upgrade`. No credits charged; a `ScaffoldJob`-style record is the
  builder's call.
- Web: `/api/scaffold/upgrade` (session) gets the same behaviour; `/projects`
  Upgrade Center gets a "Get update" button next to the existing "behind" state.
- After a release kit is issued, the project's `templateVersion` moves to latest
  and `lastBuiltHash` moves with it only when the old hash still matched (same
  rule as `markProjectCurrent` on this branch), so free re-downloads stay free
  and paid ones stay paid.
- Release kits are served through the scaffold function (`/api/scaffold/*`,
  `/api/v1/projects/[slug]/upgrade`), whose `outputFileTracingIncludes` already
  ship the starter. `traceConfig.test.ts` must still pass.

### 7. CLI (`packages/create-saas-forge`)

- `create-saas-forge status`: reads `.saas-forge.json`, calls the GET upgrade
  preview, prints project version, latest version, and the release-note entries
  in between, plus the hint to run `upgrade`.
- `create-saas-forge upgrade` with no flags: when the project is behind and
  nothing else is requested, shows release-kit file counts and notes, confirms,
  downloads and extracts, writes `templateVersion` to `.saas-forge.json`.
  `--dry-run` keeps working. Upgrades with `--add/--tier/--provider` now carry
  release changes automatically.
- `upgrade --mark-current` stays (fallback).
- `create-saas-forge` is published separately; bump and publish per CLAUDE.md
  step 5.

### 8. MCP (`apps/web/lib/scaffold/mcp-tools.ts`)

- `quote_upgrade` with nothing added and project behind: returns
  `releaseKitAvailable`, file counts, notes, `credits: 0` and the
  `create-saas-forge upgrade` command, instead of "apply by hand". When no
  snapshot exists, keeps the current mark-current message.
- `platformMcpInstructions` updated accordingly. `mark_project_current` stays.

### 9. Kept from `feat/mark-project-current`

The uncommitted mark-current work (service, route, MCP tool, CLI flag, tests,
docs row) stays as the fallback and ships with this feature.

## Calls I made (owner can overrule)

- `.upgrade-base/` old-file copies for three-way merges.
- Kit stages the latest `/upgrade-boilerplate` command.
- Files the buyer deleted locally are not tracked; a modified file that is
  missing in the project is reported by Claude, not recreated silently.
- Old snapshots compile with the current compiler; small compiler-caused diffs
  are acceptable.
- Treat the bug fix after 2.1.1 as release 2.1.2; ekarvo (2.1.1) is the first
  end-to-end test.

## Left to the builder

- R2 object naming, archive format (zip vs tar.gz), and local caching of a
  fetched snapshot in `/tmp` within a function invocation.
- Exact `UPGRADE_SPEC.json` field names beyond those listed.
- Whether the release kit gets its own `ScaffoldJob` type, analytics event
  (`apps/web/lib/scaffold/analytics-events.ts`) and route-policy changes
  (existing rows likely cover it).
- Text of `upgrade-boilerplate.md` changes (must cover `.upgrade-base/` and
  `kind: "release"`), in root `.claude/commands/` and the starter via
  `pnpm template:sync`.
- Tests: compiler rules-root, diff with an old snapshot fixture, CLI status /
  release upgrade, MCP quote, route behaviour; `BUILDER_VERSION` bump if the
  compile/archive output changes.

## Validation

`pnpm --dir apps/web typecheck`, `pnpm --dir apps/web test`, `pnpm arch:check`,
CLI tests, `pnpm template:check-sync`, `pnpm scaffold:matrix --static`. Manual:
backfill 2.1.1 snapshot, run the release-kit build locally for ekarvo's config,
inspect the kit (only the bug-fix files, `.upgrade-base/` present).

---
description: Apply a saas-forge boilerplate upgrade kit into this project using the staged delta and UPGRADE_SPEC.json.
---

You are upgrading this project with a boilerplate **upgrade kit** produced by saas-forge. The kit was unzipped into the project root and contains:

- `UPGRADE_SPEC.json` — the machine-readable upgrade plan.
- `.upgrade/` — staged new/changed files at their real project-relative paths (the new saas-forge version).
- `.upgrade-base/` — the old saas-forge version of every modified or removed file, when the kit has one.
- `SETUP.md` — any new environment variables to obtain.

Your job is to **integrate** the delta into this (possibly heavily customized) codebase — not to blindly overwrite files. Preserve all existing custom code.

## Steps

1. **Read `UPGRADE_SPEC.json`.** Note `kind`, `fromVersion`, `toVersion`, `releases`, `addedModules`, `removedModules`, `tierSteps`, `to.tierId`, `newEnvKeys`, and `changedFiles` (`added`, `modified`, `removed`). If there is no `UPGRADE_SPEC.json` in the project root, stop and tell the user the upgrade kit is missing.
   - `kind: "release"` is a free update: no modules change, only the saas-forge releases between `fromVersion` and `toVersion` (listed in `releases`). Apply only what changed upstream.
   - `kind: "upgrade"` adds or removes modules, raises the tier or switches a provider, and also carries the releases since `fromVersion` when it differs from `toVersion`.

2. **Added files** (`changedFiles.added`): copy each from `.upgrade/<path>` to `<path>`. These are new files a module or release introduces and should not collide with existing code. If `<path>` already exists, merge as in step 3.

3. **Modified files** (`changedFiles.modified`): merge the boilerplate's change into the user's version, keeping their customizations. Never wholesale-replace a file the user may have edited — apply only the delta:
   - **With `.upgrade-base/<path>`** (three-way merge): the upstream change is the diff from `.upgrade-base/<path>` (old saas-forge) to `.upgrade/<path>` (new saas-forge). Apply that diff to `<path>` (the user's file). If `<path>` already equals `.upgrade/<path>`, there is nothing to do. If `<path>` equals `.upgrade-base/<path>`, the user never touched it: take `.upgrade/<path>`. Where the user changed the same lines, keep their intent and fold the upstream change in; list those files at the end.
   - **Without it**: diff `.upgrade/<path>` against `<path>` and apply only the boilerplate's change.
   - Typical spots: `apps/web/trpc/routers/_app.ts` (router import + registration), `packages/database/prisma/*.prisma` (new models/fields; a migration follows in step 5), `apps/web/.env.example` (append new keys), `package.json` (merge dependencies/scripts), `apps/web/middleware.ts` and similar infra (only the changed lines).
   - If `<path>` no longer exists (the user deleted or moved it), do not recreate it silently: report it.

4. **Removed files** (`changedFiles.removed`): delete each from the project (they belong to a module being removed, or a release dropped them). If the user's copy differs from `.upgrade-base/<path>` or is imported by their custom code, ask before deleting.

5. **Finish up:**
   - `pnpm install` if dependencies changed.
   - `pnpm generate` if Prisma schemas changed, then tell the user to run `pnpm migrate` (review the migration first — do not create it yourself).
   - Add each key in `newEnvKeys` to `apps/web/.env`, following `SETUP.md` for where to obtain it.
   - `pnpm --dir apps/web typecheck` and fix any breakage the merge introduced.
   - When `fromVersion` differs from `toVersion`, make sure `.saas-forge.json` (`templateVersion`) and `.boilerplate-version` say `toVersion` (the create-saas-forge CLI already does this).

6. **Clean up:** delete `.upgrade/`, `.upgrade-base/`, `UPGRADE_SPEC.json`, and `UPGRADE.md` once everything is integrated.

Work on a fresh git branch when the project uses git. When done, summarize exactly what you changed and flag anything that needs manual attention (especially Prisma migrations, new secrets, and files where the user's changes and upstream overlapped).

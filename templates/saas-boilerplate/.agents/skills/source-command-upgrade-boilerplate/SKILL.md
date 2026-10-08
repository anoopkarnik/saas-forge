---
name: "source-command-upgrade-boilerplate"
description: "Apply a saas-forge boilerplate upgrade kit into this project using the staged delta and UPGRADE_SPEC.json."
---

# source-command-upgrade-boilerplate

Use this skill when the user asks to run the migrated source command `upgrade-boilerplate`.

## Command Template

You are upgrading this project with a boilerplate **upgrade kit** produced by saas-forge. The kit was unzipped into the project root and contains:

- `UPGRADE_SPEC.json` — the machine-readable upgrade plan.
- `.upgrade/` — staged new/changed files at their real project-relative paths.
- `SETUP.md` — any new environment variables to obtain.

Your job is to **integrate** the delta into this (possibly heavily customized) codebase — not to blindly overwrite files. Preserve all existing custom code.

## Steps

1. **Read `UPGRADE_SPEC.json`.** Note `addedModules`, `removedModules`, `tierSteps`, `to.tierId`, `newEnvKeys`, and `changedFiles` (`added`, `modified`, `removed`). If there is no `UPGRADE_SPEC.json` in the project root, stop and tell the user the upgrade kit is missing.

2. **Added files** (`changedFiles.added`): copy each from `.upgrade/<path>` to `<path>`. These are new files a module introduces and should not collide with existing code.

3. **Modified files** (`changedFiles.modified`): for each, diff `.upgrade/<path>` against the current `<path>` and **merge the boilerplate's change into the user's version**, keeping their customizations. Never wholesale-replace a file the user may have edited — apply only the delta:
   - `apps/web/trpc/routers/_app.ts`: add the new router import + its registration entry.
   - `packages/database/prisma/*.prisma`: add the new models/fields (a migration follows in step 5).
   - `apps/web/.env.example`: append the new keys.
   - `package.json`: merge new dependencies/scripts.
   - `apps/web/middleware.ts` and similar infra: apply only the changed lines.

4. **Removed files** (`changedFiles.removed`): delete each from the project (these belong to a module being removed). Confirm they aren't imported by the user's custom code first.

5. **Finish up:**
   - `pnpm install` if dependencies changed.
   - `pnpm generate` if Prisma schemas changed, then tell the user to run `pnpm migrate` (review the migration first — do not create it yourself).
   - Add each key in `newEnvKeys` to `apps/web/.env`, following `SETUP.md` for where to obtain it.
   - `pnpm --dir apps/web typecheck` and fix any breakage the merge introduced.

6. **Clean up:** delete `.upgrade/`, `UPGRADE_SPEC.json`, and `UPGRADE.md` once everything is integrated.

Work on a fresh git branch. When done, summarize exactly what you changed and flag anything that needs manual attention (especially Prisma migrations and new secrets).

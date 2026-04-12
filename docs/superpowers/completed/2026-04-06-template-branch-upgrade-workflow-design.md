# Template Branch Upgrade Workflow

## Context

The saas-forge repo has a template sync pipeline that produces clean starter copies for distribution via ZIP download (`/api/scaffold`) and CLI (`npx saas-forge`). However, once a downstream project is created, there is **no mechanism to pull boilerplate updates** back into it. The downstream project has no git relationship to saas-forge (it was extracted from a ZIP), so manual file-by-file copying is the only option today. This is time-consuming and error-prone.

**Goal:** Establish a repeatable, git-native workflow for pulling boilerplate updates into any downstream project.

## Approach: Git Orphan Branch with Standard Merge

Create an orphan branch (`template/saas-boilerplate`) in the saas-forge repo that contains only the clean starter output (what `.generated/saas-boilerplate/` produces). Downstream projects add saas-forge as a git remote and merge from this branch using standard git merge.

### Why this approach

- **Native 3-way merge:** After the first merge with `--allow-unrelated-histories`, every subsequent merge is a proper 3-way merge where git knows which side changed what.
- **Zero downstream tooling:** The downstream project needs only standard git commands.
- **Full visibility:** `git diff` between version tags to preview changes. `git log` on the template branch to see history.
- **Works with existing workflows:** PRs, code review, branch protection all work naturally.

## Deliverables

### 1. `scripts/publish-template-branch.mjs`

New Node.js script (~120 lines) that publishes the clean starter to the orphan branch.

**Behavior:**
1. Validates that `.generated/saas-boilerplate/` exists and is non-empty (the caller is responsible for staging via `pnpm template:stage` — the `template:publish` npm script chains this automatically).
2. Creates a temporary git worktree on the `template/saas-boilerplate` orphan branch.
   - If the branch does not exist yet, creates it as an orphan.
3. Removes all existing tracked content from the worktree.
4. Copies the entire contents of `.generated/saas-boilerplate/` into the worktree root.
5. Writes `.boilerplate-version` containing the version string.
6. Stages all changes with `git add -A`.
7. Commits with message: `chore: update template to v<version> (from saas-forge@<short-hash>)`.
8. Tags as `template/v<version>`.
9. Pushes branch and tag to origin (unless `--no-push`).
10. Removes the temporary worktree.

**CLI interface:**
```bash
pnpm template:publish --version <semver>
pnpm template:publish --version <semver> --dry-run
pnpm template:publish --version <semver> --no-push
```

**Flags:**
- `--version <semver>` (required): The version string to tag (e.g., `1.1.0`).
- `--dry-run`: Show what would happen without committing or pushing.
- `--no-push`: Commit and tag locally but do not push.

**Error handling:**
- Fails if `.generated/saas-boilerplate/` does not exist or is empty (run `pnpm template:stage` first).
- Fails if the version tag already exists (to prevent overwriting published versions).
- Cleans up the temporary worktree even on failure.

### 2. `.boilerplate-version` file

A plain text file at the root of every starter project containing the version string:
```
1.1.0
```

**Injection points:**
- The publish script writes it into the orphan branch commit.
- The scaffold route (`apps/web/app/api/scaffold/route.ts`) injects it into the ZIP archive so new downloads know their base version.

**Scaffold route change:** Add an `archive.append()` call that writes the current template version to `<projectName>/.boilerplate-version` in the ZIP. The version is read from the `.boilerplate-version` file in the staged output (`.generated/saas-boilerplate/.boilerplate-version`), which the publish script keeps up to date. Additionally, add a `templateVersion` field to `template-sync.manifest.json` so the scaffold route has a fallback source if the staged file is missing.

### 3. `template:publish` npm script

Added to root `package.json`:
```json
"template:publish": "pnpm template:stage && node scripts/publish-template-branch.mjs"
```

This ensures the staged output is always fresh before publishing. Typical usage:
```bash
pnpm template:publish --version 1.1.0
```

### 4. `UPGRADING.md` in template overrides

New file at `template-overrides/saas-boilerplate/UPGRADING.md` so it ships in every starter.

**Contents:**
- Prerequisites (git, saas-forge remote URL)
- One-time setup instructions
- Ongoing upgrade workflow
- Conflict resolution guide by file category
- Troubleshooting (lockfile conflicts, schema migrations)

## Downstream Workflows

### Fresh download from site (zero conflicts)

```bash
# After extracting ZIP and running git init:
cat .boilerplate-version
# 1.1.0

git remote add boilerplate https://github.com/anoopkarnik/saas-forge.git
git fetch boilerplate template/saas-boilerplate

# Merge from exact version tag (identical content = no conflicts)
git merge template/v1.1.0 --allow-unrelated-histories

# Later, when new version is available:
git fetch boilerplate template/saas-boilerplate
git checkout -b upgrade/boilerplate-v1.2.0
git merge boilerplate/template/saas-boilerplate
# resolve conflicts, pnpm install, test, PR
```

### Existing project (one-time catch-up)

For projects created before this system existed:

```bash
git remote add boilerplate https://github.com/anoopkarnik/saas-forge.git
git fetch boilerplate template/saas-boilerplate

git checkout -b upgrade/boilerplate-latest
git merge boilerplate/template/saas-boilerplate --allow-unrelated-histories

# Expect more conflicts than usual since there's a version gap
# For pnpm-lock.yaml: accept theirs, then pnpm install
git checkout --theirs pnpm-lock.yaml
# Resolve remaining conflicts
git add .
git commit
pnpm install
```

### Previewing changes before upgrading

```bash
git fetch boilerplate template/saas-boilerplate
# See which files changed:
git diff HEAD...boilerplate/template/saas-boilerplate --stat
# See full diff:
git diff HEAD...boilerplate/template/saas-boilerplate
# See only changes in a specific area:
git diff HEAD...boilerplate/template/saas-boilerplate -- packages/database/prisma/
```

## Conflict Resolution Strategy

| File Category | Examples | Strategy |
|---|---|---|
| Lockfile | `pnpm-lock.yaml` | Accept theirs (`git checkout --theirs`), then `pnpm install` |
| Core packages | `packages/auth/`, `packages/ui/`, `packages/database/src/` | Accept boilerplate updates (standard merge) |
| Prisma schemas | `packages/database/prisma/*.prisma` | Manual review required — may need migration |
| App infrastructure | `apps/web/middleware.ts`, `apps/web/trpc/` | Standard 3-way merge |
| Customizable surfaces | `apps/web/app/(home)/`, business logic | Your customizations take priority |
| Env examples | `*.env.example` | Review for new variables to add to your `.env` |
| Config files | `tsconfig.json`, `turbo.json`, `.eslintrc.js` | Usually accept boilerplate |

## Files to Modify

| File | Change |
|---|---|
| `scripts/publish-template-branch.mjs` | **New file.** Core publish script. |
| `package.json` | Add `template:publish` script. |
| `template-sync.manifest.json` | Add `templateVersion` field. |
| `apps/web/app/api/scaffold/route.ts` | Inject `.boilerplate-version` into ZIP output. |
| `template-overrides/saas-boilerplate/UPGRADING.md` | **New file.** Downstream upgrade documentation. |

## Verification

### Unit verification

1. Run `pnpm template:stage` to produce `.generated/saas-boilerplate/`.
2. Run `pnpm template:publish --version 1.0.0 --no-push` and verify:
   - The `template/saas-boilerplate` orphan branch exists locally.
   - The branch content matches `.generated/saas-boilerplate/` plus `.boilerplate-version`.
   - The tag `template/v1.0.0` exists.
3. Make a change to a source file, re-stage, run `pnpm template:publish --version 1.0.1 --no-push`.
4. Verify the new commit shows only the delta from the change.

### Integration verification (simulated downstream merge)

1. Create a temporary directory, `git init`, and copy the v1.0.0 content into it as an initial commit.
2. Make a simulated "user customization" (edit a file in `apps/web/app/(home)/`).
3. Add saas-forge as a remote, fetch the template branch.
4. Merge `template/v1.0.1`. Verify:
   - Files the "user" didn't touch merge cleanly.
   - The edited file shows a proper conflict with `<<<<<<< HEAD` / `>>>>>>> boilerplate` markers.
5. Resolve the conflict, `pnpm install`, verify the project is functional.

### Scaffold verification

1. Trigger a scaffold download via `/api/scaffold`.
2. Verify the ZIP contains `.boilerplate-version` with the correct version string.

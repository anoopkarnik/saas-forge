---
name: boilerplate-sync
description: >-
  Import selected feature additions and bug fixes from the saas-forge boilerplate
  (the `boilerplate` git remote) into this app, one feature at a time, preserving
  all existing custom code. Use this whenever the user wants to pull, sync, import,
  cherry-pick, or "catch up on" changes from saas-forge / the boilerplate / upstream
  — including phrasings like "what's new in the boilerplate", "check saas-forge for
  new features or bug fixes", "bring over the X feature from the boilerplate",
  "upgrade the boilerplate", or "merge the latest from saas-forge". Trigger it even
  when the user names a specific feature rather than the boilerplate itself (e.g.
  "add the invite-only feature the boilerplate has"). Do NOT do a plain
  `git merge boilerplate/main` — that collides the whole tree; follow this skill's
  per-feature cherry-pick flow instead.
---

# Boilerplate Sync

Import features/bugfixes from the `saas-forge` boilerplate into this consumer app
**selectively and non-destructively**. The user picks what to bring over; you apply
each pick as a path-filtered 3-way patch and resolve conflicts so the app's own code
always wins where it diverges.

This app is a downstream product built *on top of* saas-forge. It has heavily
customized shared files (auth, middleware, the Prisma `User` model, sidebars, admin
pages) and many extra domains the boilerplate doesn't have. A whole-repo merge is
never the right tool. Bring over intent, not raw commits.

## Why not just `git merge`

Run these first to see the topology — it dictates everything:

```bash
git fetch boilerplate --tags
git merge-base --is-ancestor boilerplate/template/saas-boilerplate HEAD && echo "release branch already merged" || echo "release branch has new commits"
git merge-base HEAD boilerplate/main || echo "NO common ancestor with main"
```

- **`boilerplate/main`** is saas-forge's *development* branch. It has **no common
  ancestor** with this app (it was created from a different root). A direct
  `git merge boilerplate/main` refuses ("unrelated histories"); forcing it with
  `--allow-unrelated-histories` produces an **add/add conflict on every shared file**
  (600+). Never do this.
- **`boilerplate/template/saas-boilerplate`** is the *distilled release* branch
  (one squashed commit per version, tagged `template/vX.Y.Z`). This app descends from
  it, so it merges cleanly — but new features often land on `main` days/weeks before
  they're distilled to a release tag. That gap is exactly why this skill exists:
  to cherry-pick individual features off `main` without the tree collision.

So: the newest work lives on `boilerplate/main`, and you reach it feature-by-feature.

## The workflow

### 1. Preflight

```bash
git status                      # must be clean, or stop and ask
git fetch boilerplate --tags
cat .boilerplate-version        # last distilled version this app synced
git log boilerplate/main --oneline -40
```

Confirm the working tree is clean before mutating anything. If the release branch has
genuinely new distilled commits (`merge-base --is-ancestor` fails above), offer the
clean `git merge boilerplate/template/saas-boilerplate` path as an alternative — that
path is a real 3-way merge and only conflicts on files this app customized.

### 2. Discover candidate features

Read `boilerplate/main`'s history since this app last synced and **group commits into
features** (a feature is usually several commits: db → backend → api → ui → tests).
Look at `git log boilerplate/main --oneline` and cluster by subject prefix and theme.

Present the groups to the user compactly — feature name, one-line purpose, rough size,
and any **dependency** you can see (e.g. "API Management builds on the guest role";
"guest management reuses the admin users page from the invite-only feature"). Call out
bug-fix commits separately from feature additions.

### 3. Let the user choose

Ask which feature groups / bug fixes to import (`AskUserQuestion`, multi-select). For
each chosen group, plan the commit list in **dependency order**: schema first, then
auth/server, then API/tRPC, then UI, then sign-up/other surfaces. If feature B depends
on feature A the user didn't pick, say so and let them decide.

### 4. Apply each commit as a path-filtered 3-way patch

The core mechanism — it works cross-lineage because the pre-image blobs are in the
object DB, and it never creates a commit (the user manages git themselves):

```bash
git show <sha> -- <real-path> [<real-path> ...] | git apply --3way --whitespace=nowarn
```

Rules that make this reliable:

- **Filter to real source paths only.** saas-forge is the boilerplate repo, so every
  commit touches each file *twice*: the real `apps/`/`packages/` path **and** a
  `templates/saas-boilerplate/...` mirror, plus `template-sync.manifest.json` and
  version bumps. This app has no `templates/` mirror. **Always exclude:**
  `templates/`, `template-overrides/`, `template-sync.manifest.json`,
  `docs/superpowers/**`, `specs/**`, `packages/database/prisma/migrations/**`, and
  pure version-bump edits to `package.json` / `app.json`. List the real paths with:
  ```bash
  git show <sha> --name-only --pretty=format: | grep -vE '^templates/|^template-overrides/|template-sync|^docs/|^specs/|migrations/' | grep .
  ```
- **`git apply` is atomic.** If any one file in the patch fails (e.g. it modifies a
  file this app doesn't have), the *whole* patch rolls back. Check which target files
  exist first and drop the ones that don't — this app legitimately lacks some
  boilerplate routes/components. Re-run with the surviving paths.
- **New files** just get created. **Modified files** 3-way merge and may leave
  `<<<<<<< ours / ======= / >>>>>>> theirs` markers.
- After each commit, check `git diff --name-only --diff-filter=U` and resolve markers.
  A resolved file still shows as unmerged in the *index* until you `git add` it —
  stage resolved files as you go (this is conflict-resolution mechanics, not the
  "commit" step the user reserves for themselves).

### 5. Resolve conflicts — app code wins

The app's version is the source of truth for anything it customized. When resolving:

- **Keep the app's structure/formatting** (indentation, its larger relation lists, its
  HUD layouts, its route arrays) and inject only the *new behavior* the boilerplate
  commit adds. Boilerplate whitespace/style differences are noise — discard them.
- **Drop boilerplate additions that depend on features the app doesn't have.** E.g. if
  a commit's page edit also pulls in an unrelated subsystem, take only the part
  relevant to the chosen feature.
- **When a shared file has diverged massively** (the whole body conflicts and the
  3-way output looks truncated/interleaved — common for `AppSidebar.tsx`, big Prisma
  models), don't hand-untangle it. `git checkout HEAD -- <file>` to restore the app's
  version, then re-apply just the small addition by hand. Safer than trusting a
  200-line auto-merge that may have dropped app content.
- **Skip parts that are N/A here** (routes/models this app doesn't ship). Note each
  skip for the final report.

### 6. Watch for these known traps

- **Entangled features.** Boilerplate features often share touchpoints (two features
  both add a `databaseHooks.user.create` hook; both add controls to the same admin
  page). Reconcile the shared file by hand rather than by patch, and keep both
  behaviors. If the user imports one now and its sibling later, re-integrate the
  shared file then.
- **Hand-maintained registries / drift tests.** Some boilerplate features ship a
  hand-written list plus a test asserting it matches the *live* router/config (e.g. an
  API-registry drift test). This app's router is much larger, so that test fails here.
  Import the feature but **omit the drift test**, and tell the user to extend the list
  for this app's domains before re-enabling it.
- **Security posture of ported code.** Auth/payment/invite/credit code carries the
  boilerplate's own security tradeoffs. After importing such code, review it (or run
  `/security-review`) and surface real issues — don't assume "it's from the
  boilerplate" means it's safe. Fix or explicitly flag before calling the import done.

### 7. Verify (do not skip)

```bash
pnpm --filter @workspace/database exec prisma validate
pnpm generate                              # if any .prisma changed
nvm use 22.9.0                             # web typecheck/tests break on the default Node
pnpm --dir apps/web typecheck
pnpm --dir apps/web test                   # full suite when central files (e.g. _app.ts, auth) changed
pnpm --filter @workspace/<pkg> test        # for each touched package (auth, email, ui, database)
```

Run a single web test file with `pnpm --dir apps/web test <Name>` (NOT `-- --run <Name>`,
which runs everything). Fix anything red before reporting success — evidence before
assertions.

### 8. Report and hand off

- **Do not commit, branch, or stash** — the user manages git. Leave the changes staged
  so they can review with `git diff --cached` and commit themselves.
- **Migrations:** if any `.prisma` file changed, a migration is needed. Per this repo's
  rules, **do not create the `migration.sql`** — state clearly that the user must run
  `pnpm migrate`, and name the new models/enums/columns.
- Summarize per feature: what landed, what you deliberately skipped and why, any
  security findings, and the migration action.

## Repo facts to respect

- **Domain mirroring.** A feature usually spans four places per domain:
  `apps/web/app/(home)/<domain>/`, `apps/web/components/<domain>/`,
  `apps/web/trpc/routers/<domain>/`, and `packages/database/prisma/<domain>.prisma`.
  Non-component code belongs under `apps/web/lib/` (constants, ts-types, utils,
  formulas, zod) — never inline in `page.tsx`.
- **Prisma:** schema is split per domain under `packages/database/prisma/`. Never edit
  files under `migrations/`. Run `pnpm generate` after schema changes; the owner runs
  `pnpm migrate`.
- **Cloud SQL has no pooler** — never run Prisma with `Promise.all([...])`; batch with
  `db.$transaction([...])` or await sequentially.
- **Node:** use `nvm use 22.9.0` before web typecheck/tests (the default Node breaks them).
- **Env vars:** if imported code reads a new `process.env.*`, add it to the relevant
  `.env.example` in the same change.

## Quick reference — apply one commit

```bash
# 1. see the real paths (minus mirror/docs/migration noise)
git show <sha> --name-only --pretty=format: | grep -vE '^templates/|^template-overrides/|template-sync|^docs/|^specs/|migrations/' | grep .
# 2. apply just those paths as a 3-way patch (no commit created)
git show <sha> -- <path1> <path2> | git apply --3way --whitespace=nowarn
# 3. resolve markers, then stage the resolved files
git diff --name-only --diff-filter=U
git add <resolved paths>
```

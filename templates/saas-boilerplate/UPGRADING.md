# Upgrading Your Project

This project was scaffolded from [saas-forge](https://github.com/anoopkarnik/saas-forge). You can pull boilerplate updates into your project using standard git merge.

## Prerequisites

- Git installed
- Your project is a git repository with at least one commit

## One-Time Setup

Check which boilerplate version you started from:

```bash
cat .boilerplate-version
```

Add the boilerplate as a git remote and do the initial merge:

```bash
# Add saas-forge as a remote (only fetches the template branch, not the full repo)
git remote add boilerplate https://github.com/anoopkarnik/saas-forge.git

# Fetch the template branch
git fetch boilerplate template/saas-boilerplate

# Create an upgrade branch
git checkout -b upgrade/boilerplate-initial

# Merge from the version you downloaded (should produce zero conflicts for fresh projects)
git merge template/v<YOUR_VERSION> --allow-unrelated-histories

# If you have conflicts (common for pnpm-lock.yaml), resolve them:
git checkout --theirs pnpm-lock.yaml
# Resolve any other conflicts, then:
git add .
git commit
pnpm install
```

After this initial merge, git has a merge base connecting your project's history to the boilerplate's history. All future merges will be standard 3-way merges.

## Upgrading to a New Version

When a new boilerplate version is available:

```bash
# Fetch latest template branch
git fetch boilerplate template/saas-boilerplate

# Preview what changed (optional but recommended)
git diff HEAD...boilerplate/template/saas-boilerplate --stat

# Create an upgrade branch
git checkout -b upgrade/boilerplate-v<NEW_VERSION>

# Merge
git merge boilerplate/template/saas-boilerplate

# Handle lockfile (always conflicts — this is normal)
git checkout --theirs pnpm-lock.yaml
pnpm install

# Resolve any other conflicts, test, then merge via PR
```

## Previewing Changes

Before upgrading, you can inspect exactly what changed:

```bash
# Summary of changed files
git diff HEAD...boilerplate/template/saas-boilerplate --stat

# Full diff
git diff HEAD...boilerplate/template/saas-boilerplate

# Diff for a specific area (e.g., database schemas)
git diff HEAD...boilerplate/template/saas-boilerplate -- packages/database/prisma/

# See the template branch commit history
git log boilerplate/template/saas-boilerplate --oneline
```

## Conflict Resolution Guide

Not all files are equal during an upgrade. Use this guide to decide how to resolve conflicts:

| File Category | Examples | Strategy |
|---|---|---|
| **Lockfile** | `pnpm-lock.yaml` | Always accept theirs, then run `pnpm install` |
| **Core packages** | `packages/auth/`, `packages/ui/`, `packages/email/` | Usually accept boilerplate updates |
| **Prisma schemas** | `packages/database/prisma/*.prisma` | Review carefully — may need a database migration |
| **App infrastructure** | `apps/web/middleware.ts`, `apps/web/trpc/` | Standard merge — review both sides |
| **Your custom code** | `apps/web/app/(home)/`, business logic | Your changes take priority |
| **Env examples** | `*.env.example` | Review for new env vars to add to your `.env` |
| **Config files** | `tsconfig.json`, `turbo.json`, `.eslintrc.js` | Usually accept boilerplate |

### Quick conflict commands

```bash
# Accept the boilerplate's version of a file
git checkout --theirs <file>

# Keep your version of a file
git checkout --ours <file>

# See what the boilerplate changed in a conflicted file
git diff boilerplate/template/saas-boilerplate -- <file>
```

## After Upgrading

1. Run `pnpm install` to reconcile dependencies
2. Run `pnpm generate` if Prisma schemas changed
3. Run `pnpm migrate` if database schema changed (review the migration first)
4. Run `pnpm dev` and test your application
5. Run `pnpm test` to verify nothing broke

## Troubleshooting

### "fatal: refusing to merge unrelated histories"
Add `--allow-unrelated-histories` to your merge command. This is expected on the first merge only.

### Massive lockfile conflict
This is normal. The lockfile can't be meaningfully merged. Accept the boilerplate's version and regenerate:
```bash
git checkout --theirs pnpm-lock.yaml
pnpm install
```

### Schema conflicts in Prisma files
If both sides modified the schema, you need to merge manually and then create a migration:
```bash
# After resolving the .prisma file conflicts:
pnpm generate
pnpm migrate
```

### I want to skip certain files permanently
Use `.gitattributes` to configure per-file merge strategies:
```
# Always keep our version of these files
apps/web/app/(home)/page.tsx merge=ours
```
Then configure the merge driver: `git config merge.ours.driver true`

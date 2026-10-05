# AGENTS.md

This file guides coding agents working in this repository.

`README.md` is the human-facing setup and product document.
`AGENTS.md` is the operational handbook for making safe, repo-aligned changes.

## Quick Bootstrap

```bash
pnpm install

# Linux only: if Electron fails because the binary download was skipped
node node_modules/.pnpm/electron@<version>/node_modules/electron/install.js

cp apps/web/.env.example apps/web/.env
pnpm generate
pnpm migrate
pnpm dev
```

If you plan to run native clients too, review:

- `apps/desktop/.env.example`
- `apps/mobile/.env.example`
- `packages/database/.env.example`

`pnpm build` runs `pnpm template:stage && turbo build`, so root builds also touch the starter-template staging flow.

## Core Commands

```bash
# Workspace
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:coverage
pnpm format

# Single apps
pnpm --dir apps/web dev
pnpm --dir apps/web build
pnpm --dir apps/web typecheck
pnpm --dir apps/mobile dev
pnpm --dir apps/desktop dev
pnpm desktop:install:linux
pnpm desktop:publish:linux:edge
pnpm desktop:publish:linux:stable

# Database
pnpm generate
pnpm migrate
pnpm seed
pnpm reset

# Workspace versions
pnpm version:bump <semver>

# Template workflow
pnpm template:sync
pnpm template:check-sync
pnpm template:stage
pnpm template:prepare
pnpm template:build
pnpm template:test
pnpm template:test:coverage
pnpm template:publish --version <semver>

# Scaffold variants
pnpm scaffold:matrix

```

## Repo Truth

```text
apps/
  web/                        Next.js app and root-only scaffold/download API
  desktop/                    Electron app
  mobile/                     Expo app
packages/
  auth/                       Better Auth config and clients
  cms/                        Notion CMS utilities
  database/                   Prisma schema, client, seed scripts
  email/                      React Email + Resend integration
  observability/              Logging utilities
  ui/                         Shared UI components, blocks, helpers
templates/
  saas-boilerplate/           Released starter source
template-overrides/
  saas-boilerplate/           Intentional starter-only differences
.generated/
  saas-boilerplate/           Clean staged starter for validation/builds
```

Only `templates/saas-boilerplate` is part of the released starter workflow today.
Other directories under `templates/` may exist in-tree, but should not be treated as shipped products unless the repo documentation says so explicitly.

## Safe Editing Defaults

- Prefer editing root `apps/` and `packages/` for shared SaaS behavior.
- Put starter-only differences in `template-overrides/saas-boilerplate`.
- Never hand-edit `.generated/saas-boilerplate`; it is a build/staging artifact.
- Never treat `templates/saas-boilerplate/node_modules`, `.next`, `.turbo`, `coverage`, `dist`, or `build` as source. Those are dirt and should not be relied on.
- Do not install dependencies inside `templates/saas-boilerplate` as part of the supported workflow. Use `pnpm template:prepare` to stage, install, and generate in the clean copy.
- After starter-related changes, validate with `pnpm template:check-sync` and then the staged starter commands.
- Do not describe unreleased templates or unverified capabilities as shipped.

## Template Workflow Rules

- `pnpm template:sync` copies shared repo truth into `templates/saas-boilerplate` and reapplies starter-only overrides.
- `pnpm template:check-sync` fails when the managed starter has drifted or contains forbidden generated artifacts.
- Every starter file must come from `template-sync.manifest.json`: an `include` path copied from root, or a `templateOverrides` entry backed by `template-overrides/saas-boilerplate`. `check-sync` also fails on unmanaged template files and unregistered override files, and prints the source path plus a diff for each drifted file.
- `pnpm template:stage` creates `.generated/saas-boilerplate`, the clean starter copy used for validation and root build tracing.
- `pnpm template:prepare` stages the starter, installs dependencies in the staged copy, and runs Prisma generate there.
- `pnpm template:build`, `pnpm template:test`, and `pnpm template:test:coverage` should be run against the staged starter, not the managed template source.
- `/api/scaffold` packages the clean staged or managed starter source. It is not meant to walk a nested installed workspace under `templates/saas-boilerplate`.

## Scaffold Modules

A buyer downloads one variant: the staged starter compiled by `compileScaffoldVariant()` (`apps/web/lib/scaffold-modules.ts`) for their module and platform selection. Modules are listed in `scaffold-modules/registry.json`, each with a `scaffold-modules/<id>/manifest.json`.

- Module code inside a shared file goes in a marker region written in that file's comment syntax: `// scaffold:begin billing` ... `// scaffold:end billing` (`{/* ... */}` between JSX children, `#` in `.env.example`). Regions of unselected modules are dropped; marker lines never ship. Regions may nest.
- Files and folders a module owns outright go in the manifest's `unselected.remove`. JSON keys use `jsonRemove`; one-line edits markers cannot express use `textReplace`, which must match exactly once.
- Whole-file `replace`/`copy` is only for module-owned slot stubs such as `WorkspaceSlot.tsx`. Never snapshot a shared file: snapshots go stale and break other modules.
- `ownedIdentifiers` lists strings that must not survive when the module is unselected. Model access through `(db as any)` hides from typecheck, so it needs a marker region too.
- A module owns its migrations: list migration folders that only touch its tables in `unselected.remove`, and strip a module statement from a mixed migration with `textReplace` in the variant (repo migration files are never edited). The boot smoke's drift check proves the remaining migrations match the variant schema.
- `pnpm-lock.yaml` importers are pruned to each variant's `package.json` files at compile time, so frozen installs (Vercel, CI) work; the matrix installs with `--frozen-lockfile`.
- Downloads are served from a build cache (`apps/web/lib/scaffold/build-cache.ts`, R2 when its credentials are set): the compiled base archive is cached by starter content, modules, platforms and `BUILDER_VERSION`, and per-download files (env files, `SETUP.md`) are appended. Bump `BUILDER_VERSION` whenever compile or archive output changes; `build-cache.test.ts` fails until you do. After a deploy, an admin can run the `scaffold.prewarm` mutation.
- The wizard's pre-purchase file preview (`scaffold.previewIndex`, `apps/web/lib/scaffold/preview-index.ts`) is computed by compiling variants, so it follows manifests automatically; `preview-index.test.ts` checks it against real builds.
- Every download goes through `downloadScaffold` in `apps/web/lib/scaffold/service.ts`: charge (free when the user already owns that build), build, then mark the `ScaffoldJob` ready or refund it exactly once.
- Validate with `pnpm scaffold:matrix`: every module alone, every pair and all modules, each installed, generated, typechecked and arch-checked. Use `--full` for every subset, `--only <name|all|none>` for one variant and `--static` for compile and leak checks only. The matrix reads the registry, so a new module is covered automatically; a module marked `implemented: false` must keep an empty manifest.
- CI runs the pairwise matrix on every PR. `.github/workflows/scaffold-nightly.yml` runs the full sweep plus `scripts/scaffold-boot-smoke.mjs` (migrate, seed, production build, start, sign up) for the `none` and `all` variants.

## Imports and Boundaries

Cross-package imports use `@workspace/`:

```ts
import { auth } from "@workspace/auth/better-auth/auth";
import { db } from "@workspace/database";
import { Button } from "@workspace/ui/components/shadcn/button";
```

App-local imports in `apps/web` use `@/`:

```ts
import { TRPCReactProvider } from "@/trpc/client";
```

Useful UI package subpaths:

- `@workspace/ui/components/*`
- `@workspace/ui/blocks/*`
- `@workspace/ui/providers/*`
- `@workspace/ui/typography/*`

If you add a new exported UI category, update `packages/ui/package.json` exports.

## Web Architecture Notes

Route groups in `apps/web/app/`:

- `(auth)/` for sign-in, sign-up, password reset, and auth callback flows
- `(home)/` for authenticated app surfaces
- `landing/` for the public marketing, docs, and legal surfaces

`/api/scaffold` is root-repo behavior only. Do not port scaffold/download logic into the released starter unless the product workflow changes intentionally.

tRPC setup:

- `apps/web/trpc/init.ts` exposes `baseProcedure` as the current public procedure helper.
- `protectedProcedure` is the authenticated helper.
- For new admin or CMS mutations, require server-side auth and role checks. Do not rely on client-side gating alone.

Route trust contract source of truth is `apps/web/lib/route-policy.ts`:

- One row per page group, API route and webhook: auth mode (`public`, `auth-page`, `auth-handler`, `session`, `api-key`, `webhook`, `procedure`), required roles, guest access, rate-limit bucket, max body size, and where input is validated.
- `apps/web/middleware.ts` derives page gating and 413 body-size limits from it. Unlisted paths are protected pages; unauthenticated users are redirected to `/landing`.
- `session` API routes call `guardRoute(req, "<path>")` from `apps/web/server/routeGuard.ts` for session, role, guest, and rate-limit checks instead of re-implementing them.
- Adding an API route means adding its row; `tests/integration/routePolicy.test.ts` fails otherwise.

Webhook idempotency is important for payments:

1. Extract a unique event or checkout identifier.
2. Check whether it has already been processed.
3. Re-check inside `db.$transaction()` before writing.
4. Catch Prisma `P2002` as the final duplicate-write fallback and still return success.

Reference: `apps/web/app/api/payments/stripe/webhook/route.ts`

## Environment and Config

Boot-time env validation lives in `apps/web/lib/env.ts` (called from `apps/web/instrumentation.ts`) and `apps/backend/src/saas_forge_backend/config.py`. Production refuses to start on missing core vars, weak or placeholder secrets (`BETTER_AUTH_SECRET`, `BACKEND_HMAC_SECRET`), missing credentials for an enabled integration toggle, or a secret-looking `NEXT_PUBLIC_*` name; development only warns. The backend enforces this when `APP_ENV=production`. Code still reads `process.env` directly at call sites.

- When an integration toggle gains a required credential, add it to `INTEGRATION_REQUIREMENTS` in `apps/web/lib/env.ts`.
- Email sign-up (`NEXT_PUBLIC_AUTH_EMAIL=true`) requires `NEXT_PUBLIC_EMAIL_CLIENT`. Without a configured client, `packages/email` helpers skip sending with a warning (including the link outside production) instead of calling Resend.
- `docker-compose.yml` has no secret defaults; Compose requires `BETTER_AUTH_SECRET` and `BACKEND_HMAC_SECRET` from a sibling `.env`.

Use these files as the source of truth:

- `apps/web/.env.example`
- `apps/desktop/.env.example`
- `apps/mobile/.env.example`
- `packages/database/.env.example`

High-signal toggles and config surfaces:

- Auth: `NEXT_PUBLIC_AUTH_FRAMEWORK`, `NEXT_PUBLIC_AUTH_EMAIL`, `NEXT_PUBLIC_AUTH_GOOGLE`, `NEXT_PUBLIC_AUTH_GITHUB`, `NEXT_PUBLIC_AUTH_LINKEDIN`
- CMS: `NEXT_PUBLIC_CMS`
- Support: `NEXT_PUBLIC_SUPPORT_MAIL`, `NEXT_PUBLIC_CALENDLY_BOOKING_URL`, `NEXT_PUBLIC_EMAIL_CLIENT`
- Storage: `NEXT_PUBLIC_IMAGE_STORAGE`
- Rate limiting and observability: `NEXT_PUBLIC_ALLOW_RATE_LIMIT`, `NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID`
- Payments: `NEXT_PUBLIC_PAYMENT_GATEWAY`, Dodo vars, Stripe vars

If you add a new env var, add it to the relevant `.env.example` file in the same change.

## High-Signal Recipes

### Adding a tRPC Route

1. Create a router file in `apps/web/trpc/routers/`.
2. Use `baseProcedure` for public endpoints and `protectedProcedure` for authenticated ones.
3. Register the router in `apps/web/trpc/routers/_app.ts`.
4. For admin or CMS writes, add explicit server-side authorization.

```ts
export const myRouter = createTRPCRouter({
  publicEndpoint: baseProcedure.input(z.object({})).query(async ({ input }) => {
    return input;
  }),
  protectedEndpoint: protectedProcedure
    .input(z.object({}))
    .mutation(async ({ input, ctx }) => {
      return { input, userId: ctx.session.user.id };
    }),
});
```

### Adding a Page

Choose the route group that matches the surface:

- `(auth)` for auth-only flows
- `(home)` for authenticated app pages
- `landing` for public content

Typical server-rendered data hydration pattern:

```ts
export const dynamic = "force-dynamic";

export default async function Page() {
  const queryClient = getQueryClient();
  await queryClient.ensureQueryData(trpc.myRouter.myQuery.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyComponent />
    </HydrationBoundary>
  );
}
```

### Adding REST API Routes

Create the handler under `apps/web/app/api/[domain]/route.ts`:

```ts
export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ success: true }, { status: 200 });
}
```

Validate input, keep auth on the server, and follow the webhook idempotency pattern for external callbacks.

### Database Schema Changes

1. Edit the relevant Prisma files under `packages/database/prisma/`.
2. Common split points include `user.prisma` for auth models and `billing.prisma` for payment models.
3. Never create or edit files under `packages/database/prisma/migrations/**/migration.sql` manually.
4. Do not run `pnpm migrate` or `prisma migrate dev` to create migration files unless the user explicitly asks; the project owner will run `pnpm migrate` to generate migrations.
5. Run `pnpm generate`, `prisma validate`, type checks, or tests as needed to verify schema-related code.
6. If a migration is needed, say so in your final response and leave the migration file uncreated.
7. Do not use `pnpm reset` outside destructive local reset scenarios.

### Adding shadcn UI Components

```bash
pnpm dlx shadcn@latest add [component-name] -c packages/ui
```

- shadcn components live under `packages/ui/src/components/shadcn/`
- custom shared components should go under the appropriate existing category
- if you create a new export surface, update `packages/ui/package.json`

## Testing

- Vitest globals are enabled.
- Web tests run in `happy-dom`.
- `@` resolves to the app root in web tests.

Mock workspace packages directly:

```ts
vi.mock("@workspace/email/resend/index", () => ({
  sendSupportEmail: vi.fn(),
}));
```

Router-level tests can call procedures directly:

```ts
const caller = myRouter.createCaller({});
const result = await caller.myEndpoint({});
```

Useful default checks:

- `pnpm --dir apps/web typecheck`
- `pnpm --dir apps/web test`
- `pnpm template:check-sync` after starter-related changes
- `pnpm scaffold:matrix` after changes to scaffold modules or files they mark
- `pnpm template:build` when starter behavior may have changed

## Release Workflow

This repo ships three distinct artifacts on each release: the root npm package / git tag, the Electron desktop snap, and the `template/saas-boilerplate` git branch consumed by scaffolded projects.

### 1. Bump the version

```bash
pnpm version:bump <semver>
# e.g. pnpm version:bump 1.3.0
```

This atomically updates `package.json`, `apps/web/package.json`, `apps/desktop/package.json`, `apps/mobile/package.json`, `apps/mobile/app.json`, `template-overrides/saas-boilerplate/package.json`, and `template-sync.manifest.json`, then re-stages the template.

### 2. Validate the template

```bash
pnpm template:check-sync
pnpm template:build
pnpm template:test
```

Fix any drift or build failures before proceeding.

### 3. Commit and tag the root repo

```bash
git add -A
git commit -m "chore: release v<semver>"
git tag v<semver>
git push origin main --tags
```

### 4. Publish the desktop app

Linux snap (edge channel for pre-release, stable for GA):

```bash
# Test locally first
pnpm desktop:install:linux

# Publish to Snap Store — edge
pnpm desktop:publish:linux:edge

# Promote to stable when ready
pnpm desktop:publish:linux:stable
```

Each command runs `electron-vite build --mode production`, then `electron-builder --linux snap`, then calls `snapcraft upload` (or `snap install --dangerous` for local). Snapcraft must be authenticated (`snapcraft login`) before publishing.

### 5. Publish the CLI

```bash
cd packages/create-saas-forge && npm version <semver> --no-git-tag-version && npm publish
```

`create-saas-forge` is a zero-dependency package; publish it whenever the v1 API or its commands change.

### 6. Publish the template branch

```bash
pnpm template:publish --version <semver>
```

This runs `template:stage` then `scripts/publish-template-branch.mjs --version <semver>`, which:

1. Creates a temporary git worktree on the `template/saas-boilerplate` orphan branch.
2. Replaces its contents with `.generated/saas-boilerplate`.
3. Writes a `.boilerplate-version` file.
4. Commits and tags the branch as `template/v<semver>`.
5. Pushes the branch and tag to `origin`.

Projects scaffolded from this boilerplate track `template/saas-boilerplate` and receive updates when this branch is pushed. Use `--dry-run` to preview without making changes, or `--no-push` to commit locally only.

### Release checklist summary

1. `pnpm version:bump <semver>`
2. `pnpm template:check-sync && pnpm template:build && pnpm template:test`
3. `git commit -m "chore: release v<semver>" && git tag v<semver> && git push origin main --tags`
4. `pnpm desktop:publish:linux:edge` (or `:stable`)
5. `npm publish` in `packages/create-saas-forge` (when the CLI changed)
6. `pnpm template:publish --version <semver>`

## Gotchas

- Session cookies may appear as `better-auth.session_token` in local dev and `__Secure-better-auth.session_token` in secure production contexts.
- The Prisma schema is split across multiple files in `packages/database/prisma/`; read the related models before changing billing or auth behavior.
- Feature toggles are driven by env vars, not a central config service.
- Root builds depend on a clean managed starter tree because template staging happens before Turbo build execution.

## Docs

- `README.md`
- `docs/CONTRIBUTING.md`
- `docs/SECURITY.md`
- `docs/CHANGELOG.md`

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

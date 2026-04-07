# CLAUDE.md

This file guides coding agents working in this repository.

`README.md` is the human-facing setup and product document.
`CLAUDE.md` is the operational handbook for making safe, repo-aligned changes.

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
- `pnpm template:stage` creates `.generated/saas-boilerplate`, the clean starter copy used for validation and root build tracing.
- `pnpm template:prepare` stages the starter, installs dependencies in the staged copy, and runs Prisma generate there.
- `pnpm template:build`, `pnpm template:test`, and `pnpm template:test:coverage` should be run against the staged starter, not the managed template source.
- `/api/scaffold` packages the clean staged or managed starter source. It is not meant to walk a nested installed workspace under `templates/saas-boilerplate`.

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

Middleware source of truth is `apps/web/middleware.ts`:

- `publicRoutes` currently includes `/landing`, `/public`, payment webhooks, `/api/trpc`, `/auth-callback`, and `/api/scaffold`.
- `authRoutes` currently includes auth pages and `/api/auth`.
- Everything else is treated as protected and unauthenticated users are redirected to `/landing`.

Webhook idempotency is important for payments:

1. Extract a unique event or checkout identifier.
2. Check whether it has already been processed.
3. Re-check inside `db.$transaction()` before writing.
4. Catch Prisma `P2002` as the final duplicate-write fallback and still return success.

Reference: `apps/web/app/api/payments/stripe/webhook/route.ts`

## Environment and Config

There is no centralized env validation layer yet. The repo reads `process.env` directly in many places.

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
3. Run `pnpm generate`.
4. Run `pnpm migrate`.
5. Do not use `pnpm reset` outside destructive local reset scenarios.

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
- `pnpm template:build` when starter behavior may have changed

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

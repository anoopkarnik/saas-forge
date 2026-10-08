# AGENTS.md

This file guides coding agents working in this starter repository.

`README.md` is the human-facing setup and product document.
`AGENTS.md` is the operational handbook for making safe, repo-aligned changes inside the released SaaS starter.

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

## Core Commands

```bash
# Workspace
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm test:coverage
pnpm format
pnpm doctor --check   # env and live service checks; plain `pnpm doctor` fixes them interactively

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
```

## Repo Truth

```text
apps/
  web/                        Next.js app for the starter product surfaces
  desktop/                    Electron app
  mobile/                     Expo app
packages/
  auth/                       Better Auth config and clients
  database/                   Prisma schema, client, seed scripts
  email/                      React Email + Resend integration
  observability/              Logging utilities
  ui/                         Shared UI components, blocks, helpers
```

This starter is the released SaaS template. It does not include the root repo's scaffold/download workflow or template-management commands.

## Safe Editing Defaults

- Edit the starter directly in `apps/` and `packages/`.
- Do not add scaffold or boilerplate-download behavior here unless the starter product definition changes intentionally.
- Do not describe root-only tooling or unreleased templates as part of this starter.
- If you add a new shared feature, keep web, desktop, and mobile behavior aligned where the starter already exposes that surface.

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

This starter does not ship `/api/scaffold`. Keep scaffold/download logic out of the starter unless that product boundary changes intentionally.

tRPC setup:

- `apps/web/trpc/init.ts` exposes `baseProcedure` as the current public procedure helper.
- `protectedProcedure` is the authenticated helper.
- For new admin or CMS mutations, require server-side auth and role checks. Do not rely on client-side gating alone.

Route trust contract source of truth is `apps/web/lib/route-policy.ts`:

- One row per page group, API route and webhook: auth mode (`public`, `auth-page`, `auth-handler`, `session`, `api-key`, `webhook`, `procedure`), required roles, guest access, rate-limit bucket, max body size, and where input is validated.
- `apps/web/middleware.ts` derives page gating and 413 body-size limits from it. Unlisted paths are protected pages; unauthenticated users are redirected to `/landing`.
- `session` API routes call `guardRoute(req, "<path>")` from `apps/web/server/routeGuard.ts` for session, role, guest, and rate-limit checks instead of re-implementing them.
- Adding an API route means adding its row; `tests/integration/routePolicy.test.ts` fails otherwise.

Background jobs (`packages/jobs`):

- Define work with `defineJob(name, zodSchema, handler, { retries, version })` and run it with `enqueue(job, payload, { delayMs, dedupeKey })`; recurring work uses `defineSchedule(name, cron, job)`. Throw `PermanentJobError` for failures a retry cannot fix.
- Email goes through the `email.send` job: call `sendEmail({ template, ... })` from `@workspace/email/jobs`, not the Resend senders directly.
<!-- scaffold:begin jobs -->
- Without a queue (tests, development, no jobs module) `enqueue` runs the job inline with the same retries. With `JOBS_DRIVER=inngest` it sends a `jobs/<name>` event to Inngest; `/api/inngest` serves one function per job and per schedule (`apps/web/lib/jobs/functions.ts`). A job that fails every attempt becomes a `JobRun` dead letter on `/admin/jobs` with replay; `ScheduleRun` makes each cron window fire once. Register new jobs in a module `functions.ts` imports.
- The Python ARQ worker (`apps/backend`) stays for AI agent and RAG work; product work (email, cleanups, notifications, webhooks) uses these jobs.
<!-- scaffold:end jobs -->

<!-- scaffold:begin notifications -->
Notifications (`apps/web/lib/notifications`):

- Add a type to `catalog.ts` (label, default channels, `render`) inside its module's markers, then call `notify(definition, userId, data, { dedupeKey, organizationId })` after the work commits. It writes the in-app row (duplicates of a `dedupeKey` are skipped, never thrown) and emails through the `notification.deliver` job on the channels the user keeps on. Wrap emit sites in other modules' files in `notifications` markers.
- The bell (`packages/ui/src/components/notifications/NotificationBell.tsx`) is presentational; web, desktop and mobile wrap it with their own clients and poll `notification.unreadCount` every 30 s. Guests can read the inbox but not mark it read.
<!-- scaffold:end notifications -->

<!-- scaffold:begin audit_log -->
Audit log (`apps/web/lib/audit`):

- Add an action to `actions.ts` (target type, metadata schema, `redact` keys) inside its module's markers. Call `audit(tx, action, { actor: userActor(id), targetId, organizationId, metadata, headers })` with the transaction client of the change, so both commit or roll back together; for Better Auth writes, call it after the call succeeds. Wrap emit sites in other modules' files in `audit_log` markers.
- Metadata is redacted (listed and secret-looking keys), then reduced to the keys its schema lists. Audit configuration changes, never per-call usage. Better Auth admin endpoints (`/api/auth/admin/*`) are audited in the auth route by `withAuthAudit`.
- The trail is append-only: `/admin/audit` (admin-only, CSV export) and the workspace activity on `/organization` read it; the `cleanup.auditRetention` job (with `jobs`) deletes events older than the `audit.retentionDays` site setting.
<!-- scaffold:end audit_log -->

<!-- scaffold:begin webhooks -->
Outgoing webhooks (`apps/web/lib/webhooks`, guide in its `README.md`):

- Add an event to `events.ts` (description, Zod schema) inside its module's markers; never change a payload under an existing `apiVersion`. Call `emitWebhook(type, data, { userId, organizationId })` after the change commits; it never throws, and wraps nothing in a transaction. Wrap emit sites in other modules' files in `webhooks` markers.
- Each delivery is a `webhook.deliver` job: signed `SaaSForge-Signature: t=…,v1=…` (HMAC-SHA256 of `t.body`), retried on Inngest for about 24 hours, endpoint paused after 15 failures in a row. Secrets are AES-256-GCM encrypted under `WEBHOOK_SECRET_KEY`. URLs are checked against private ranges when saved and at connect time (`ssrf.ts`); keep both checks.
<!-- scaffold:end webhooks -->

<!-- scaffold:begin billing -->
Usage ledger (`apps/web/lib/usage`, billing module):

- Spend credits with `recordUsage(tx, { userId, meter, quantity, credits, sourceType, sourceId, idempotencyKey })` inside the transaction of the work: it inserts a `UsageEvent` (a repeated key records and charges nothing) and increments `creditsUsed`, then returns crossed 80%/95% thresholds for `announceUsageAlerts` after commit. Code that already moved `creditsUsed` calls `logUsage`. Add each meter to `meters.ts` with its rate text; `/usage` shows the table.
- Without billing, `lib/usage/record.ts` is replaced by a stub with the same exports that only moves `creditsUsed`, so callers such as AI chat stay unchanged. A user's first event carries their earlier spend (`balance.opening`), so events always add up to `creditsUsed`; the `usage.reconcile` job (with jobs) logs any drift.
<!-- scaffold:end billing -->

Feature flags (`apps/web/lib/flags`):

- Declare a flag in `definitions.ts` (description, code default) inside its module's markers. Read it with `useFlag(key)` (the root layout evaluates every flag on the server and hydrates `FlagsProvider`; no rule reaches the browser), and enforce it with `flagProcedure(key)` (`apps/web/trpc/flag-procedure.ts`) or `requireFlag(key, req)` in route handlers. Hiding UI is never enough on its own.
<!-- scaffold:begin feature_flags -->
- Rules (`rules.ts`) run in order, first match wins: role, user id, workspace id (multi_tenancy), percentage (stable SHA-256 bucket of key and user or `sf_aid` cookie id); otherwise the flag's default. `/admin/flags` edits them, previews a user and keeps history; changes clear the cache before the response.
<!-- scaffold:end feature_flags -->
- Flags are per-user booleans; global values belong in site config. Without the feature_flags module, `flags.ts` is a stub and every flag keeps its default.

<!-- scaffold:begin onboarding -->
Onboarding (`apps/web/lib/onboarding`):

- Checklist tasks live in `tasks.ts`, each module's inside its markers. Give a task a `done(userId)` check on real data (avatar set, key created); a task without one is completed by `onboarding.complete`. The wizard and checklist render on the home page, never block anything, and can be turned off in Settings (`onboarding.wizard`, `onboarding.checklist`) or by the `onboarding.checklist` flag. The demo guest sees neither.
- After installing it in an app that already has users, run `pnpm --dir packages/database backfill:onboarding` so existing users are not shown the wizard.
<!-- scaffold:end onboarding -->

Webhook idempotency is important for payments:

1. Extract a unique event or checkout identifier.
2. Check whether it has already been processed.
3. Re-check inside `db.$transaction()` before writing.
4. Catch Prisma `P2002` as the final duplicate-write fallback and still return success.

Reference: `apps/web/app/api/payments/stripe/webhook/route.ts`

## Environment and Config

Boot-time env validation lives in `apps/web/lib/env.ts` (called from `apps/web/instrumentation.ts`). Production refuses to start on missing core vars, weak or placeholder secrets (such as `BETTER_AUTH_SECRET`), missing credentials for an enabled integration toggle, or a secret-looking `NEXT_PUBLIC_*` name; development only warns. Code still reads `process.env` directly at call sites.

Runtime site config (`apps/web/lib/site-config/`): env is the default, an admin overrides it at runtime in `/admin/settings`, no redeploy.

- Each setting in `registry.ts` has a Zod schema, a `public` flag, its env var and a default; it resolves DB row (`AppSetting`) -> env -> default. A key or env name that looks like a secret throws at load: secrets stay in env.
- Server code calls `getSiteConfig()` (Redis-cached, in-memory when Redis is off; `updateSiteConfig` clears it). Client code calls `useSiteConfig()`, hydrated by the root layout, which renders dynamically for that reason. `siteConfig.get` returns public keys only.
- Lint blocks reading the migrated `NEXT_PUBLIC_*` vars (theme, name, description, auth buttons, Calendly, GA) in UI files. Auth settings only show or hide buttons; providers still need env credentials. The support email stays env: it is also the email sender.
<!-- scaffold:begin ai_agents -->

The Python backend validates its own env in `apps/backend/src/saas_forge_backend/config.py` when `APP_ENV=production`, including a strong `BACKEND_HMAC_SECRET`.
<!-- scaffold:end ai_agents -->

- When an integration toggle gains a required credential, add it to `INTEGRATION_REQUIREMENTS` in `apps/web/lib/env.ts`.
- `pnpm doctor` (`scripts/doctor.mjs`) runs the same `findServerEnvIssues`, adds live probes (`scripts/doctor-probes.mjs`) and writes env files through `apps/web/lib/env-files.ts`, the mapping the download builder also uses. Give a new credential a `HINTS` entry there, and a probe when the provider has a cheap authenticated read.
- `docker-compose.yml` has no secret defaults; Compose requires `BETTER_AUTH_SECRET` from a sibling `.env`.
<!-- scaffold:begin ai_agents -->
- The AI agents services in `docker-compose.yml` also require `BACKEND_HMAC_SECRET` in that `.env`.
<!-- scaffold:end ai_agents -->

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
- `pnpm build` when starter-wide behavior changes

## Gotchas

- Session cookies may appear as `better-auth.session_token` in local dev and `__Secure-better-auth.session_token` in secure production contexts.
- The Prisma schema is split across multiple files in `packages/database/prisma/`; read the related models before changing billing or auth behavior.
- Feature toggles are driven by env vars. Branding, sign-in buttons and analytics can also be overridden at runtime through site config.
- This starter intentionally excludes scaffold/download and root template-management behavior.

## Docs

- `README.md`

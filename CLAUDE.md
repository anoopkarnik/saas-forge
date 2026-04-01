# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

### Manual Installation

```bash
# 1. Clone the repository
git clone https://github.com/anoopkarnik/saas-forge.git
cd saas-forge

# 2. Install dependencies
pnpm install

# 3. Fix Electron binary (Linux only — pnpm sometimes skips the post-install download)
#    Find the exact version with: ls node_modules/.pnpm/ | grep "^electron@"
node node_modules/.pnpm/electron@<version>/node_modules/electron/install.js

# 4. Copy environment variables
cp apps/web/.env.example apps/web/.env

# 5. Generate Prisma client (both schemas)
pnpm run generate

# 6. Run database migrations (first time or after schema changes)
pnpm run migrate

# 7. Start all apps
pnpm dev
```

| App     | URL                    | Notes                          |
|---------|------------------------|--------------------------------|
| web     | http://localhost:3000  | Next.js 15 + Turbopack         |
| mobile  | http://localhost:8081  | Expo 55 + Metro bundler        |
| desktop | http://localhost:5173  | Electron + electron-vite       |

> **Linux users**: Step 3 is required once after `pnpm install` if the desktop app fails to start with an Electron binary error. It is not needed on subsequent runs.

Visit [http://localhost:3000](http://localhost:3000) to see your app! 🎉

---

## Commands

```bash
# Development
pnpm dev                        # Run all apps and packages
pnpm --filter web dev           # Run web app only

# Build
pnpm build                      # Build all workspaces
pnpm --filter web build         # Build web app only

# Testing
pnpm test                       # Run all tests
pnpm test:coverage              # Run tests with coverage
pnpm --filter web test          # Run tests for a specific workspace

# Linting & Formatting
pnpm lint                       # Lint all workspaces
pnpm format                     # Format with Prettier (ts, tsx, md)

# Database
pnpm generate                   # Generate Prisma client
pnpm migrate                    # Run Prisma migrations
pnpm reset                      # Reset database (destructive)

# Type Checking
pnpm --filter web typecheck     # Type-check web app
```

## Monorepo Layout

```
apps/
  web/          → Next.js 15 (Turbopack) — primary application
  desktop/      → Electron + React 19 + React Router v7
  mobile/       → Expo 55 + React Native + NativeWind
packages/
  auth/         → Better Auth config (email + GitHub/Google/LinkedIn OAuth)
  database/     → Prisma ORM with PostgreSQL
  ui/           → Shared shadcn/ui component library
  email/        → React Email templates + Resend
  cms/          → Notion API client for CMS content
  observability/→ Winston + Logtail + Pino logging
  eslint-config/→ Shared ESLint rules
  typescript-config/ → Shared TS base config
templates/      → Scaffoldable project templates (saas-boilerplate, portfolio, landing)
```

## Import Conventions

Cross-package imports use the `@workspace/` prefix:
```typescript
import { Button } from "@workspace/ui/components/shadcn/button";
import { auth } from "@workspace/auth/better-auth/auth";
import { db } from "@workspace/database";
import { sendSupportEmail } from "@workspace/email/resend/index";
```

App-local imports in `apps/web` use `@/`:
```typescript
import { TRPCReactProvider } from "@/trpc/client";
```

The UI package exposes subpaths: `@workspace/ui/components/*`, `@workspace/ui/blocks/*`, `@workspace/ui/providers/*`, `@workspace/ui/typography/*`.

## File Naming

- **Components**: PascalCase (`LoginCard.tsx`, `DashboardPage.tsx`)
- **Utilities**: camelCase (`formatDate.ts`, `formatAmount.ts`)
- **Tests**: collocated with source, suffix `*.test.ts` or `*.test.tsx`

## blocks/ vs components/

- `packages/ui/src/blocks/` — Page-level, feature-complete sections (e.g., `DashboardPage`, `LandingPage`)
- `packages/ui/src/components/` — Reusable UI primitives organized by category: `shadcn/`, `auth/`, `home/`, `payments/`, `sidebar/`, `aceternity/`, `notion/`, `mdx/`

## Adding a tRPC Route

1. Create a router file in `apps/web/trpc/routers/`
2. Use `baseProcedure` for public endpoints, `protectedProcedure` for authenticated ones
3. Register the router in `apps/web/trpc/routers/_app.ts`

```typescript
// Example router
export const myRouter = createTRPCRouter({
  publicEndpoint: baseProcedure.input(z.object({...})).query(async ({ input }) => {...}),
  protectedEndpoint: protectedProcedure.input(z.object({...})).mutation(async ({ input, ctx }) => {...}),
});
```

## Adding a Page

Route groups in `apps/web/app/`:
- `(auth)/` — Auth pages (sign-in, sign-up, etc.)
- `(home)/` — Protected dashboard pages (redirects to `/landing` if unauthenticated)
- `landing/` — Public marketing pages

Server-side data fetching pattern:
```typescript
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

## Testing

- **Vitest globals enabled** — no need to import `describe`, `it`, `expect`
- **Environment**: `happy-dom`
- **Path alias**: `@` resolves to app root

Mock workspace packages:
```typescript
vi.mock('@workspace/email/resend/index', () => ({
  sendSupportEmail: vi.fn(),
}));
```

Test tRPC procedures directly:
```typescript
const caller = myRouter.createCaller({});
const result = await caller.myEndpoint({ ... });
```

## Gotchas

- **Session cookies**: Check both `better-auth.session_token` (dev) and `__Secure-better-auth.session_token` (prod)
- **Two Prisma schemas**: `user_schema` + `billing_schema` — migrations must account for both
- **Env vars**: Direct `process.env` access throughout, no centralized validation layer. See `apps/web/.env.example` for all variables
- **Turbo cache**: `.env*` files are build inputs — env changes invalidate the cache
- **Payment gateway**: Controlled by `NEXT_PUBLIC_PAYMENT_GATEWAY` (`stripe` or `dodo`)
- **CMS toggle**: Controlled by `NEXT_PUBLIC_CMS` (`notion`)
- **Auth provider toggles**: `NEXT_PUBLIC_AUTH_GOOGLE`, `NEXT_PUBLIC_AUTH_GITHUB`, `NEXT_PUBLIC_AUTH_LINKEDIN` (boolean flags)

## Adding shadcn UI Components

```bash
pnpm dlx shadcn@latest add [component-name] -c packages/ui
```

- shadcn components go to `packages/ui/src/components/shadcn/`
- Custom components go to `packages/ui/src/components/[category]/` (e.g., `auth/`, `home/`, `payments/`)
- New categories need a subpath export in `packages/ui/package.json`

## Database Schema Changes

1. Edit the relevant schema file in `packages/database/prisma/`:
   - `user.prisma` — auth-related models (User, Account, Session, Verification, JWKS)
   - `billing.prisma` — payment models (Transaction)
2. Run `pnpm generate` to regenerate the Prisma client
3. Run `pnpm migrate` to create and apply migration
4. **Never** run `pnpm reset` in production (destroys all data)

Enum changes (e.g., `ACCCOUNT_ACCESS`) require a full migration, not just `generate`.

## Adding REST API Routes

Create route handler at `apps/web/app/api/[domain]/route.ts`:
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  // validate, process, return
  return NextResponse.json({ success: true }, { status: 200 });
}
```

### Webhook Idempotency (critical for payment webhooks)

All payment webhooks must follow this pattern to prevent duplicate processing:
1. Extract unique identifier (e.g., `checkoutSessionId`)
2. Check if already processed (fast path)
3. Re-check inside a `db.$transaction()` before writing (race condition guard)
4. Catch Prisma error `P2002` (unique constraint) as final fallback, return 200

Reference: `apps/web/app/api/payments/stripe/webhook/route.ts`

## Middleware Route Management

Edit arrays in `apps/web/middleware.ts`:

- **Public route** (no auth needed): Add path to `publicRoutes` array
- **Auth route** (redirect away if logged in): Add path to `authRoutes` array
- **Protected route** (requires auth): Default behavior — don't add to any array. Unauthenticated users redirect to `/landing`

## Adding Email Templates

1. Create template in `packages/email/src/templates/MyTemplate.tsx` using `@react-email/components`
2. Add send function in `packages/email/src/resend/index.ts`:
```typescript
export const sendMyEmail = async (to: string, props: MyTemplateProps) => {
  const html = await render(MyTemplate(props));
  return resend.emails.send({ from: "...", to, subject: "...", html });
};
```

## Environment Variable Conventions

- `NEXT_PUBLIC_*` prefix = accessible in browser code
- Server-only vars = no prefix (API keys, secrets)
- Feature toggles: `NEXT_PUBLIC_CMS`, `NEXT_PUBLIC_PAYMENT_GATEWAY`, `NEXT_PUBLIC_AUTH_*`
- Always add new vars to `apps/web/.env.example` with a comment

## Error Handling

tRPC procedures:
```typescript
throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
// Codes: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, TOO_MANY_REQUESTS, INTERNAL_SERVER_ERROR
```

REST API routes:
```typescript
return NextResponse.json({ error: "Bad request" }, { status: 400 });
```

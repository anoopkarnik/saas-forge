# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Architecture Overview

This is a **pnpm + Turborepo monorepo** containing a full-stack SaaS boilerplate.

### Monorepo Layout

```
apps/
  web/          → Next.js 15 (Turbopack) — primary application
  desktop/      → Electron + React 19 + React Router v7
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

### Web App Route Groups

The Next.js app uses route groups:
- `(auth)/` — Sign-in, sign-up, forgot-password, reset-password, email-verified, auth-callback, error
- `(home)/` — Protected dashboard pages (redirect to `/landing` if unauthenticated)
- `landing/` — Public marketing pages (Notion CMS-driven: `doc/`, `legal/`)

### Authentication (`packages/auth`)

Uses **Better Auth** (`/api/auth` base path). The auth config in `packages/auth/src/better-auth/auth.ts` defines:
- Email/password with required email verification (via Resend)
- OAuth: GitHub, Google, LinkedIn (toggled by `NEXT_PUBLIC_AUTH_*` env vars)
- Rate limiting: 100 req/60s, 3 sign-ins/60s
- Admin plugin with impersonation
- User fields: `creditsUsed`, `creditsTotal`, `accessLevel` (TRIAL/PRO/ENTERPRISE/UNLIMITED)

### Database (`packages/database`)

PostgreSQL with Prisma. Two schemas:
- `user_schema`: User, Account, Session, Verification, JWKS
- `billing_schema`: Transaction (unified Stripe + Dodo Payments tracking)

### API Layer

**tRPC** (`apps/web/trpc/`) for type-safe API:
- `trpc/init.ts` — base and `protectedProcedure` (throws UNAUTHORIZED if no session)
- `trpc/_app.ts` — root router combining: `support`, `landing`, `documentation`, `home`, `billing`
- Client uses React Query via `trpc/client.tsx`

**REST API routes** (`apps/web/app/api/`):
- `auth/[...all]` — Better Auth handler
- `payments/stripe/webhook`, `payments/dodo/webhook` — payment webhooks
- `scaffold/` — project scaffolding endpoint
- `healthcheck/` — health check

### Middleware

`apps/web/middleware.ts` handles:
- CORS (allows `localhost:3000`, `localhost:5173`, `NEXT_PUBLIC_URL`)
- Session detection via `better-auth.session_token` cookie
- Public routes: `/landing`, `/public`, `/api/payments/*`, `/api/trpc`, `/api/scaffold`, `/auth-callback`
- Auth routes (redirect away if logged in): `/sign-in`, `/sign-up`, etc.

### UI Package (`packages/ui`)

Shared component library using shadcn/ui + Radix UI + Tailwind CSS 4.x. Components are organized in `packages/ui/src/components/` by category: `auth/`, `home/`, `pages/`, `payments/`, `sidebar/`, `shadcn/`, `aceternity/`, `notion/`, `mdx/`.

### Payment Gateways

Configured via `NEXT_PUBLIC_PAYMENT_GATEWAY`. Supports **Stripe** and **Dodo Payments**. Both write to the `billing_schema.Transaction` table on webhook events.

### CMS

Landing page content is Notion-driven. Each section (hero, features, testimonials, pricing, FAQ, footer) maps to a separate Notion database ID configured via env vars. Toggle with `NEXT_PUBLIC_CMS`.

### Key Environment Variables

See `apps/web/.env.example` for full list. Critical ones:
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth signing secret
- `NEXT_PUBLIC_URL` — Public app URL (used for CORS and redirects)
- `RESEND_API_KEY` — For transactional emails
- `NEXT_PUBLIC_PAYMENT_GATEWAY` — `stripe` or `dodo`

### Testing

Vitest 4.x with `happy-dom` environment. Global APIs enabled (no imports needed for `describe`, `it`, `expect`). Test files: `**/*.test.{ts,tsx}`. Path alias `@` resolves to app root.

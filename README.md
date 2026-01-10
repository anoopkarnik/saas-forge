# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project layout and technology stack

- **Monorepo toolchain**: Turborepo + pnpm workspaces.
  - Root scripts delegate to Turbo: `build`, `dev`, `lint`.
  - Workspaces are defined in `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
- **Primary app**: `apps/web` – Next.js 15 (App Router) SaaS frontend.
  - Uses React 19, `@tanstack/react-query`, `@trpc/*`, `better-auth`, and a shared UI library.
  - TRPC API is exposed via `app/api/trpc/[trpc]/route.ts` and consumed via React Query.
  - Caching and rate-limiting rely on environment configuration (Upstash Redis, external webhooks, etc.).
- **Shared packages** (under `packages/`):
  - `@workspace/ui`: Design system and shared React components (shadcn/ui-based, MDX and Notion renderers, various visual effects). Next.js is configured to transpile this package (`apps/web/next.config.mjs`).
  - `@workspace/auth`: Better Auth configuration and client helpers. Orchestrates Prisma-based persistence, social login providers, email flows, and user metadata.
  - `@workspace/database`: Prisma-based Postgres client and schema. Exposes a singleton Prisma client via `src/client.ts` and includes Prisma schema + migration helpers.
  - `@workspace/email`: Email delivery utilities using Resend + React Email templates for verification, password reset, support, and contacts.
  - `@workspace/cms`: Notion data access layer and transformation utilities (wrapped and re-exported as `@workspace/cms/notion/...`). Used by the web app to fetch landing and documentation content.
  - `@workspace/observability`: Centralized logging via Winston + Logtail. Used primarily by the CMS / Notion layer.
  - `@workspace/eslint-config`, `@workspace/typescript-config`: Shared ESLint and TypeScript configs.
- **CLI**: `scripts/cli.js` is exposed as the `saas-forge` binary when this repo is installed as a package. It clones this repo into a target directory, copies `apps/web/.env.example` to `.env`, optionally patches `NEXT_PUBLIC_THEME`, then runs `pnpm install`.

## High-level architecture and data flow

### Next.js app (`apps/web`)

- **Routing and layouts**:
  - Uses the App Router under `apps/web/app`.
  - Authentication-related pages live under `app/(auth)/...` and integrate with the Better Auth client from `@workspace/auth`.
  - Marketing / legal / documentation pages live under `app/landing`, `app/landing/doc/[docId]`, and `app/landing/legal/...`, with UI blocks in `apps/web/blocks` and `apps/web/components/landing`.
- **TRPC layer** (`apps/web/trpc`):
  - `init.ts` defines `createTRPCContext`, `createTRPCRouter`, and `baseProcedure`. Currently the context only exposes a stubbed `userId`; if you add auth-aware logic, extend this context first.
  - `routers/_app.ts` aggregates feature routers:
    - `landingRouter` – reads landing page content from Notion via the CMS package.
    - `documentationRouter` – reads documentation structure and blocks from Notion via the CMS package, with optional Redis caching.
    - `supportRouter` – proxies support, newsletter subscription, and chatbot messages to external n8n webhooks.
  - `app/api/trpc/[trpc]/route.ts` wires the `appRouter` to Next.js API routes using `fetchRequestHandler` and the shared context.
  - `trpc/query-client.ts` configures a shared React Query client with custom dehydration rules.
  - `trpc/client.tsx` establishes the `TRPCReactProvider` that binds the TRPC client and React Query for client-side use.
- **State and caching**:
  - TRPC queries for landing/docs use a combination of Notion reads and Upstash Redis caching.
  - `apps/web/server/redis.ts` exports a configured `Redis` client using `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- **Middleware and access control** (`apps/web/middleware.ts`):
  - Uses `better-auth` cookie cache via `getCookieCache` to determine session state.
  - Defines `publicRoutes`, `authRoutes`, and an `apiAuthPrefix`:
    - Public routes bypass auth checks.
    - Auth routes redirect logged-in users to `/`.
    - Non-public, non-auth routes require a session and redirect unauthenticated users to `/landing`.
  - Also configures CORS headers for a specific list of allowed origins; matched routes are defined in the exported `config.matcher`.

### CMS / Notion integration (`@workspace/cms`)

- **Purpose**: Provides a stable abstraction over the Notion API, handling pagination, filtering, sorting, and transformation of raw Notion responses into application-friendly objects.
- **Key pieces**:
  - `src/notion/database/queryDatabase.ts`:
    - `queryDatabase` wraps `@notionhq/client` queries and logs requests + responses via the shared `logger` from `@workspace/observability/winston-logger`.
    - `queryNotionDatabase` and `queryAllNotionDatabase` implement filtered and fully-paginated queries, mapping results through `modifyResult`.
    - Filter/sort construction utilities (`constructFilterBody`, `constructSortBody`, `modifyFilter`, `modifySort`) convert high-level filter descriptors into Notion query payloads.
  - `src/notion/page/createPage.ts`:
    - `createPage` issues raw Notion page creation requests with logging.
    - `createNotionPage` translates a higher-level `properties` array into Notion-compatible properties via `modifyProperty`, then returns a normalized result via `modifyResult`.
  - Utility modules under `src/notion/utils` perform the low-level shape transformation between Notion’s nested JSON and your flatter domain structures (e.g., mapping rich text, relations, IDs, etc.).
  - Tests in `packages/cms/testing/index.test.ts` validate the Notion abstraction using Vitest with a mocked `@notionhq/client`.
- **Usage from the app**:
  - `apps/web/lib/functions/fetchLandingPageDataFromNotion.ts` calls `queryAllNotionDatabase` with specific filters and database IDs to assemble strongly typed domain models for:
    - Navbar, hero, feature, testimonial, pricing, FAQ, and footer sections.
    - Legal pages (cancellation/refund, privacy, terms, contact) that reuse common landing-page properties.
  - `apps/web/lib/functions/fetchDocumentationFromNotion.ts` uses `queryAllNotionDatabase` to locate the landing page and documentation entries, then returns a `DocumentationProps` structure.
  - The TRPC routers (`landingProcedures.ts`, `docProcedures.ts`) wrap these functions with Redis-backed caching and input validation.

### Authentication, database, and email

- **Database (`@workspace/database`)**:
  - Prisma schema is in `packages/database/prisma/schema.prisma` targeting Postgres with the `user_schema` schema.
  - The generated Prisma client is output to `packages/database/src/generated/prisma`, and a singleton `PrismaClient` instance is exported from `packages/database/src/client.ts`.
  - This client is used by the auth package to persist users, accounts, sessions, and related data.
- **Authentication (`@workspace/auth`)**:
  - `src/better-auth/auth.ts` configures Better Auth with:
    - Prisma adapter backed by `@workspace/database/client`.
    - Plugins: OpenAPI and admin (with impersonation and session settings).
    - Session configuration (TTL, update age, cookie cache).
    - Additional user fields (e.g., `creditsUsed`, `creditsTotal`).
    - Social providers (GitHub, Google, LinkedIn) configured via `AUTH_*` environment variables.
    - Email/password flows with verification and password reset, delegating to email utilities.
    - Email verification logic that checks whether a user signed up via social login and skips verification emails in that case.
  - `src/better-auth/auth-client.ts` defines a `createAuthClient` instance (`authClient`) with an optional `baseURL` and exposes `signIn`, `signOut`, and `useSession` helpers for the frontend.
- **Email (`@workspace/email`)**:
  - `src/resend/index.ts` wraps the Resend SDK to send:
    - Verification emails (using the `EmailVerification` React Email template).
    - Reset password emails (using the `ResetPassword` template).
    - Simple support emails and newsletter contact creation.
  - Templates under `src/templates` define Tailwind-styled React Email components.
  - Auth flows in `@workspace/auth` call these helpers directly, so any changes to email layout or sender/recipient behaviour should be made here.

### Observability

- **Logger (`@workspace/observability`)**:
  - `src/winston-logger.ts` configures a Winston logger with:
    - Console transport.
    - Logtail transport (using `BETTERSTACK_TELEMETRY_SOURCE_TOKEN` and `BETTERSTACK_TELEMETRY_INGESTING_HOST`).
  - Formats logs with timestamp + colorization and is used throughout the CMS / Notion layer for database and page operations.

### UI / Design system (`@workspace/ui`)

- Centralized component library for the monorepo:
  - `src/components/shadcn/*`: shadcn/ui primitives.
  - `src/components/mdx/*`: MDX-specific components and helpers (e.g., headings, lists, table of contents, code blocks).
  - `src/components/notion/*`: Renderers for Notion blocks and rich text.
  - `src/components/aceternity/*` and `src/components/misc/*`: Visual/animated components shared across the app.
- The README describes how to add new shadcn components so that they land in `packages/ui/src/components` and can be imported from `@workspace/ui`.

## Commands and workflows

All commands below are intended to be run from the repository root unless otherwise noted.

### Installation and setup

- **Install dependencies** (respecting the configured package manager and Node engine):
  - `pnpm install`
- **Environment configuration**:
  - Copy `apps/web/.env.example` to `apps/web/.env` and fill in the required environment variables (Notion API credentials, Redis, auth providers, Resend, n8n webhook URLs, etc.).
  - The `saas-forge` CLI (`scripts/cli.js`) performs this copy and can optionally set `NEXT_PUBLIC_THEME` when used from a fresh clone.

### Running the app

- **Start all dev tasks via Turbo**:
  - `pnpm dev`
- **Run only the web app dev server**:
  - `pnpm --filter web dev`
- **Build the entire workspace**:
  - `pnpm build`
- **Build only the web app**:
  - `pnpm --filter web build`

### Linting, formatting, and type-checking

- **Lint all workspaces**:
  - `pnpm lint`
- **Lint only the web app**:
  - `pnpm --filter web lint`
- **Auto-fix lint issues in the web app**:
  - `pnpm --filter web lint:fix`
- **Format TypeScript/TSX/Markdown using Prettier**:
  - `pnpm format`
- **Type-check the Next.js app**:
  - `pnpm --filter web typecheck`

### Testing

Currently, the main automated tests live in the CMS / Notion integration.

- **Run all CMS tests**:
  - `pnpm --filter @workspace/cms test`
- **Run a single CMS test file** (Vitest passes additional args through to the test runner):
  - `pnpm --filter @workspace/cms test -- testing/index.test.ts`

### Database and Prisma utilities

From the repo root, using pnpm filters:

- **Generate Prisma client for the database package**:
  - `pnpm --filter @workspace/database postgres:generate`
- **Apply local dev migrations**:
  - `pnpm --filter @workspace/database postgres:migrate`
- **Reset the dev database (drops data)**:
  - `pnpm --filter @workspace/database postgres:reset`

### Notion-driven content

- The landing page, documentation, and legal content are all driven from Notion databases whose IDs and filters are specified via environment variables (e.g., `LANDING_DATABASE_ID`, `HERO_DATABASE_ID`, `DOCUMENTATION_DATABASE_ID`, etc.).
- The recommended way to change content structure is:
  1. Update Notion databases and properties.
  2. Adjust the query and mapping logic in `apps/web/lib/functions/fetchLandingPageDataFromNotion.ts` and/or `apps/web/lib/functions/fetchDocumentationFromNotion.ts`.
  3. If necessary, extend the type definitions in `apps/web/lib/ts-types/*` and corresponding UI components in `apps/web/blocks` and `@workspace/ui`.

### Adding UI components via shadcn

- As noted in `README.md`, to add a new shadcn component into the shared UI package:
  - From the repo root, run (example for `button`):
    - `pnpm dlx shadcn@latest add button -c apps/web`
  - The generated component will be placed in `packages/ui/src/components`, and you can then import it in the app as:
    - `import { Button } from "@workspace/ui/components/button"`.

## How future Warp agents should approach changes

- **For backend/data changes**:
  - Prefer implementing Notion or DB-related logic in the shared packages (`@workspace/cms`, `@workspace/database`, `@workspace/auth`, `@workspace/email`) instead of directly in `apps/web`.
  - Expose new behaviour via TRPC routers under `apps/web/trpc/routers`, then consume them from React components using the TRPC React/Query hooks.
- **For frontend/UX changes**:
  - Reuse and extend components in `@workspace/ui` where possible so they can serve multiple apps if more are added to the monorepo.
  - Keep marketing/landing-specific composition in `apps/web/blocks` and `apps/web/components/landing`, and avoid coupling them directly to low-level Notion logic.
- **For auth and middleware**:
  - Changes to session rules, route protection, or CORS should primarily happen in `apps/web/middleware.ts` and `@workspace/auth/src/better-auth/auth.ts`.
  - If you need per-request user context inside TRPC, extend `createTRPCContext` in `apps/web/trpc/init.ts` and thread that through procedures instead of reading cookies or headers directly from routers.

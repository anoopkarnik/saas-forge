# Guest (Read-Only) Role — Design

**Status:** Approved for planning
**Date:** 2026-08-03

## Goal

Introduce a `guest` role so an admin can provision read-only demo accounts. A
guest can browse the entire authenticated app and exercise every **read**
(tRPC query, GET) path, but **all writes** (create / update / delete) are
rejected on the server — unless the actor is an `admin`. Guest accounts let
prospective customers explore the product's look, flows, and features without
being able to modify data.

## Scope (all 11 selected features)

- **A. Foundation & enforcement:** add `guest` role; tRPC write-guard; REST
  write-guard; block guest self-account edits.
- **B. Admin management:** "Set as Guest" + role badge; create-guest-account
  dialog.
- **C. Guest UX:** read-only banner; disable main write controls; friendly
  blocked-write message.
- **D. Demo experience:** seed demo data; one-click public "Try demo" login.

## Current state (verified)

- Roles are a Postgres enum `USER_ROLE = user | admin`
  (`packages/database/prisma/user.prisma:36`), default `user`.
- Roles are assigned through Better Auth's `admin` plugin
  (`packages/auth/src/better-auth/auth.ts`); the admin UI calls
  `authClient.admin.setRole({ userId, role })`
  (`apps/web/app/(home)/admin/users/page.tsx`). Client wiring is
  `adminClient()` in `packages/auth/src/better-auth/auth-client.ts`.
- Authorization tiers live in `apps/web/trpc/init.ts`:
  `baseProcedure` → `protectedProcedure` → `adminProcedure` (role === 'admin').
  There is no "can this role write?" tier.
- tRPC is v11 (installed 11.11.0). **Confirmed:** middleware receives
  `type: 'query' | 'mutation' | 'subscription'` — so a single middleware can
  discriminate reads from writes without editing individual procedures.
- Mutations exist across ~10 routers (~25 `.mutation()` calls), all built on
  `protectedProcedure` / `adminProcedure`.
- REST mutating routes exist under `apps/web/app/api/*` (e.g. `cms/upload`
  checks `role !== 'admin'`; AI action routes).
- Admin user-management UI (`packages/ui/src/components/admin/UserActionsDropdown.tsx`,
  `UsersTable.tsx`) only understands `admin | user`.
- Better Auth already provides ban + impersonation.
- The user-create `after` hook auto-promotes the **first ever** user to
  `admin`.

## Design

### 1. Role foundation

**Database.** Add `guest` to the `USER_ROLE` enum in `user.prisma`. Default
stays `user`. This requires a migration. Per `CLAUDE.md`, the schema is edited
here but the migration file is **not** created by the agent — the owner runs
`pnpm migrate`. After editing, run `pnpm generate` + `prisma validate`.

**Better Auth.** Register `guest` with the `admin` plugin using an
access-control config so `setRole` / `createUser` accept it, and mirror the
config in `auth-client.ts`. Keep `adminRoles` = `['admin']` so a guest is never
treated as an admin. `adminProcedure` already rejects any non-admin, so guests
cannot reach admin endpoints — no extra escalation guard needed there.

**Known edge case (accepted for v1):** the first-user auto-admin `after` hook
is left untouched. A guest created into a truly empty database would be promoted
to admin. Real guests are provisioned after the admin exists, so this is
documented but not mitigated.

### 2. Server-side enforcement (security core)

**tRPC — single middleware, no per-router edits.** Extend `protectedProcedure`
in `apps/web/trpc/init.ts`:

```ts
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: '...' });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
})
.use(({ ctx, type, next }) => {
  if (type === 'mutation' && ctx.session.user.role === 'guest') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This is a read-only demo account.',
    });
  }
  return next();
});
```

Because every mutating router builds on `protectedProcedure` (directly or via
`adminProcedure`), this covers all current and future mutations. Queries pass
untouched. Admins pass (role ≠ guest). The `FORBIDDEN` + fixed message string
is the contract the UI keys off for the friendly toast.

**REST `/api/*`.** Add a shared helper (e.g.
`apps/web/lib/auth/assertNotGuest.ts`) returning `403` with the same
`read-only demo account` message when `session.user.role === 'guest'`. Apply to
mutating routes. Routes to guard (verified surfaces):
- `apps/web/app/api/cms/upload/route.ts`
- AI action / chat routes under `apps/web/app/api/ai/*` that perform writes
  (enumerate during implementation; reads stay open).

Payment webhooks and `/api/scaffold` are unauthenticated system routes and are
out of scope.

**Better Auth account endpoints.** Guests must not change their own
password/email or delete their own account. Add a guard (Better Auth
`before` hook or wrapper) on the sensitive account mutations rejecting
`role === 'guest'` with the same message. Note `apps/web` has a
`home.setPassword` protected mutation — that is already covered by the tRPC
guard; the Better Auth guard covers the plugin's native account endpoints.

### 3. Admin management UI

- Widen `handleSetRole` and `UserActionsDropdown` / `UsersTable` from
  `"admin" | "user"` to include `"guest"`. Add a "Set as Guest" dropdown item
  and a distinct **guest badge** in the users table.
- **Create guest account:** a dialog on `admin/users` collecting email +
  password, calling `authClient.admin.createUser({ email, password, role: 'guest' })`,
  then refreshing the list. Reuses existing toast/error patterns.

### 4. Guest-facing UX (graceful; not the security boundary)

- **Read-only banner:** a session-aware component rendered in the authenticated
  shell when `role === 'guest'` ("You're viewing a read-only demo").
- **Disable write controls:** a `useIsGuest()` hook; v1 disables the **main**
  write surfaces (primary create/save/delete actions on the principal pages),
  not exhaustively every button. Server guards remain the real enforcement.
- **Friendly blocked-write message:** map the `FORBIDDEN` / `403`
  "read-only demo account" response to a clean toast in the tRPC client error
  handling / mutation `onError`, so any un-disabled write still fails politely.

### 5. Demo experience

- **Seed demo data:** extend `packages/database/src/seed.ts` to create a
  `guest` demo user plus a modest, clearly-expandable set of representative
  sample records so the account isn't empty on first view.
- **One-click "Try demo":** a public `POST /api/demo-login` route added to
  `publicRoutes` in `apps/web/middleware.ts`. It signs into a preconfigured
  demo guest using **server-side** env credentials
  (`DEMO_GUEST_EMAIL` / `DEMO_GUEST_PASSWORD` — not `NEXT_PUBLIC_`), sets the
  session cookie, and redirects into the app. A landing-page button posts to
  it. Add the new env vars to `apps/web/.env.example`.

### 6. Template parity

Shared changes (auth, database, ui, trpc) must be reflected in
`templates/saas-boilerplate` via `pnpm template:sync` and validated with
`pnpm template:check-sync`. Do not hand-edit `.generated/`. This is a plan step,
not a manual copy.

## Testing

Mirror existing `apps/web/trpc/routers/__tests__` patterns:

- **tRPC guard:** guest mutation → `FORBIDDEN`; guest query → succeeds; admin
  mutation → succeeds; regular `user` mutation → succeeds (unchanged).
- **REST helper:** `assertNotGuest` returns 403 for guest, passes others.
- **Account guard:** guest self-account mutation rejected.
- **Better Auth role config:** `guest` is an accepted role value for
  `setRole` / `createUser`.

Default verification: `pnpm --dir apps/web typecheck`, `pnpm --dir apps/web test`,
`prisma validate`, and `pnpm template:check-sync` after starter-related changes.

## Out of scope / deferred

- Fine-grained per-model read redaction (guests see the same reads as users).
- Exhaustive per-button disabling beyond main surfaces.
- Mitigating the first-user auto-admin edge case.
- Time-boxed / auto-expiring guest sessions.

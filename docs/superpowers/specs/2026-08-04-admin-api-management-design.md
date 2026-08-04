# Admin → API Management — Design

Date: 2026-08-04

## Goal

An admin-only page that lists every tRPC call in the app, grouped by router,
showing each call's type (query/mutation) and the role that can access it. The
data is kept accurate by a drift test against the live router.

## Background

Access control in this repo is structural — the role a call requires is fully
determined by which procedure builder it was declared with in
`apps/web/trpc/init.ts`:

- `baseProcedure` → **Public** (anyone, including unauthenticated)
- `protectedProcedure` → **Authenticated** (user + admin full access; the
  `guest` role is authenticated but blocked from mutations, so guests get
  read-only access)
- `adminProcedure` → **Admin only**
- `guestReadableAdminProcedure` → **Admin write, guest read** (added as part of
  this work; see below)

There is no per-call role field, so "what role can access it" is derivable but
not stored. The live surface is available at `appRouter._def.procedures`
(a flat `path → { _def.type }` map).

### Guest read-only model

`guest` is a **public one-click demo** login, so effectively an anonymous
visitor. The requirement is: guests read what they may see, write nothing.

`guestReadableAdminProcedure` (in `trpc/init.ts`) grants **admins full access
and guests query-only access**; everyone else needs admin. The guest mutation
block from `protectedProcedure` still applies, so guests can never mutate.

Because the demo login is public, only **non-sensitive** admin reads are moved
to this procedure — SEO analytics, model/speech/webhook config, and admin doc
reads. Sensitive admin queries stay on `adminProcedure` (guest-blocked):
`admin.invites.list` (invitee + admin emails / PII), `ai.getPrompts` /
`getPromptVersions` (prompt IP), and `ai.getUsageEvents` (cost data).

Resulting guest access: public queries ✓, public mutations ✓ (ungated),
authenticated queries ✓, authenticated mutations ✗, `adminGuestRead` queries ✓,
admin queries/mutations ✗.

Router groups (`apps/web/trpc/routers/_app.ts`): support, landing,
documentation, home, billing, seo, ai, aiJobs, apiKey, admin. The `admin`
router has nested sub-routers (`admin.settings.*`, `admin.invites.*`).

## Components

### 1. Registry — `apps/web/trpc/apiRegistry.ts`

Single source of truth. Plain data, no server-only imports (safe to import from
a client component).

```ts
type Access = "public" | "authenticated" | "admin";
type ApiCall = { name: string; type: "query" | "mutation"; access: Access };
type ApiGroup = { group: string; label: string; calls: ApiCall[] };
export const API_REGISTRY: ApiGroup[] = [ /* 10+ groups */ ];
```

Nested admin sub-routers render as their own labeled groups
(`admin.settings`, `admin.invites`). `access` is hand-authored (it maps 1:1 to
the builder used) and verified for presence/type by the drift test.

### 2. Drift test — `apps/web/trpc/__tests__/apiRegistry.test.ts`

Imports the live `appRouter`, flattens `appRouter._def.procedures` to
`path → type`, and asserts:

- every real procedure path exists in the registry (no missing endpoints);
- every registry entry maps to a real path (no stale entries);
- the registry's `type` matches the router's actual `_def.type`.

Adding/removing/renaming a procedure without updating the registry turns the
test red. Role is not stored in the router, so it cannot be auto-verified —
presence and type are.

### 3. UI — `packages/ui/src/components/admin/ApiRegistryTable.tsx`

Pure presentational component (props-only, like the existing
`RegistrationModeToggle`), so it template-syncs cleanly. One collapsible
section per group. Each row: call name, a Query/Mutation badge, a color-coded
access badge (Public / Authenticated / Admin; `adminGuestRead` shows as Admin),
and a **Guest** column (✓/✗) computed from `(access, type)` per the guest model
above. A legend explains the tiers plus the guest read-only rule.

### 4. Page — `apps/web/app/(home)/admin/api/page.tsx`

Client page following the `useAdminGuard()` pattern from
`app/(home)/admin/users/page.tsx` (spinner while pending, `null` if not admin).
Renders `<ApiRegistryTable data={API_REGISTRY} />`. Data is static — no tRPC
fetch.

### 5. Navigation — `packages/ui/src/components/sidebar/AppSidebar.tsx`

Add an "API Management" item to the admin group, pointing to `/admin/api`.

### 6. Template sync

After implementation, run `pnpm template:check-sync` / `pnpm template:sync` so
the new files land in `templates/saas-boilerplate` (both `apps/web` and
`packages/ui`).

## Scope (YAGNI)

Read-only reference page. No editing, no live invocation, no input-schema
display. Access badges reflect current behavior; nothing new is enforced.

## Testing

- `apps/web/trpc/routers/__tests__/apiRegistry.test.ts` — drift test (above).
- `apps/web/trpc/routers/__tests__/guestReadableAdmin.test.ts` — verifies the
  new procedure: admin full access, guest query-only, guest mutation blocked,
  non-admin user blocked.
- `pnpm --dir apps/web typecheck`.
- `pnpm template:check-sync` after starter-related changes.

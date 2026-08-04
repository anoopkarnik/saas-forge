# Guest (Read-Only) Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `guest` role whose accounts can read the entire authenticated app but are blocked server-side from all create/update/delete operations, so admins can hand prospects a live read-only demo.

**Architecture:** A single tRPC middleware on `protectedProcedure` discriminates `type === 'mutation'` and rejects guests — covering all current and future mutations with no per-router edits. Parallel guards cover REST `/api/*` routes and Better Auth's native account endpoints. The role is a Postgres enum value; Better Auth's `setRole`/`createUser` accept it as a plain string. Guest-facing UX (banner, disabled controls, friendly errors) is layered on top but is not the security boundary.

**Tech Stack:** Next.js (App Router), tRPC v11, Better Auth (`admin` plugin), Prisma/Postgres, Vitest + happy-dom, shadcn/ui, Turborepo monorepo with a synced `templates/saas-boilerplate` copy.

## Global Constraints

- Cross-package imports use `@workspace/*`; app-local imports in `apps/web` use `@/`. Copy exact values verbatim.
- The blocked-write message string is exactly `This is a read-only demo account.` everywhere (tRPC, REST, Better Auth) — the UI relies on it.
- Never hand-create migration SQL. Edit `packages/database/prisma/*.prisma`, run `pnpm generate` + `prisma validate`; the repo owner runs `pnpm migrate`. State in the final response that a migration is required.
- New env vars must be added to `apps/web/.env.example` in the same change. Demo credentials are server-only — never `NEXT_PUBLIC_`.
- Shared changes (`packages/*`, `apps/web` trpc/init) must be mirrored to `templates/saas-boilerplate` via `pnpm template:sync` and validated with `pnpm template:check-sync`. Never hand-edit `.generated/`.
- Do not weaken existing `adminProcedure` (role === 'admin') behavior. Regular `user` role behavior must remain unchanged.
- Vitest globals are enabled; web tests run in happy-dom; `@` resolves to the app root in web tests. Mock workspace packages directly.

---

### Task 1: Add `guest` to the role enum

**Files:**
- Modify: `packages/database/prisma/user.prisma:36-41`

**Interfaces:**
- Consumes: nothing.
- Produces: `USER_ROLE` enum now includes `guest`. Downstream code compares `role === 'guest'` (string).

- [ ] **Step 1: Add the enum value**

In `packages/database/prisma/user.prisma`, change the enum:

```prisma
enum USER_ROLE {
    user
    admin
    guest

    @@schema("user_schema")
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `pnpm generate`
Expected: completes without error; generated client types include `guest`.

- [ ] **Step 3: Validate the schema**

Run: `pnpm --dir packages/database exec prisma validate` (or `pnpm dlx prisma validate --schema packages/database/prisma/schema.prisma` if the schema is single-file; use the path Prisma reports).
Expected: "The schema is valid."

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/user.prisma
git commit -m "feat(db): add guest value to USER_ROLE enum"
```

> NOTE: A migration is required. Do NOT create the migration SQL. The repo owner runs `pnpm migrate`. Flag this in the final summary.

---

### Task 2: tRPC mutation write-guard

**Files:**
- Modify: `apps/web/trpc/init.ts:57-70`
- Test: `apps/web/trpc/routers/__tests__/guestGuard.test.ts` (create)

**Interfaces:**
- Consumes: `baseProcedure`, `createTRPCRouter` from `apps/web/trpc/init.ts`; `type` from tRPC middleware opts.
- Produces: `protectedProcedure` now throws `TRPCError({ code: 'FORBIDDEN', message: 'This is a read-only demo account.' })` for guest mutations. Queries and non-guest roles unaffected.

- [ ] **Step 1: Write the failing test**

Create `apps/web/trpc/routers/__tests__/guestGuard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../init";

// A minimal router built on the real protectedProcedure so the guard under test runs.
const probeRouter = createTRPCRouter({
  read: protectedProcedure.query(() => "ok"),
  write: protectedProcedure.input(z.object({}).optional()).mutation(() => "written"),
});

const ctx = (role: string) =>
  ({ session: { user: { id: "u1", role, email: "u@x.test", name: "U" } } } as any);

describe("guest write-guard", () => {
  it("blocks guest mutations with a read-only message", async () => {
    const caller = probeRouter.createCaller(ctx("guest"));
    await expect(caller.write({})).rejects.toThrow("This is a read-only demo account.");
  });

  it("allows guest queries", async () => {
    const caller = probeRouter.createCaller(ctx("guest"));
    expect(await caller.read()).toBe("ok");
  });

  it("allows user mutations", async () => {
    const caller = probeRouter.createCaller(ctx("user"));
    expect(await caller.write({})).toBe("written");
  });

  it("allows admin mutations", async () => {
    const caller = probeRouter.createCaller(ctx("admin"));
    expect(await caller.write({})).toBe("written");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web test guestGuard`
Expected: FAIL — "blocks guest mutations" fails because the guard does not exist yet (guest mutation currently returns "written").

- [ ] **Step 3: Add the guard middleware**

In `apps/web/trpc/init.ts`, chain a second `.use` onto `protectedProcedure` (after the existing auth check):

```ts
export const protectedProcedure = baseProcedure
  .use(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in to access this resource.' })
    }
    return next({ ctx: { ...ctx, session: ctx.session } })
  })
  .use(({ ctx, type, next }) => {
    if (type === 'mutation' && ctx.session.user.role === 'guest') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'This is a read-only demo account.',
      })
    }
    return next()
  })
```

Leave `adminProcedure` unchanged — it builds on `protectedProcedure` and inherits the guard (guests never reach admin endpoints anyway).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web test guestGuard`
Expected: PASS (all 4).

- [ ] **Step 5: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/trpc/init.ts apps/web/trpc/routers/__tests__/guestGuard.test.ts
git commit -m "feat(trpc): block guest mutations via protectedProcedure guard"
```

---

### Task 3: REST `assertNotGuest` helper and route application

**Files:**
- Create: `apps/web/lib/auth/assertNotGuest.ts`
- Test: `apps/web/lib/auth/__tests__/assertNotGuest.test.ts` (create)
- Modify: `apps/web/app/api/cms/upload/route.ts` (and other mutating `/api/*` routes found in Step 5)

**Interfaces:**
- Consumes: Better Auth `Session` shape (`session.user.role`).
- Produces: `assertNotGuest(session: { user?: { role?: string | null } } | null): NextResponse | null` — returns a `403` `NextResponse` when the actor is a guest, otherwise `null`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/lib/auth/__tests__/assertNotGuest.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { assertNotGuest } from "../assertNotGuest";

describe("assertNotGuest", () => {
  it("returns a 403 response for guest sessions", async () => {
    const res = assertNotGuest({ user: { role: "guest" } });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    expect(await res!.json()).toEqual({ error: "This is a read-only demo account." });
  });

  it("returns null for admins", () => {
    expect(assertNotGuest({ user: { role: "admin" } })).toBeNull();
  });

  it("returns null for regular users", () => {
    expect(assertNotGuest({ user: { role: "user" } })).toBeNull();
  });

  it("returns null when there is no session", () => {
    expect(assertNotGuest(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web test assertNotGuest`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `apps/web/lib/auth/assertNotGuest.ts`:

```ts
import { NextResponse } from "next/server";

type SessionLike = { user?: { role?: string | null } | null } | null;

export function assertNotGuest(session: SessionLike): NextResponse | null {
  if (session?.user?.role === "guest") {
    return NextResponse.json(
      { error: "This is a read-only demo account." },
      { status: 403 },
    );
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web test assertNotGuest`
Expected: PASS (4).

- [ ] **Step 5: Apply the guard to mutating REST routes**

Enumerate authenticated mutating routes: `grep -rln "export async function POST\|export async function PUT\|export async function PATCH\|export async function DELETE" apps/web/app/api`. Exclude unauthenticated system routes: `api/payments/*/webhook`, `api/scaffold`, `api/auth/*`, `api/trpc`, and `api/demo-login` (Task 8). For each remaining route that already resolves a session (e.g. `apps/web/app/api/cms/upload/route.ts`), add immediately after the session is loaded and the existing auth check:

```ts
import { assertNotGuest } from "@/lib/auth/assertNotGuest";
// ...after: const session = await auth.api.getSession({ headers: ... })
const guestBlocked = assertNotGuest(session);
if (guestBlocked) return guestBlocked;
```

Place it before any write. Do not add it to GET handlers.

- [ ] **Step 6: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/auth/assertNotGuest.ts apps/web/lib/auth/__tests__/assertNotGuest.test.ts apps/web/app/api
git commit -m "feat(api): block guest writes on REST routes via assertNotGuest"
```

---

### Task 4: Better Auth guest account-mutation guard

**Files:**
- Create: `packages/auth/src/better-auth/guestGuard.ts`
- Test: `packages/auth/src/better-auth/guestGuard.test.ts` (create)
- Modify: `packages/auth/src/better-auth/auth.ts` (add `hooks.before` to `options`)

**Interfaces:**
- Consumes: nothing external for the pure helper.
- Produces:
  - `GUEST_BLOCKED_PATHS: readonly string[]` = `["/change-email", "/change-password", "/update-user", "/delete-user"]`
  - `isGuestAccountMutation(path: string): boolean` — true when `path` is a guest-blocked account endpoint.

- [ ] **Step 1: Write the failing test**

Create `packages/auth/src/better-auth/guestGuard.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { isGuestAccountMutation, GUEST_BLOCKED_PATHS } from "./guestGuard";

describe("isGuestAccountMutation", () => {
  it.each(GUEST_BLOCKED_PATHS)("blocks %s", (path) => {
    expect(isGuestAccountMutation(path)).toBe(true);
  });

  it("ignores read/session paths", () => {
    expect(isGuestAccountMutation("/get-session")).toBe(false);
    expect(isGuestAccountMutation("/sign-out")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/auth test guestGuard` (if `packages/auth` has no test script, run `pnpm --dir packages/auth exec vitest run guestGuard`).
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure helper**

Create `packages/auth/src/better-auth/guestGuard.ts`:

```ts
export const GUEST_BLOCKED_PATHS = [
  "/change-email",
  "/change-password",
  "/update-user",
  "/delete-user",
] as const;

export function isGuestAccountMutation(path: string): boolean {
  return (GUEST_BLOCKED_PATHS as readonly string[]).includes(path);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/auth exec vitest run guestGuard`
Expected: PASS.

- [ ] **Step 5: Wire the guard into Better Auth**

In `packages/auth/src/better-auth/auth.ts`, add imports at the top:

```ts
import { createAuthMiddleware, APIError, getSessionFromCtx } from "better-auth/api";
import { isGuestAccountMutation } from "./guestGuard";
```

Add a `hooks` key to the `options` object (sibling of `plugins`, `databaseHooks`, `advanced`):

```ts
hooks: {
  before: createAuthMiddleware(async (ctx) => {
    if (!isGuestAccountMutation(ctx.path)) return;
    const session = await getSessionFromCtx(ctx);
    if (session?.user?.role === "guest") {
      throw new APIError("FORBIDDEN", {
        message: "This is a read-only demo account.",
      });
    }
  }),
},
```

If `getSessionFromCtx` is not exported from `better-auth/api` in this version, use `ctx.context.session?.user?.role` (the sensitive account endpoints populate `ctx.context.session`). Verify the import resolves via typecheck in Step 6.

- [ ] **Step 6: Typecheck the package**

Run: `pnpm --dir packages/auth exec tsc --noEmit` (or `pnpm --dir apps/web typecheck`, which type-checks the imported auth package).
Expected: no new errors. If the `getSessionFromCtx` import errors, switch to the `ctx.context.session` fallback described in Step 5 and re-run.

- [ ] **Step 7: Commit**

```bash
git add packages/auth/src/better-auth/guestGuard.ts packages/auth/src/better-auth/guestGuard.test.ts packages/auth/src/better-auth/auth.ts
git commit -m "feat(auth): block guest self-account mutations in better-auth hook"
```

---

### Task 5: Admin UI — Set as Guest, guest badge, create-guest dialog

**Files:**
- Modify: `packages/ui/src/components/admin/UserActionsDropdown.tsx`
- Modify: `packages/ui/src/components/admin/UsersTable.tsx`
- Modify: `apps/web/app/(home)/admin/users/page.tsx`
- Create: `packages/ui/src/components/admin/CreateGuestDialog.tsx`
- Test: `packages/ui/src/components/admin/UserActionsDropdown.test.tsx` (create)

**Interfaces:**
- Consumes: existing `UserActionsDropdown` / `UsersTable` props.
- Produces:
  - `onSetRole` signature widened to `(userId: string, newRole: "admin" | "user" | "guest") => void` in both `UserActionsDropdown` and `UsersTable`.
  - `CreateGuestDialog` component: props `{ onCreate: (email: string, password: string) => Promise<void> }`, renders a trigger button + dialog with email/password fields.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/admin/UserActionsDropdown.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserActionsDropdown } from "./UserActionsDropdown";

function setup(role: string) {
  const onSetRole = vi.fn();
  render(
    <UserActionsDropdown
      user={{ id: "u2", role, banned: false }}
      currentUserId="admin1"
      onSetRole={onSetRole}
      onBanToggle={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  return { onSetRole };
}

describe("UserActionsDropdown guest option", () => {
  it("offers Set as Guest for a non-guest user", () => {
    const { onSetRole } = setup("user");
    fireEvent.click(screen.getByText(/set as guest/i));
    expect(onSetRole).toHaveBeenCalledWith("u2", "guest");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/ui exec vitest run UserActionsDropdown`
Expected: FAIL — no "Set as Guest" item.

- [ ] **Step 3: Add the guest option and widen the type**

In `packages/ui/src/components/admin/UserActionsDropdown.tsx`: change the prop type to
`onSetRole: (userId: string, newRole: "admin" | "user" | "guest") => void;` and add a menu item (import `Eye` from `lucide-react`) after the promote/demote block:

```tsx
{user.role !== "guest" && (
  <DropdownMenuItem onClick={() => onSetRole(user.id, "guest")}>
    <Eye className="mr-2 h-4 w-4 text-sky-500" />
    Set as Guest
  </DropdownMenuItem>
)}
{user.role === "guest" && (
  <DropdownMenuItem onClick={() => onSetRole(user.id, "user")}>
    <ShieldAlert className="mr-2 h-4 w-4" />
    Restore to User
  </DropdownMenuItem>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/ui exec vitest run UserActionsDropdown`
Expected: PASS.

- [ ] **Step 5: Widen `UsersTable` type and badge**

In `packages/ui/src/components/admin/UsersTable.tsx`: widen `onSetRole` to `(userId: string, newRole: "admin" | "user" | "guest") => void;`. The role badge already renders `{user.role}` capitalized — change the `variant` expression to treat guest distinctly:

```tsx
variant={user.role === "admin" ? "default" : user.role === "guest" ? "outline" : "secondary"}
```

- [ ] **Step 6: Create the CreateGuestDialog**

Create `packages/ui/src/components/admin/CreateGuestDialog.tsx` (follow existing shadcn dialog usage in the repo — `@workspace/ui/components/shadcn/dialog`, `input`, `button`, `label`):

```tsx
"use client";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@workspace/ui/components/shadcn/dialog";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { UserPlus } from "lucide-react";

export function CreateGuestDialog({ onCreate }: { onCreate: (email: string, password: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await onCreate(email, password);
      setOpen(false);
      setEmail("");
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" />Create guest</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create guest account</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="guest-email">Email</Label>
            <Input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="guest-password">Password</Label>
            <Input id="guest-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={busy || !email || !password}>{busy ? "Creating..." : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: Wire the page**

In `apps/web/app/(home)/admin/users/page.tsx`: widen `handleSetRole`'s `newRole` param type to `"admin" | "user" | "guest"`, add a handler, and render `CreateGuestDialog` near the users header:

```tsx
const handleCreateGuest = async (email: string, password: string) => {
  const { error } = await authClient.admin.createUser({ email, password, role: "guest", name: email.split("@")[0] });
  if (error) { toast.error(error.message || "Failed to create guest"); return; }
  toast.success("Guest account created");
  fetchUsers();
};
```

Import and place `<CreateGuestDialog onCreate={handleCreateGuest} />` in the page toolbar.

- [ ] **Step 8: Verify build/typecheck**

Run: `pnpm --dir apps/web typecheck` and `pnpm --dir packages/ui exec vitest run UserActionsDropdown`
Expected: no new type errors; test passes.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/components/admin apps/web/app/\(home\)/admin/users/page.tsx
git commit -m "feat(admin): guest role management and create-guest dialog"
```

---

### Task 6: Guest UX — hook, banner, disabled main controls, friendly errors

**Files:**
- Create: `packages/ui/src/hooks/useIsGuest.ts`
- Create: `packages/ui/src/components/misc/GuestBanner.tsx`
- Test: `packages/ui/src/components/misc/GuestBanner.test.tsx` (create)
- Modify: `apps/web/app/(home)/layout.tsx` (render the banner)

**Interfaces:**
- Consumes: Better Auth `useSession` (`@workspace/auth/better-auth/auth-client`).
- Produces:
  - `useIsGuest(): boolean` — reads the session and returns `role === 'guest'`.
  - `GuestBanner` — renders a read-only notice only for guests; renders nothing otherwise.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/misc/GuestBanner.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useSession = vi.fn();
vi.mock("@workspace/auth/better-auth/auth-client", () => ({ useSession: () => useSession() }));

import { GuestBanner } from "./GuestBanner";

afterEach(() => vi.clearAllMocks());

describe("GuestBanner", () => {
  it("shows a read-only notice for guests", () => {
    useSession.mockReturnValue({ data: { user: { role: "guest" } } });
    render(<GuestBanner />);
    expect(screen.getByText(/read-only demo/i)).toBeTruthy();
  });

  it("renders nothing for non-guests", () => {
    useSession.mockReturnValue({ data: { user: { role: "user" } } });
    const { container } = render(<GuestBanner />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/ui exec vitest run GuestBanner`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement hook and banner**

Create `packages/ui/src/hooks/useIsGuest.ts`:

```ts
"use client";
import { useSession } from "@workspace/auth/better-auth/auth-client";

export function useIsGuest(): boolean {
  const session = useSession();
  return session?.data?.user?.role === "guest";
}
```

Create `packages/ui/src/components/misc/GuestBanner.tsx`:

```tsx
"use client";
import React from "react";
import { useIsGuest } from "../../hooks/useIsGuest";
import { Eye } from "lucide-react";

export function GuestBanner() {
  const isGuest = useIsGuest();
  if (!isGuest) return null;
  return (
    <div className="flex items-center gap-2 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-sm px-4 py-2 border-b border-sky-500/20">
      <Eye className="h-4 w-4" />
      You&apos;re in a read-only demo. Changes are disabled.
    </div>
  );
}
```

> If `packages/ui/package.json` does not already export `hooks/*`, add the subpath export (mirror an existing `./components/*` export entry). Verify with typecheck.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/ui exec vitest run GuestBanner`
Expected: PASS (both).

- [ ] **Step 5: Render the banner in the home shell**

In `apps/web/app/(home)/layout.tsx`, import `GuestBanner` and render it directly under the `<SidebarProvider>`'s content column, above the header row:

```tsx
import { GuestBanner } from "@workspace/ui/components/misc/GuestBanner";
// ...inside <div className="flex flex-col flex-1 max-h-screen">, as the first child:
<GuestBanner />
```

- [ ] **Step 6: Disable main write controls for guests**

Identify the primary write action buttons on the principal authenticated pages (start with the admin users toolbar create/invite actions and the most prominent create/save button on the main dashboard surface). For each, gate the `disabled` prop with `useIsGuest()`:

```tsx
const isGuest = useIsGuest();
// ...
<Button disabled={isGuest || existingDisabled}>...</Button>
```

Scope: main surfaces only (per spec — server guards are the real enforcement). Do not attempt every button.

- [ ] **Step 7: Confirm friendly error surfacing**

The server returns `This is a read-only demo account.` and existing mutation handlers call `toast.error(e.message)`. No change needed where that pattern is used. For any mutation `onError` that does NOT surface `error.message`, add `toast.error(error.message)`. Grep: `grep -rn "onError" apps/web` and spot-check.

- [ ] **Step 8: Typecheck + tests**

Run: `pnpm --dir apps/web typecheck` and `pnpm --dir packages/ui exec vitest run GuestBanner`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/hooks/useIsGuest.ts packages/ui/src/components/misc/GuestBanner.tsx packages/ui/src/components/misc/GuestBanner.test.tsx packages/ui/package.json apps/web/app/\(home\)/layout.tsx
git commit -m "feat(ui): guest read-only banner, useIsGuest hook, disabled write controls"
```

---

### Task 7: Seed demo data for the guest account

**Files:**
- Create: `packages/database/src/guestDemoData.ts`
- Test: `packages/database/src/guestDemoData.test.ts` (create)
- Modify: `packages/database/src/seed.ts`

**Interfaces:**
- Consumes: nothing external for the pure builder.
- Produces: `buildGuestDemoData(): { user: { email: string; name: string; role: "guest" } }` plus any modest sample records the app surfaces. Keep the shape minimal and expandable.

- [ ] **Step 1: Write the failing test**

Create `packages/database/src/guestDemoData.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildGuestDemoData } from "./guestDemoData";

describe("buildGuestDemoData", () => {
  it("produces a guest user record", () => {
    const data = buildGuestDemoData();
    expect(data.user.role).toBe("guest");
    expect(data.user.email).toMatch(/@/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/database exec vitest run guestDemoData`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builder**

Create `packages/database/src/guestDemoData.ts`:

```ts
export function buildGuestDemoData() {
  return {
    user: {
      email: process.env.DEMO_GUEST_EMAIL ?? "demo@saas-forge.dev",
      name: "Demo Guest",
      role: "guest" as const,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/database exec vitest run guestDemoData`
Expected: PASS.

- [ ] **Step 5: Wire idempotent seeding**

In `packages/database/src/seed.ts`, import `buildGuestDemoData` and upsert the guest user idempotently (match the file's existing Prisma client usage and hashing approach; if the repo seeds passwords via Better Auth elsewhere, follow that; otherwise create the user row with role `guest` and rely on Task 8's login using Better Auth credential creation). Add a modest set of sample rows in the most visible feature area following existing seed patterns. Keep it minimal.

- [ ] **Step 6: Run the seed to verify it does not crash**

Run: `pnpm seed`
Expected: completes; re-running is idempotent (no duplicate-key crash).

- [ ] **Step 7: Commit**

```bash
git add packages/database/src/guestDemoData.ts packages/database/src/guestDemoData.test.ts packages/database/src/seed.ts
git commit -m "feat(db): seed guest demo user and sample data"
```

---

### Task 8: One-click public "Try demo" login

**Files:**
- Create: `apps/web/app/api/demo-login/route.ts`
- Test: `apps/web/app/api/demo-login/__tests__/route.test.ts` (create)
- Modify: `apps/web/middleware.ts:7-15` (add `/api/demo-login` to `publicRoutes`)
- Modify: `apps/web/.env.example` (add `DEMO_GUEST_EMAIL`, `DEMO_GUEST_PASSWORD`)
- Modify: a landing entry point (e.g. `apps/web/app/landing/**` primary CTA area) to add a "Try demo" button

**Interfaces:**
- Consumes: `auth.api.signInEmail` from `@workspace/auth/better-auth/auth`; `DEMO_GUEST_EMAIL` / `DEMO_GUEST_PASSWORD` env.
- Produces: `POST /api/demo-login` → signs in the demo guest, forwards the auth `Set-Cookie`, and returns a redirect to the app. Returns `503` when demo env is unset.

- [ ] **Step 1: Write the failing test**

Create `apps/web/app/api/demo-login/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const signInEmail = vi.fn();
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { signInEmail } },
}));

import { POST } from "../route";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.DEMO_GUEST_EMAIL = "demo@saas-forge.dev";
  process.env.DEMO_GUEST_PASSWORD = "demo-pass";
});

describe("POST /api/demo-login", () => {
  it("returns 503 when demo credentials are not configured", async () => {
    delete process.env.DEMO_GUEST_EMAIL;
    const res = await POST(new Request("http://localhost/api/demo-login", { method: "POST" }) as any);
    expect(res.status).toBe(503);
  });

  it("signs in the demo guest and redirects", async () => {
    signInEmail.mockResolvedValue({
      headers: new Headers({ "set-cookie": "better-auth.session_token=abc; Path=/" }),
    });
    const res = await POST(new Request("http://localhost/api/demo-login", { method: "POST" }) as any);
    expect(signInEmail).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: "demo@saas-forge.dev", password: "demo-pass" } }),
    );
    expect([302, 303, 307]).toContain(res.status);
    expect(res.headers.get("set-cookie")).toContain("better-auth.session_token");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web test demo-login`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the route**

Create `apps/web/app/api/demo-login/route.ts`:

```ts
import { NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";

export async function POST(req: Request) {
  const email = process.env.DEMO_GUEST_EMAIL;
  const password = process.env.DEMO_GUEST_PASSWORD;
  if (!email || !password) {
    return NextResponse.json({ error: "Demo login is not configured." }, { status: 503 });
  }

  const result = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
    headers: req.headers,
  });

  const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const res = NextResponse.redirect(new URL("/", appUrl), 303);
  const setCookie = (result as any)?.headers?.get?.("set-cookie");
  if (setCookie) res.headers.set("set-cookie", setCookie);
  return res;
}
```

> Verify the exact `signInEmail` option name for returning headers against the installed better-auth (`returnHeaders`); adjust the option and the header-extraction line together so the test's `set-cookie` assertion passes.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir apps/web test demo-login`
Expected: PASS (both).

- [ ] **Step 5: Make the route public**

In `apps/web/middleware.ts`, add `"/api/demo-login"` to the `publicRoutes` array.

- [ ] **Step 6: Add env vars**

In `apps/web/.env.example`, add:

```dotenv
# Demo (read-only guest) one-click login. Server-only — do not prefix with NEXT_PUBLIC_.
DEMO_GUEST_EMAIL=
DEMO_GUEST_PASSWORD=
```

- [ ] **Step 7: Add the landing CTA**

Add a "Try demo" button on the landing primary CTA that POSTs to `/api/demo-login` (a small form with `method="post" action="/api/demo-login"`, or a client handler doing `fetch("/api/demo-login", { method: "POST" })` then `window.location` follows the redirect). Follow existing landing button styling.

- [ ] **Step 8: Typecheck + tests**

Run: `pnpm --dir apps/web typecheck` and `pnpm --dir apps/web test demo-login`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add apps/web/app/api/demo-login apps/web/middleware.ts apps/web/.env.example apps/web/app/landing
git commit -m "feat(web): public one-click demo (guest) login"
```

---

### Task 9: Template sync and full verification

**Files:**
- Modify (generated by tooling): `templates/saas-boilerplate/**` via `pnpm template:sync`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a synced, drift-free managed starter and a green full test/typecheck run.

- [ ] **Step 1: Sync the template**

Run: `pnpm template:sync`
Expected: shared changes propagate into `templates/saas-boilerplate`.

- [ ] **Step 2: Check sync integrity**

Run: `pnpm template:check-sync`
Expected: passes (no drift, no forbidden generated artifacts).

- [ ] **Step 3: Full workspace verification**

Run: `pnpm --dir apps/web typecheck`, `pnpm --dir apps/web test`, `pnpm test`
Expected: all pass. Fix any regressions.

- [ ] **Step 4: Commit**

```bash
git add templates/saas-boilerplate
git commit -m "chore(template): sync guest role changes into saas-boilerplate"
```

---

## Notes for the implementer

- **Migration:** After Task 1, the schema has a new enum value but no migration. State clearly in the final summary that the owner must run `pnpm migrate`. Nothing at runtime works for guests until the enum exists in the database.
- **Security ordering:** Tasks 2–4 are the actual security boundary and should be verified before relying on any UI behavior from Tasks 5–6.
- **Do not** relax `adminProcedure` or change `user`-role behavior anywhere.

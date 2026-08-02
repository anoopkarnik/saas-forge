# Admin Email Invitations + Invite-Only Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins invite users by email (account created on accept) and flip the app between open and invite-only registration, enforced across all sign-up paths.

**Architecture:** A new `Invitation` table and a key/value `AppSetting` table back the feature. A single Better Auth `user.create.before` hook enforces invite-only for both email/password and social sign-ups by matching the invitee email. A new admin-gated tRPC router (`admin`) drives invite CRUD, email sending, and the registration-mode toggle; a public read exposes the mode to the sign-up page.

**Tech Stack:** Next.js (App Router), tRPC v11 + TanStack Query, Prisma (multi-schema, `user_schema`), Better Auth (`admin` plugin), React Email + Resend, Vitest (happy-dom), shadcn/ui in `@workspace/ui`.

## Global Constraints

- Cross-package imports use `@workspace/`; app-local imports use `@/`.
- Prisma models in `packages/database/prisma/` must carry `@@schema("user_schema")`.
- **Do NOT create migration SQL or run `pnpm migrate` / `prisma migrate dev`.** Edit Prisma files and run `pnpm generate` + `pnpm --dir packages/database exec prisma validate` only. The final response to the user MUST state that a migration is required (owner-run).
- DB client: `import db from "@workspace/database/client"` (default export).
- Admin-gated procedures use `adminProcedure` from `@/trpc/init`; public use `baseProcedure`.
- Web tests run under Vitest globals + happy-dom; `@` resolves to `apps/web` root. Mock `@workspace/database/client` as `{ default: client }` where `client.$extends = () => client`, and mock `@workspace/auth/better-auth/auth` to avoid its module-level `db.$extends()`.
- Invite links point to `${NEXT_PUBLIC_URL}/sign-up?invite=<token>&email=<email>`.
- Invites default to the `user` role. Invite expiry = 7 days.
- Registration mode values: `"OPEN"` | `"INVITE_ONLY"`; stored in `AppSetting` under key `"registration_mode"`; absent row ⇒ `"OPEN"`.

---

### Task 1: Prisma schema — `Invitation`, `AppSetting`, `INVITATION_STATUS`

**Files:**
- Modify: `packages/database/prisma/user.prisma`

**Interfaces:**
- Consumes: nothing.
- Produces: Prisma models `Invitation`, `AppSetting`; enum `INVITATION_STATUS`; `User.sentInvitations` relation. Prisma client types `Invitation`, `AppSetting`, `INVITATION_STATUS`.

- [ ] **Step 1: Add the reverse relation to `User`**

In `model User { ... }`, add alongside the other relation fields (e.g. after `apiKeys ApiKey[]`):

```prisma
    sentInvitations  Invitation[]     @relation("InvitationInvitedBy")
```

- [ ] **Step 2: Add the enum and models at the end of the file**

```prisma
enum INVITATION_STATUS {
    PENDING
    ACCEPTED
    REVOKED

    @@schema("user_schema")
}

model Invitation {
    id          String            @id @default(cuid())
    email       String
    token       String            @unique
    status      INVITATION_STATUS @default(PENDING)
    invitedById String
    expiresAt   DateTime
    acceptedAt  DateTime?

    createdAt   DateTime          @default(now())
    updatedAt   DateTime          @updatedAt

    invitedBy   User              @relation("InvitationInvitedBy", fields: [invitedById], references: [id], onDelete: Cascade)

    @@index([email])
    @@index([status])
    @@schema("user_schema")
}

model AppSetting {
    key       String   @id
    value     String
    updatedAt DateTime @updatedAt

    @@schema("user_schema")
}
```

- [ ] **Step 3: Generate the client**

Run: `pnpm generate`
Expected: completes without error; `Invitation` / `AppSetting` types available.

- [ ] **Step 4: Validate the schema**

Run: `pnpm --dir packages/database exec prisma validate`
Expected: "The schema at ... is valid 🚀"

- [ ] **Step 5: Commit**

```bash
git add packages/database/prisma/user.prisma
git commit -m "feat(db): add Invitation and AppSetting models"
```

---

### Task 2: Registration decision helper (pure, TDD)

**Files:**
- Create: `packages/auth/src/better-auth/registration.ts`
- Test: `packages/auth/src/better-auth/registration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type RegistrationMode = "OPEN" | "INVITE_ONLY"`
  - `interface RegistrationInvite { status: string; expiresAt: Date }`
  - `function isEmailAllowedToRegister(mode: RegistrationMode, invite: RegistrationInvite | null, now: Date): boolean`

- [ ] **Step 1: Write the failing test**

Create `packages/auth/src/better-auth/registration.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isEmailAllowedToRegister } from "./registration";

const now = new Date("2026-08-02T00:00:00Z");
const future = new Date("2026-08-09T00:00:00Z");
const past = new Date("2026-07-30T00:00:00Z");

describe("isEmailAllowedToRegister", () => {
  it("allows anyone when mode is OPEN", () => {
    expect(isEmailAllowedToRegister("OPEN", null, now)).toBe(true);
  });

  it("blocks when INVITE_ONLY and no invite", () => {
    expect(isEmailAllowedToRegister("INVITE_ONLY", null, now)).toBe(false);
  });

  it("allows when INVITE_ONLY and a pending, non-expired invite exists", () => {
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "PENDING", expiresAt: future }, now),
    ).toBe(true);
  });

  it("blocks when INVITE_ONLY and invite is expired", () => {
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "PENDING", expiresAt: past }, now),
    ).toBe(false);
  });

  it("blocks when INVITE_ONLY and invite is not pending", () => {
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "REVOKED", expiresAt: future }, now),
    ).toBe(false);
    expect(
      isEmailAllowedToRegister("INVITE_ONLY", { status: "ACCEPTED", expiresAt: future }, now),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/auth exec vitest run src/better-auth/registration.test.ts`
Expected: FAIL — cannot resolve `./registration`.

- [ ] **Step 3: Write minimal implementation**

Create `packages/auth/src/better-auth/registration.ts`:

```ts
export type RegistrationMode = "OPEN" | "INVITE_ONLY";

export interface RegistrationInvite {
  status: string;
  expiresAt: Date;
}

export function isEmailAllowedToRegister(
  mode: RegistrationMode,
  invite: RegistrationInvite | null,
  now: Date,
): boolean {
  if (mode === "OPEN") return true;
  if (!invite) return false;
  if (invite.status !== "PENDING") return false;
  return invite.expiresAt.getTime() > now.getTime();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --dir packages/auth exec vitest run src/better-auth/registration.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/auth/src/better-auth/registration.ts packages/auth/src/better-auth/registration.test.ts
git commit -m "feat(auth): add isEmailAllowedToRegister decision helper"
```

---

### Task 3: Enforce invite-only + mark accepted in the create hook

**Files:**
- Modify: `packages/auth/src/better-auth/auth.ts:151-165` (the `databaseHooks.user` block)

**Interfaces:**
- Consumes: `isEmailAllowedToRegister`, `RegistrationMode` from `./registration` (Task 2); `db` (already imported).
- Produces: enforced gate; no exported symbols.

- [ ] **Step 1: Import the helper**

At the top of `packages/auth/src/better-auth/auth.ts`, near the other local imports (after the `authCookiePrefix` import):

```ts
import { isEmailAllowedToRegister, type RegistrationMode } from "./registration";
import { APIError } from "better-auth/api";
```

- [ ] **Step 2: Add a helper to read the registration mode**

Immediately after `const appUrl = ...` (around line 34):

```ts
const getRegistrationMode = async (): Promise<RegistrationMode> => {
    const setting = await db.appSetting.findUnique({
        where: { key: "registration_mode" },
    });
    return setting?.value === "INVITE_ONLY" ? "INVITE_ONLY" : "OPEN";
};
```

- [ ] **Step 3: Replace the `databaseHooks.user` block with before + extended after**

Replace the existing block:

```ts
    databaseHooks: {
        user: {
            create: {
                before: async (user: { email: string }) => {
                    const mode = await getRegistrationMode();
                    if (mode === "OPEN") return;
                    const invite = await db.invitation.findFirst({
                        where: { email: user.email, status: "PENDING" },
                        orderBy: { createdAt: "desc" },
                    });
                    const allowed = isEmailAllowedToRegister(
                        mode,
                        invite ? { status: invite.status, expiresAt: invite.expiresAt } : null,
                        new Date(),
                    );
                    if (!allowed) {
                        throw new APIError("FORBIDDEN", {
                            message: "Sign-ups are invite-only. Please use your invitation link.",
                        });
                    }
                },
                after: async (user) => {
                    const userCount = await db.user.count();
                    if (userCount === 1) {
                        await db.user.update({
                            where: { id: user.id },
                            data: { role: "admin" },
                        });
                    }
                    await db.invitation.updateMany({
                        where: { email: user.email, status: "PENDING" },
                        data: { status: "ACCEPTED", acceptedAt: new Date() },
                    });
                },
            },
        },
    },
```

- [ ] **Step 4: Typecheck the auth package and web**

Run: `pnpm --dir apps/web typecheck`
Expected: PASS (no type errors introduced by the hook).

- [ ] **Step 5: Commit**

```bash
git add packages/auth/src/better-auth/auth.ts
git commit -m "feat(auth): enforce invite-only registration in user.create hook"
```

---

### Task 4: Invitation email template + sender

**Files:**
- Create: `packages/email/src/templates/Invitation.tsx`
- Modify: `packages/email/src/resend/index.ts`
- Test: `packages/email/src/templates/templates.test.tsx` (add a case)

**Interfaces:**
- Consumes: nothing.
- Produces: `sendInvitationEmail(email: string, inviteUrl: string, company: string): Promise<...>` exported from `@workspace/email/resend/index`; default-exported `Invitation` component.

- [ ] **Step 1: Write the failing template render test**

Add to `packages/email/src/templates/templates.test.tsx`:

```tsx
import Invitation from "./Invitation";

it("renders the invitation template with the invite link", async () => {
  const html = await render(Invitation({ inviteLink: "https://x.test/sign-up?invite=abc", company: "Acme" }));
  expect(html).toContain("https://x.test/sign-up?invite=abc");
  expect(html).toContain("Acme");
});
```

(If `render` is not already imported in that file, add `import { render } from "@react-email/render";` at the top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir packages/email exec vitest run src/templates/templates.test.tsx`
Expected: FAIL — cannot resolve `./Invitation`.

- [ ] **Step 3: Create the template**

Create `packages/email/src/templates/Invitation.tsx` (mirrors `ResetPassword.tsx`):

```tsx
import React from 'react';
import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
  Tailwind,
  Button,
} from '@react-email/components';

const Invitation = ({ inviteLink, company }: { inviteLink: string; company: string }) => {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans text-gray-800">
          <Container className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
            <Section className="bg-green-500 text-white text-center py-4">
              <Text className="text-xl font-bold">You're invited to {company}</Text>
            </Section>
            <Section className="p-6 text-center">
              <Text className="text-lg mb-4">Hello,</Text>
              <Text className="mb-4">
                You've been invited to join {company}. Click below to create your account:
              </Text>
              <Button
                href={inviteLink}
                className="box-border w-full px-6 py-3 bg-green-500 text-white font-medium rounded-md shadow-md text-center"
              >
                Accept Invitation
              </Button>
              <Text className="mt-6">
                If the button above doesn't work, copy and paste this link into your browser:
              </Text>
              <Text className="mt-2 text-green-500 underline break-all">
                <a href={inviteLink}>{inviteLink}</a>
              </Text>
              <Text className="mt-4 text-gray-600">
                This invitation will expire in 7 days.
              </Text>
            </Section>
            <Section className="bg-gray-50 text-center text-sm p-4">
              <Text className="text-gray-500">
                &copy; 2025 {company}. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Invitation;
```

- [ ] **Step 4: Add the sender**

In `packages/email/src/resend/index.ts`, add the import at the top:

```ts
import Invitation from '../templates/Invitation';
```

And add the function (after `sendResetEmail`):

```ts
export const sendInvitationEmail = async (email: string, inviteUrl: string, company: string) => {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const from = process.env.NEXT_PUBLIC_SUPPORT_MAIL!;
  const subject = `You're invited to ${company}`;
  const html = await render(Invitation({ inviteLink: inviteUrl, company }))
  return resend.emails.send({
    from,
    to: email,
    subject,
    html,
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --dir packages/email exec vitest run src/templates/templates.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/email/src/templates/Invitation.tsx packages/email/src/resend/index.ts packages/email/src/templates/templates.test.tsx
git commit -m "feat(email): add invitation email template and sender"
```

---

### Task 5: `admin` tRPC router — registration mode read/write

**Files:**
- Create: `apps/web/trpc/routers/adminProcedures.ts`
- Modify: `apps/web/trpc/routers/_app.ts`
- Test: `apps/web/trpc/routers/__tests__/admin.test.ts`

**Interfaces:**
- Consumes: `baseProcedure`, `adminProcedure`, `createTRPCRouter` from `@/trpc/init`; `db` default export.
- Produces: `adminRouter` registered as `admin` in `appRouter`, with:
  - `admin.settings.registrationMode` — **public** query → `"OPEN" | "INVITE_ONLY"`.
  - `admin.settings.setRegistrationMode` — admin mutation, input `{ mode: "OPEN" | "INVITE_ONLY" }` → `{ mode }`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/trpc/routers/__tests__/admin.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

const { store } = vi.hoisted(() => ({ store: { value: null as null | { value: string } } }));

vi.mock("@workspace/database/client", () => {
  const appSetting = {
    findUnique: vi.fn(async () => store.value),
    upsert: vi.fn(async ({ create }: any) => {
      store.value = { value: create.value };
      return store.value;
    }),
  };
  const client: any = { appSetting };
  client.$extends = () => client;
  return { default: client };
});

vi.mock("@workspace/email/resend/index", () => ({
  sendInvitationEmail: vi.fn(async () => ({})),
}));

import { adminRouter } from "../adminProcedures";

const adminCtx: any = {
  session: { user: { id: "a1", role: "admin", email: "a@x.test", name: "A" } },
};

beforeEach(() => {
  store.value = null;
  vi.clearAllMocks();
});

describe("admin.settings", () => {
  it("defaults to OPEN when unset", async () => {
    const caller = adminRouter.createCaller({ session: null } as any);
    expect(await caller.settings.registrationMode()).toBe("OPEN");
  });

  it("sets and reads back INVITE_ONLY", async () => {
    const caller = adminRouter.createCaller(adminCtx);
    await caller.settings.setRegistrationMode({ mode: "INVITE_ONLY" });
    expect(await caller.settings.registrationMode()).toBe("INVITE_ONLY");
  });

  it("rejects setRegistrationMode without admin session", async () => {
    const caller = adminRouter.createCaller({ session: null } as any);
    await expect(caller.settings.setRegistrationMode({ mode: "OPEN" })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --dir apps/web exec vitest run trpc/routers/__tests__/admin.test.ts`
Expected: FAIL — cannot resolve `../adminProcedures`.

- [ ] **Step 3: Create the router with the settings sub-router**

Create `apps/web/trpc/routers/adminProcedures.ts`:

```ts
import { z } from "zod";
import db from "@workspace/database/client";
import { createTRPCRouter, baseProcedure, adminProcedure } from "../init";

const settingsRouter = createTRPCRouter({
  registrationMode: baseProcedure.query(async () => {
    const setting = await db.appSetting.findUnique({
      where: { key: "registration_mode" },
    });
    return setting?.value === "INVITE_ONLY" ? "INVITE_ONLY" : "OPEN";
  }),

  setRegistrationMode: adminProcedure
    .input(z.object({ mode: z.enum(["OPEN", "INVITE_ONLY"]) }))
    .mutation(async ({ input }) => {
      await db.appSetting.upsert({
        where: { key: "registration_mode" },
        update: { value: input.mode },
        create: { key: "registration_mode", value: input.mode },
      });
      return { mode: input.mode };
    }),
});

export const adminRouter = createTRPCRouter({
  settings: settingsRouter,
});
```

- [ ] **Step 4: Register it in `_app.ts`**

In `apps/web/trpc/routers/_app.ts`, add the import and entry:

```ts
import { adminRouter } from './adminProcedures';
```
```ts
    apiKey: apiKeyRouter,
    admin: adminRouter,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --dir apps/web exec vitest run trpc/routers/__tests__/admin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/trpc/routers/adminProcedures.ts apps/web/trpc/routers/_app.ts apps/web/trpc/routers/__tests__/admin.test.ts
git commit -m "feat(web): add admin router with registration-mode read/write"
```

---

### Task 6: `admin.invites` procedures — create / list / revoke / resend / validate

**Files:**
- Modify: `apps/web/trpc/routers/adminProcedures.ts`
- Test: `apps/web/trpc/routers/__tests__/admin.test.ts` (extend)

**Interfaces:**
- Consumes: `sendInvitationEmail` from `@workspace/email/resend/index`; `db`; `adminProcedure` / `baseProcedure`.
- Produces on `admin.invites`:
  - `list` — admin query → `Invitation[]` (newest first).
  - `create` — admin mutation, input `{ email: string }` → created `Invitation`. Throws `CONFLICT` if a `User` with that email exists or an active `PENDING` non-expired invite exists.
  - `revoke` — admin mutation, input `{ id: string }` → `{ id }`.
  - `resend` — admin mutation, input `{ id: string }` → updated `Invitation` (only `PENDING`).
  - `validate` — **public** query, input `{ token: string }` → `{ email: string | null; valid: boolean; expired: boolean }`.

- [ ] **Step 1: Extend the test file**

Add to `apps/web/trpc/routers/__tests__/admin.test.ts`. First extend the db mock (replace the `vi.mock("@workspace/database/client", ...)` block with one that also mocks `user` and `invitation`):

```ts
const { store, invites } = vi.hoisted(() => ({
  store: { value: null as null | { value: string } },
  invites: { rows: [] as any[], users: [] as any[] },
}));

vi.mock("@workspace/database/client", () => {
  const appSetting = {
    findUnique: vi.fn(async () => store.value),
    upsert: vi.fn(async ({ create }: any) => {
      store.value = { value: create.value };
      return store.value;
    }),
  };
  const user = {
    findUnique: vi.fn(async ({ where }: any) =>
      invites.users.find((u) => u.email === where.email) ?? null,
    ),
  };
  const invitation = {
    findFirst: vi.fn(async ({ where }: any) =>
      invites.rows.find(
        (r) =>
          (where.email ? r.email === where.email : true) &&
          (where.status ? r.status === where.status : true),
      ) ?? null,
    ),
    findUnique: vi.fn(async ({ where }: any) =>
      invites.rows.find((r) => r.id === where.id || r.token === where.token) ?? null,
    ),
    findMany: vi.fn(async () => invites.rows),
    create: vi.fn(async ({ data }: any) => {
      const row = { id: `i${invites.rows.length + 1}`, acceptedAt: null, createdAt: new Date(), ...data };
      invites.rows.push(row);
      return row;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const row = invites.rows.find((r) => r.id === where.id);
      Object.assign(row, data);
      return row;
    }),
  };
  const client: any = { appSetting, user, invitation };
  client.$extends = () => client;
  return { default: client };
});
```

Then add tests:

```ts
import { sendInvitationEmail } from "@workspace/email/resend/index";

describe("admin.invites", () => {
  beforeEach(() => {
    invites.rows = [];
    invites.users = [];
  });

  it("creates an invite and sends an email", async () => {
    const caller = adminRouter.createCaller(adminCtx);
    const res = await caller.invites.create({ email: "new@x.test" });
    expect(res.email).toBe("new@x.test");
    expect(res.status).toBe("PENDING");
    expect(sendInvitationEmail).toHaveBeenCalledOnce();
  });

  it("rejects inviting an existing user", async () => {
    invites.users.push({ email: "dupe@x.test" });
    const caller = adminRouter.createCaller(adminCtx);
    await expect(caller.invites.create({ email: "dupe@x.test" })).rejects.toThrow();
  });

  it("rejects a duplicate active invite", async () => {
    invites.rows.push({
      id: "i1", email: "again@x.test", status: "PENDING",
      expiresAt: new Date(Date.now() + 86400000), token: "t1",
    });
    const caller = adminRouter.createCaller(adminCtx);
    await expect(caller.invites.create({ email: "again@x.test" })).rejects.toThrow();
  });

  it("revokes an invite", async () => {
    invites.rows.push({ id: "i1", email: "r@x.test", status: "PENDING", token: "t1", expiresAt: new Date() });
    const caller = adminRouter.createCaller(adminCtx);
    await caller.invites.revoke({ id: "i1" });
    expect(invites.rows[0].status).toBe("REVOKED");
  });

  it("validate returns expired=true past expiry", async () => {
    invites.rows.push({
      id: "i1", email: "e@x.test", status: "PENDING", token: "tok",
      expiresAt: new Date(Date.now() - 1000),
    });
    const caller = adminRouter.createCaller({ session: null } as any);
    const res = await caller.invites.validate({ token: "tok" });
    expect(res.valid).toBe(false);
    expect(res.expired).toBe(true);
    expect(res.email).toBe("e@x.test");
  });

  it("validate returns valid=true for a pending, non-expired token", async () => {
    invites.rows.push({
      id: "i1", email: "e@x.test", status: "PENDING", token: "tok",
      expiresAt: new Date(Date.now() + 86400000),
    });
    const caller = adminRouter.createCaller({ session: null } as any);
    const res = await caller.invites.validate({ token: "tok" });
    expect(res.valid).toBe(true);
    expect(res.expired).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `pnpm --dir apps/web exec vitest run trpc/routers/__tests__/admin.test.ts`
Expected: FAIL — `caller.invites` is undefined.

- [ ] **Step 3: Add the invites sub-router**

In `apps/web/trpc/routers/adminProcedures.ts`, add imports at the top:

```ts
import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { sendInvitationEmail } from "@workspace/email/resend/index";
```

Add a helper above `adminRouter`:

```ts
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
const company = process.env.NEXT_PUBLIC_COMPANY_NAME || "Company";

const buildInviteUrl = (token: string, email: string) =>
  `${appUrl}/sign-up?invite=${token}&email=${encodeURIComponent(email)}`;
```

Add the sub-router:

```ts
const invitesRouter = createTRPCRouter({
  list: adminProcedure.query(async () => {
    return db.invitation.findMany({
      orderBy: { createdAt: "desc" },
      include: { invitedBy: { select: { name: true, email: true } } },
    });
  }),

  create: adminProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase().trim();

      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with that email already exists." });
      }

      const activeInvite = await db.invitation.findFirst({
        where: { email, status: "PENDING", expiresAt: { gt: new Date() } },
      });
      if (activeInvite) {
        throw new TRPCError({ code: "CONFLICT", message: "An active invitation already exists for that email." });
      }

      const token = randomBytes(32).toString("hex");
      const invitation = await db.invitation.create({
        data: {
          email,
          token,
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
          invitedById: ctx.session.user.id,
        },
      });

      await sendInvitationEmail(email, buildInviteUrl(token, email), company);
      return invitation;
    }),

  revoke: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await db.invitation.update({ where: { id: input.id }, data: { status: "REVOKED" } });
      return { id: input.id };
    }),

  resend: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.invitation.findUnique({ where: { id: input.id } });
      if (!existing || existing.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending invitations can be resent." });
      }
      const token = randomBytes(32).toString("hex");
      const updated = await db.invitation.update({
        where: { id: input.id },
        data: { token, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
      });
      await sendInvitationEmail(existing.email, buildInviteUrl(token, existing.email), company);
      return updated;
    }),

  validate: baseProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await db.invitation.findUnique({ where: { token: input.token } });
      if (!invite) return { email: null, valid: false, expired: false };
      const expired = invite.expiresAt.getTime() <= Date.now();
      const valid = invite.status === "PENDING" && !expired;
      return { email: invite.email, valid, expired };
    }),
});
```

Then register it on `adminRouter`:

```ts
export const adminRouter = createTRPCRouter({
  settings: settingsRouter,
  invites: invitesRouter,
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --dir apps/web exec vitest run trpc/routers/__tests__/admin.test.ts`
Expected: PASS (all settings + invites tests).

- [ ] **Step 5: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/trpc/routers/adminProcedures.ts apps/web/trpc/routers/__tests__/admin.test.ts
git commit -m "feat(web): add admin invite create/list/revoke/resend/validate procedures"
```

---

### Task 7: Admin UI — registration toggle, invite dialog, invitations table

**Files:**
- Create: `packages/ui/src/components/admin/RegistrationModeToggle.tsx`
- Create: `packages/ui/src/components/admin/InviteUserDialog.tsx`
- Create: `packages/ui/src/components/admin/InvitationsTable.tsx`
- Modify: `apps/web/app/(home)/admin/users/page.tsx`

**Interfaces:**
- Consumes: `trpc.admin.settings.registrationMode` / `setRegistrationMode`, `trpc.admin.invites.list` / `create` / `revoke` / `resend` via `useTRPC()` (TanStack Query).
- Produces: three presentational components (pure props, no data fetching) that the page wires to tRPC:
  - `RegistrationModeToggle({ mode, onChange, disabled }: { mode: "OPEN" | "INVITE_ONLY"; onChange: (m: "OPEN" | "INVITE_ONLY") => void; disabled?: boolean })`
  - `InviteUserDialog({ onInvite, isInviting }: { onInvite: (email: string) => void; isInviting: boolean })`
  - `InvitationsTable({ invitations, onRevoke, onResend }: { invitations: any[]; onRevoke: (id: string) => void; onResend: (id: string) => void })`

Presentational components take props only (matching `UsersTable`); the page owns the tRPC hooks.

- [ ] **Step 1: Create `RegistrationModeToggle`**

`packages/ui/src/components/admin/RegistrationModeToggle.tsx`:

```tsx
"use client";

import React from "react";
import { Button } from "@workspace/ui/components/shadcn/button";

interface Props {
  mode: "OPEN" | "INVITE_ONLY";
  onChange: (mode: "OPEN" | "INVITE_ONLY") => void;
  disabled?: boolean;
}

export function RegistrationModeToggle({ mode, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Registration:</span>
      <div className="inline-flex rounded-md border p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "OPEN" ? "default" : "ghost"}
          disabled={disabled}
          onClick={() => onChange("OPEN")}
        >
          Open
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "INVITE_ONLY" ? "default" : "ghost"}
          disabled={disabled}
          onClick={() => onChange("INVITE_ONLY")}
        >
          Invite only
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `InviteUserDialog`**

`packages/ui/src/components/admin/InviteUserDialog.tsx`:

```tsx
"use client";

import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@workspace/ui/components/shadcn/dialog";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";

interface Props {
  onInvite: (email: string) => void;
  isInviting: boolean;
}

export function InviteUserDialog({ onInvite, isInviting }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");

  const submit = () => {
    if (!email.trim()) return;
    onInvite(email.trim());
    setEmail("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Invite user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a user by email</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isInviting || !email.trim()}>
            {isInviting ? "Sending..." : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

Note: verify `dialog`, `input`, and `label` exist under `packages/ui/src/components/shadcn/`. If any is missing, add it with `pnpm dlx shadcn@latest add dialog input label -c packages/ui` before continuing.

- [ ] **Step 3: Create `InvitationsTable`**

`packages/ui/src/components/admin/InvitationsTable.tsx`:

```tsx
"use client";

import React from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@workspace/ui/components/shadcn/table";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";

interface Props {
  invitations: any[];
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  ACCEPTED: "default",
  REVOKED: "destructive",
};

export function InvitationsTable({ invitations, onRevoke, onResend }: Props) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Invited by</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                No invitations yet.
              </TableCell>
            </TableRow>
          ) : (
            invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.email}</TableCell>
                <TableCell>{inv.invitedBy?.name || inv.invitedBy?.email || "—"}</TableCell>
                <TableCell>{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[inv.status] ?? "secondary"} className="capitalize">
                    {String(inv.status).toLowerCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {inv.status === "PENDING" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => onResend(inv.id)}>Resend</Button>
                      <Button variant="ghost" size="sm" onClick={() => onRevoke(inv.id)}>Revoke</Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Wire the components into the users page**

In `apps/web/app/(home)/admin/users/page.tsx`, add imports:

```tsx
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RegistrationModeToggle } from "@workspace/ui/components/admin/RegistrationModeToggle";
import { InviteUserDialog } from "@workspace/ui/components/admin/InviteUserDialog";
import { InvitationsTable } from "@workspace/ui/components/admin/InvitationsTable";
```

Inside `UserManagementPage`, after the existing hooks, add:

```tsx
    const trpc = useTRPC();
    const qc = useQueryClient();

    const modeQuery = useQuery(trpc.admin.settings.registrationMode.queryOptions());
    const invitesQuery = useQuery(trpc.admin.invites.list.queryOptions(undefined, { enabled: isAdmin }));

    const setMode = useMutation(trpc.admin.settings.setRegistrationMode.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.settings.registrationMode.queryKey() });
            toast.success("Registration mode updated");
        },
        onError: (e: any) => toast.error(e.message || "Failed to update mode"),
    }));

    const createInvite = useMutation(trpc.admin.invites.create.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.invites.list.queryKey() });
            toast.success("Invitation sent");
        },
        onError: (e: any) => toast.error(e.message || "Failed to send invite"),
    }));

    const revokeInvite = useMutation(trpc.admin.invites.revoke.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.invites.list.queryKey() });
            toast.success("Invitation revoked");
        },
        onError: (e: any) => toast.error(e.message || "Failed to revoke"),
    }));

    const resendInvite = useMutation(trpc.admin.invites.resend.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.invites.list.queryKey() });
            toast.success("Invitation resent");
        },
        onError: (e: any) => toast.error(e.message || "Failed to resend"),
    }));
```

Then, in the returned JSX, insert a section between the header `div` and `<UsersTable ... />`:

```tsx
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <RegistrationModeToggle
                    mode={(modeQuery.data as "OPEN" | "INVITE_ONLY") ?? "OPEN"}
                    onChange={(mode) => setMode.mutate({ mode })}
                    disabled={setMode.isPending || modeQuery.isLoading}
                />
                <InviteUserDialog
                    onInvite={(email) => createInvite.mutate({ email })}
                    isInviting={createInvite.isPending}
                />
            </div>

            <div className="mb-10">
                <h2 className="text-xl font-semibold mb-3">Invitations</h2>
                <InvitationsTable
                    invitations={invitesQuery.data ?? []}
                    onRevoke={(id) => revokeInvite.mutate({ id })}
                    onResend={(id) => resendInvite.mutate({ id })}
                />
            </div>
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/src/components/admin/RegistrationModeToggle.tsx packages/ui/src/components/admin/InviteUserDialog.tsx packages/ui/src/components/admin/InvitationsTable.tsx apps/web/app/\(home\)/admin/users/page.tsx
git commit -m "feat(web): admin UI for invites and registration mode"
```

---

### Task 8: Accept flow — invite prefill + invite-only messaging on sign-up

**Files:**
- Modify: `apps/web/app/(auth)/sign-up/page.tsx`

**Interfaces:**
- Consumes: `trpc.admin.invites.validate` (public), `trpc.admin.settings.registrationMode` (public) via `useTRPC()`.
- Produces: sign-up page that prefills/locks the invited email and shows an invite-only notice when appropriate. `RegisterPage` receives a `prefillEmail` prop (see step 2).

- [ ] **Step 1: Read invite params and mode in `RegisterContent`**

In `apps/web/app/(auth)/sign-up/page.tsx`, add imports:

```tsx
import { useTRPC } from '@/trpc/client'
import { useQuery } from '@tanstack/react-query'
```

Inside `RegisterContent`, after `const searchParams = useSearchParams()`:

```tsx
  const inviteToken = searchParams.get('invite') ?? ''
  const invitedEmail = searchParams.get('email') ?? ''

  const trpc = useTRPC()
  const modeQuery = useQuery(trpc.admin.settings.registrationMode.queryOptions())
  const inviteQuery = useQuery(
    trpc.admin.invites.validate.queryOptions(
      { token: inviteToken },
      { enabled: !!inviteToken },
    ),
  )

  const isInviteOnly = modeQuery.data === 'INVITE_ONLY'
  const hasValidInvite = !!inviteQuery.data?.valid
  const blockedByInviteOnly = isInviteOnly && !hasValidInvite
```

- [ ] **Step 2: Pass prefill + block state to `RegisterPage`**

Update the `<RegisterPage ... />` usage. Add these props (keeping existing ones):

```tsx
    <RegisterPage
      showEmail={process.env.NEXT_PUBLIC_AUTH_EMAIL === 'true' && !blockedByInviteOnly}
      showGoogleProvider={process.env.NEXT_PUBLIC_AUTH_GOOGLE === 'true' && !blockedByInviteOnly}
      showGithubProvider={process.env.NEXT_PUBLIC_AUTH_GITHUB === 'true' && !blockedByInviteOnly}
      showLinkedinProvider={process.env.NEXT_PUBLIC_AUTH_LINKEDIN === 'true' && !blockedByInviteOnly}
      prefillEmail={hasValidInvite ? (inviteQuery.data?.email ?? invitedEmail) : ''}
      onEmailSubmit={register}
      onGoogleProviderSubmit={() => loginWithSocials('google')}
      onGithubProviderSubmit={() => loginWithSocials('github')}
      onLinkedinProviderSubmit={() => loginWithSocials('linkedin')}
      onSignInClick={() => router.push('/sign-in')}
      onTermsOfServiceClick={() => router.push('/terms')}
      onPrivacyPolicyClick={() => router.push('/privacy')}
      errorMessage={blockedByInviteOnly ? 'Sign-ups are invite-only. Please use your invitation link.' : urlError}
    />
```

- [ ] **Step 3: Add the `prefillEmail` prop to `RegisterPage`**

Open `packages/ui/src/blocks/auth/RegisterPage.tsx`. Add `prefillEmail?: string` to its props type, and use it as the initial value of the email field (e.g. in the form's `defaultValues.email` or the email input's initial state). If the block uses `react-hook-form`, set `defaultValues: { email: prefillEmail ?? '', ... }`; if it uses local state, initialize `useState(prefillEmail ?? '')`. Read the file first to match its existing form pattern, then make the minimal change.

Verify the exact prop wiring by reading the component before editing — do not assume the form library.

- [ ] **Step 4: Typecheck**

Run: `pnpm --dir apps/web typecheck`
Expected: PASS.

- [ ] **Step 5: Manual verification (documented, run by implementer)**

With the dev server running (`pnpm --dir apps/web dev`):
1. As admin, open `/admin/users`, switch Registration to **Invite only**.
2. Open `/sign-up` in a logged-out browser → email/social forms hidden, "invite-only" notice shown.
3. Invite `you+test@example.com`; open the invite link from the email (or DB `token`) → `/sign-up?invite=...&email=...` shows the form with the email prefilled.
4. Complete sign-up → account is created; the invitation row flips to `ACCEPTED`.
5. Switch back to **Open** → `/sign-up` shows the normal forms again.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(auth\)/sign-up/page.tsx packages/ui/src/blocks/auth/RegisterPage.tsx
git commit -m "feat(web): invite prefill and invite-only notice on sign-up"
```

---

## Final Verification

- [ ] `pnpm --dir apps/web typecheck` — PASS
- [ ] `pnpm --dir apps/web test` — PASS
- [ ] `pnpm --dir packages/auth exec vitest run` — PASS
- [ ] `pnpm --dir packages/email exec vitest run` — PASS
- [ ] Final response to the user notes: **a Prisma migration is required** for `Invitation` + `AppSetting` (owner runs `pnpm migrate`). Until then, the feature's DB reads/writes will fail at runtime.

## Notes / Follow-ups (not in scope)

- If the shadcn `dialog`, `input`, or `label` components are missing from `packages/ui`, add them (Task 7, Step 2).
- Social sign-up in invite-only mode is enforced by email match in the create hook; there is no per-invite role selection (all invited users are `user`).

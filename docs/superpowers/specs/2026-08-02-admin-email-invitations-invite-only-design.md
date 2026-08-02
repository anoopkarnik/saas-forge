# Admin Email Invitations + Invite-Only Registration — Design

**Date:** 2026-08-02
**Status:** Approved, ready for planning
**Surface:** Admin → User Management (`/admin/users`)

## Problem

Admins can currently view and manage existing users (`listUsers`, `setRole`,
`banUser`, `removeUser` via the Better Auth `admin` plugin) but cannot:

1. Invite new people by email.
2. Restrict who may create an account. Sign-up is open to anyone today
   (email/password + social), with no way to switch the app to invite-only.

## Goals

- Admin can send an email invitation from the User Management page.
- The invitee receives a link; **the account is created only when they accept**
  and set their own password (or complete social sign-up with the invited email).
- Admin can flip a persisted **registration mode** toggle: `OPEN` ↔ `INVITE_ONLY`.
- In `INVITE_ONLY` mode, **all** new signups (email/password *and* social) are
  blocked unless the email matches a pending, non-expired invitation.
- Admin can see outstanding invitations, **revoke** them, and **resend** them.
- Invitations **expire** after 7 days.

## Non-Goals

- No per-invite role selection. All invited accounts default to the `user` role.
- No bulk/CSV invites.
- No organization/team scoping (this is app-wide, single-tenant behavior).
- No changes to how existing users are managed.

## Decisions

- **Invite model:** invitation-link with account-on-accept (not admin-creates-now).
- **Enforcement point:** Better Auth `databaseHooks.user.create.before` — a single
  gate covering every sign-up path (email, social, mobile, desktop).
- **Enforcement key:** the invitee's **email**, not the token. Social logins never
  carry our token, so email match is the only workable gate for them. The token is
  used by the accept page for UX only (validate link + prefill email). Email/password
  sign-up still requires email verification, so a guessed-email imposter cannot
  complete sign-up.
- **Setting storage:** a small key/value `AppSetting` table (not a bespoke singleton
  config model). It is the minimal reusable home for `registration_mode` and any
  future admin toggle.

## Data Model — `packages/database/prisma/user.prisma`

### `Invitation`

| field | type | notes |
|---|---|---|
| `id` | `String` `@id @default(cuid())` | PK |
| `email` | `String` | invitee address; `@@index` |
| `token` | `String` `@unique` | random, embedded in the invite link |
| `status` | `INVITATION_STATUS` `@default(PENDING)` | lifecycle |
| `invitedById` | `String` | FK → `User.id` |
| `invitedBy` | `User` relation | `onDelete: Cascade` (matches sibling models like `ApiKey`) |
| `expiresAt` | `DateTime` | now + 7 days at creation/resend |
| `acceptedAt` | `DateTime?` | set on accept |
| `createdAt` | `DateTime` `@default(now())` | |
| `updatedAt` | `DateTime` `@updatedAt` | |

Schema annotation: `@@schema("user_schema")` to match sibling models.

```prisma
enum INVITATION_STATUS {
  PENDING
  ACCEPTED
  REVOKED

  @@schema("user_schema")
}
```

- "One active invite per email" is **not** a DB constraint (Prisma can't express a
  partial unique index cleanly here). Enforced in application code in
  `invites.create`.
- No `role` column: the `user.create.after` hook already defaults new users to
  `user`, which is exactly the invited role.

### `AppSetting`

```prisma
model AppSetting {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt

  @@schema("user_schema")
}
```

- Registration mode row: `key = "registration_mode"`, `value ∈ {"OPEN","INVITE_ONLY"}`.
- Absent row is treated as `OPEN` (backward-compatible default).

> **Migration:** This is a schema change. Per repo policy, edit the Prisma files and
> run `pnpm generate` / `prisma validate` only. **Do not** create the migration SQL
> or run `pnpm migrate` — the project owner runs migrations. The final response must
> flag that a migration is required.

## Enforcement — `packages/auth/src/better-auth/auth.ts`

Extend the existing `databaseHooks.user.create`:

- **`before(user)`**:
  1. Read `registration_mode` from `AppSetting` (default `OPEN`).
  2. If `INVITE_ONLY`: find a `PENDING` invitation for `user.email` with
     `expiresAt > now`. If none, throw `APIError` (FORBIDDEN) to abort creation.
  3. If `OPEN`: allow.
- **`after(user)`**:
  1. Keep existing "first user becomes admin" logic.
  2. Mark any matching `PENDING` invitation for `user.email` as `ACCEPTED`
     (`acceptedAt = now`).

Extract the pure decision (`isEmailAllowedToRegister(mode, invitation, now)`) into a
testable helper so the branching logic is unit-tested without a live DB.

## Server API — `apps/web/trpc/routers/adminProcedures.ts`

New router registered in `_app.ts` as `admin`. All admin-gated via the existing
`adminProcedure`, except `validate` which is public (`baseProcedure`).

| procedure | kind | input | behavior |
|---|---|---|---|
| `invites.list` | admin query | — | outstanding + recent invitations (newest first) |
| `invites.create` | admin mutation | `{ email }` | reject if a `User` with that email exists or an active `PENDING` non-expired invite exists; else create (token, expiry = now+7d) and `sendInvitationEmail` |
| `invites.revoke` | admin mutation | `{ id }` | set status `REVOKED` |
| `invites.resend` | admin mutation | `{ id }` | regenerate token + expiry, re-send email (only for `PENDING`) |
| `settings.getRegistrationMode` | admin query | — | `"OPEN" \| "INVITE_ONLY"` |
| `settings.setRegistrationMode` | admin mutation | `{ mode }` | upsert `AppSetting` |
| `invites.validate` | **public** query | `{ token }` | `{ email, valid, expired }` for the accept page |

Input validation with `zod` (email format on create). Email send failures surface as
a tRPC error so the admin sees the invite didn't go out.

## Email — `packages/email`

- New `src/templates/Invitation.tsx` React Email template (mirrors
  `EmailVerification.tsx` / `ResetPassword.tsx`).
- New `sendInvitationEmail(email, inviteUrl, company)` in `src/resend/index.ts`.
- Invite URL: `${NEXT_PUBLIC_URL}/sign-up?invite=<token>&email=<email>`.

## Frontend

### `/admin/users` page (`apps/web/app/(home)/admin/users/page.tsx`)

Add above the existing `UsersTable`:

- **Registration mode** control — segmented toggle / switch (Open ↔ Invite-only),
  wired to `settings.getRegistrationMode` / `settings.setRegistrationMode`, with a
  toast on change.
- **"Invite user"** button → dialog with an email field → `invites.create`; on
  success, refresh the invitations list and toast.
- **Pending Invitations** table (email, invited-by, sent, expires, status) with
  **Revoke** and **Resend** row actions.

New shared components under `packages/ui/src/components/admin/`
(`InvitationsTable.tsx`, `InviteUserDialog.tsx`, `RegistrationModeToggle.tsx`),
re-exported through `apps/web/components/admin/` — matching how `UsersTable` is
wired today. Data fetching uses tRPC (unlike the existing page's direct
`authClient.admin.*` calls, since invites need server DB + email).

### Accept flow — reuse `/sign-up` (`apps/web/app/(auth)/sign-up/page.tsx`)

- Read `?invite=<token>` and `?email=<email>` from search params.
- Call `invites.validate({ token })`; on valid, prefill and lock the email field and
  show an "You've been invited" state.
- When `registration_mode` is `INVITE_ONLY` and there is no valid invite token, show
  a friendly "Sign-ups are invite-only" message instead of surfacing the raw
  create-hook error. (Needs a public read of registration mode — reuse a public
  procedure or a lightweight settings read.)

No middleware change: `/sign-up` is already a public auth route, so invite links work
for logged-out recipients.

## Testing

- **Router tests** (`apps/web/trpc/routers/__tests__/adminProcedures.test.ts`):
  - `invites.create` rejects existing user and duplicate active invite; succeeds
    otherwise and calls the email sender (mocked).
  - `invites.revoke` / `invites.resend` status transitions.
  - `settings.get/setRegistrationMode` round-trip.
  - `invites.validate` returns `expired: true` past `expiresAt`, `valid: false` for
    revoked/accepted/unknown tokens.
  - Mock `@workspace/email/resend/index` and the DB per existing test patterns.
- **Auth decision helper**: unit-test `isEmailAllowedToRegister`:
  - `OPEN` → always allowed.
  - `INVITE_ONLY` + no invite → blocked.
  - `INVITE_ONLY` + pending non-expired → allowed.
  - `INVITE_ONLY` + expired/revoked/accepted → blocked.

## Verification checklist

- `pnpm generate` and `prisma validate` pass after schema edits.
- `pnpm --dir apps/web typecheck`.
- `pnpm --dir apps/web test`.
- Manual: flip to invite-only, confirm open sign-up is blocked; invite an email,
  accept via the link, confirm the account is created and the invitation flips to
  `ACCEPTED`; confirm revoke/resend/expiry behavior.
- Note in the final response that a Prisma **migration is required** (owner-run).

## Env

No new env vars. Reuses `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_COMPANY_NAME`,
`NEXT_PUBLIC_SUPPORT_MAIL`, `RESEND_API_KEY`.

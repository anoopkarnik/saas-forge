# Multi-Tenancy / Organizations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship organizations (workspaces, members, invitations, 4-role RBAC) in the root app and as the strippable `multi_tenancy` scaffold module priced at 30 credits.

**Architecture:** The Better Auth `organization()` plugin owns tables, invitation lifecycle and permission checks, configured in one file (`packages/auth/src/better-auth/organization.ts`). A single `organization` tRPC router wraps `auth.api.*` for web, desktop, and mobile. `orgProcedure` reads the active org from the DB `Session` row and re-checks membership on every call. Shared host files only import module-owned *slot* files, which the module's `unselected` manifest replaces with stubs.

**Tech Stack:** better-auth 1.5.5 organization plugin, Prisma 6 (multi-file schema), tRPC 11, Next.js App Router, Electron/Vite renderer, Expo, React Email/Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-04-07-01-multi-tenancy-organizations-rbac-design.mdx`

## Global Constraints

- Roles: exactly `owner`, `admin`, `member`, `viewer`; rank `viewer < member < admin < owner`.
- Plugin `invitation` model is renamed `organizationInvitation`; existing `Invitation` model untouched.
- Invitations expire after 7 days.
- Credits/billing stay per-user. Do not touch `billing.prisma` or credit fields.
- Never write migration SQL; never run `pnpm migrate`. Owner runs it.
- `multi_tenancy` price: 30 credits, `implemented: true`, `available: true` (registry, UI constants, mobile constants).
- Every org `auth.api.*` call passes `organizationId` explicitly (never relies on the cookie-cached active org).
- Global `guest` is read-only on org endpoints; global `admin` has no implicit org access.
- Shared host files import slots only; any full-file override of a host file must keep the slot import.
- If you add an env var, add it to the matching `.env.example`. (None expected.)

## Review Focus

1. **Stale cookie-cached session after removal/switch:** a removed member must get `PRECONDITION_FAILED`, not data. Tested in Task 3 (`orgProcedure` reads the DB session row and requires membership).
2. **Inviting with a higher role than your own** (admin inviting an owner): must be `FORBIDDEN`. Tested in Task 4.
3. **Leaving or deleting your last organization:** must be refused with `BAD_REQUEST`. Tested in Task 4.
4. **Slug collisions for personal workspaces** (two users named "Alex"): slug must stay unique. Tested in Task 2 (`buildWorkspaceSlug` suffix).
5. **Module stripped with `ai`/`billing` also unselected:** the scaffold must still `prisma validate` and typecheck. Verified in Task 9 by compiling variants.

---

### Task 1: Prisma schema

**Files:**
- Create: `packages/database/prisma/org.prisma`
- Modify: `packages/database/prisma/user.prisma` (User relations, Session field)
- Modify: `template-overrides/saas-boilerplate/packages/database/prisma/user.prisma` (same edits)

**Interfaces:** Produces Prisma models `organization`, `member`, `organizationInvitation`, and `session.activeOrganizationId`.

- [ ] Write `org.prisma`:

```prisma
model Organization {
    id          String   @id @default(cuid())
    name        String
    slug        String   @unique
    logo        String?
    metadata    String?
    createdAt   DateTime @default(now())

    members     Member[]
    invitations OrganizationInvitation[]

    @@schema("user_schema")
}

model Member {
    id             String       @id @default(cuid())
    organizationId String
    userId         String
    role           String       @default("member")
    createdAt      DateTime     @default(now())

    organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@unique([organizationId, userId])
    @@index([userId])
    @@schema("user_schema")
}

model OrganizationInvitation {
    id             String       @id @default(cuid())
    organizationId String
    email          String
    role           String?
    status         String       @default("pending")
    expiresAt      DateTime
    inviterId      String
    createdAt      DateTime     @default(now())

    organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
    inviter        User         @relation("OrganizationInvitationInviter", fields: [inviterId], references: [id], onDelete: Cascade)

    @@index([organizationId])
    @@index([email])
    @@schema("user_schema")
}
```

- [ ] In both `user.prisma` files, add to `User`: `members Member[]` and `organizationInvitations OrganizationInvitation[] @relation("OrganizationInvitationInviter")`. Add to `Session`: `activeOrganizationId String?`.
- [ ] Run `pnpm generate` and `cd packages/database && npx prisma validate`. Expected: both succeed.

### Task 2: Auth plugin config + email

**Files:**
- Create: `packages/auth/src/better-auth/organization.ts`
- Create: `packages/auth/src/better-auth/organization-helpers.ts` (pure: roles, slug)
- Test: `packages/auth/src/better-auth/organization-helpers.test.ts`
- Modify: `packages/auth/src/better-auth/auth.ts`, `guestGuard.ts`, `guestGuard.test.ts`
- Create: `packages/email/src/resend/organization.ts`, `packages/email/src/templates/OrganizationInvitation.tsx`
- Modify: `packages/email/src/templates/templates.test.tsx`

**Interfaces (produces):**
- `organization-helpers.ts`: `ORG_ROLES = ["owner","admin","member","viewer"] as const`, `type OrgRole`, `ROLE_RANK: Record<OrgRole, number>`, `hasOrgRole(role: string, min: OrgRole): boolean`, `isOrgRole(v: string): v is OrgRole`, `buildWorkspaceSlug(base: string, suffix: string): string`, `personalWorkspaceName(name: string|null|undefined, email: string): string`.
- `organization.ts`: `organizationPlugins: any[]`, `createPersonalOrganization(user: {id,name,email}): Promise<void>`, `getInitialActiveOrganizationId(userId: string): Promise<string|null>`, `hasPendingOrganizationInvite(email: string): Promise<boolean>`.
- `@workspace/email/resend/organization`: `sendOrganizationInvitationEmail({ email, organizationName, inviterName, role, inviteUrl }): Promise<unknown>`.

- [ ] Write failing tests for helpers: `hasOrgRole("admin","member")` true; `hasOrgRole("viewer","member")` false; `hasOrgRole("bogus","viewer")` false; `buildWorkspaceSlug("Alex's Workspace!","a1b2")` → `"alexs-workspace-a1b2"`; empty base → `"workspace-a1b2"`; `personalWorkspaceName(null,"bo@x.io")` → `"bo's Workspace"`.
- [ ] Run `pnpm --dir packages/auth test`. Expected FAIL (module missing).
- [ ] Implement helpers. Re-run: PASS.
- [ ] Implement `organization.ts`: `createAccessControl({...defaultStatements})`; `owner = ac.newRole({...ownerAc.statements})`, `admin = ac.newRole({...adminAc.statements})`, `member = ac.newRole({...memberAc.statements})`, `viewer = ac.newRole({ organization: [], member: [], invitation: [] })`; `organization({ ac, roles:{owner,admin,member,viewer}, creatorRole:"owner", invitationExpiresIn: 7*24*60*60, schema:{ invitation:{ modelName:"organizationInvitation" } }, sendInvitationEmail })`. `createPersonalOrganization` uses `db.$transaction` to create org + owner member, wrapped in try/catch + console.error. `getInitialActiveOrganizationId` → `db.member.findFirst({ where:{userId}, orderBy:{createdAt:"desc"}, select:{organizationId:true} })`. `hasPendingOrganizationInvite` → `db.organizationInvitation.count({ where:{ email, status:"pending", expiresAt:{gt:new Date()} } }) > 0`.
- [ ] Wire `auth.ts`: spread `...organizationPlugins` into `plugins`; in `user.create.before` invite-only branch, allow when `hasPendingOrganizationInvite(email)`; in `user.create.after`, call `await createPersonalOrganization(user)`; add `databaseHooks.session.create.before` returning `{ data: { ...session, activeOrganizationId } }` only when an id is found.
- [ ] Extend `GUEST_BLOCKED_PATHS` with the 10 org write paths; add test `isGuestAccountMutation("/organization/invite-member") === true` and `"/organization/list" === false`.
- [ ] Email template + sender; add a render test asserting org name, inviter, and link appear.
- [ ] Run `pnpm --dir packages/auth test && pnpm --dir packages/email test && pnpm --dir packages/auth typecheck`. Expected PASS.

### Task 3: `orgProcedure` / `orgRoleProcedure`

**Files:**
- Create: `apps/web/trpc/org.ts`
- Test: `apps/web/trpc/routers/__tests__/orgProcedure.test.ts`

**Interfaces:**
- Consumes: `protectedProcedure` from `init.ts`; `hasOrgRole`, `OrgRole` from `@workspace/auth/better-auth/organization-helpers`.
- Produces: `orgProcedure` (ctx gains `org: { id: string; role: OrgRole }`), `orgRoleProcedure(min: OrgRole)`, `getActiveOrganizationId(sessionId: string): Promise<string|null>`.

- [ ] Failing tests (mock `@workspace/database/client` with `session.findUnique`, `member.findUnique`):
  - no `activeOrganizationId` → `PRECONDITION_FAILED`
  - active org but no member row (removed member) → `PRECONDITION_FAILED`
  - member → returns `ctx.org`
  - `orgRoleProcedure("admin")` with `member` → `FORBIDDEN`; with `owner` → ok
  - `viewer` mutation through `orgRoleProcedure("member")` → `FORBIDDEN`
- [ ] Implement:

```ts
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const organizationId = await getActiveOrganizationId(ctx.session.session?.id);
  if (!organizationId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No active organization." });
  const member = await db.member.findUnique({
    where: { organizationId_userId: { organizationId, userId: ctx.session.user.id } },
    select: { role: true },
  });
  if (!member || !isOrgRole(member.role)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "You are not a member of the active organization." });
  return next({ ctx: { ...ctx, org: { id: organizationId, role: member.role } } });
});
export const orgRoleProcedure = (min: OrgRole) => orgProcedure.use(({ ctx, next }) => {
  if (!hasOrgRole(ctx.org.role, min)) throw new TRPCError({ code: "FORBIDDEN", message: `Requires the ${min} role or higher in this organization.` });
  return next();
});
```

- [ ] Run `pnpm --dir apps/web vitest run trpc/routers/__tests__/orgProcedure.test.ts`. Expected PASS.

### Task 4: `organization` router

**Files:**
- Create: `apps/web/trpc/routers/organizationProcedures.ts`
- Test: `apps/web/trpc/routers/__tests__/organizationProcedures.test.ts`
- Modify: `apps/web/trpc/routers/_app.ts` + template override `_app.ts` (add `organization: organizationRouter`)
- Create: `apps/web/trpc/apiRegistry.organization.ts`; Modify: `apps/web/trpc/apiRegistry.ts` + template override (spread `...ORGANIZATION_API_GROUPS`)

**Interfaces:**
- Consumes: Task 3 procedures; `auth.api.{createOrganization,updateOrganization,deleteOrganization,createInvitation,cancelInvitation,acceptInvitation,rejectInvitation,updateMemberRole,removeMember,leaveOrganization,getInvitation}`.
- Produces router `organizationRouter` with procedures: `current`, `create`, `setActive`, `members`, `update`, `invite`, `cancelInvitation`, `updateMemberRole`, `removeMember`, `leave`, `delete`, `getInvitation`, `acceptInvitation`, `rejectInvitation`. Types: `current` → `{ active: {id,name,slug,logo,role}|null, organizations: Array<{id,name,slug,logo,role}>, invitations: Array<{id, organizationName, inviterName, role, expiresAt}> }`. `members` → `{ organization:{id,name,slug}, role, members: Array<{id,userId,name,email,image,role,createdAt}>, invitations: Array<{id,email,role,expiresAt}> }`.

- [ ] Failing tests (mock db + `auth.api`):
  - `current` returns only the user's memberships; `active` null when the session's org is not a membership
  - `setActive` for a non-member org → `FORBIDDEN`; for member → updates session row
  - `members` lists only the active org (filters by `ctx.org.id`)
  - `invite` as `member` → `FORBIDDEN`; as `admin` with role `owner` → `FORBIDDEN`; as `admin` with `member` → calls `auth.api.createInvitation` with `organizationId`
  - `leave` / `delete` when it is the user's only membership → `BAD_REQUEST`
  - `APIError` from `auth.api` maps to a TRPCError carrying the message
  - guest calling `create` → `FORBIDDEN`
- [ ] Implement (helper `callAuth(fn)` maps `APIError` status → TRPC code: 400 `BAD_REQUEST`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, else `INTERNAL_SERVER_ERROR`).
- [ ] Register router in both `_app.ts`; add registry slot; run `apiRegistry.test.ts` + new tests. Expected PASS.

### Task 5: Shared UI components

**Files:** Create in `packages/ui/src/components/organizations/`: `WorkspaceSwitcher.tsx`, `CreateWorkspaceDialog.tsx`, `TeamSettings.tsx`, `types.ts`, `WorkspaceSwitcher.test.tsx`.

**Interfaces (produces):**
- `types.ts`: `OrgSummary {id,name,slug,logo?:string|null,role:string}`, `PendingInvitation {id,organizationName,inviterName,role,expiresAt}`, `TeamMember {id,userId,name,email,image?,role,createdAt}`, `TeamInvitation {id,email,role,expiresAt}`.
- `WorkspaceSwitcher` props: `{ organizations: OrgSummary[]; activeId: string|null; invitations: PendingInvitation[]; onSwitch(id): void; onCreate(name): Promise<void>|void; onManage(): void; onAcceptInvitation(id): void; onDeclineInvitation(id): void; isBusy?: boolean }`.
- `TeamSettings` props: `{ organization:{id,name}; currentRole: string; currentUserId: string; members: TeamMember[]; invitations: TeamInvitation[]; onRename(name); onInvite({email, role}); onCancelInvitation(id); onChangeRole(memberId, role); onRemove(memberId); onLeave(); onDelete(); isBusy?: boolean }`. Controls are hidden or disabled by role (`admin+` manages; `owner` deletes; role options limited to ≤ current role).
- [ ] Test: switcher renders active org name and fires `onSwitch` with id; pending invitation shows Accept.
- [ ] Implement with existing shadcn primitives (`dropdown-menu`, `dialog`, `select`, `input`, `button`, `badge`, `table`/list).
- [ ] Run `pnpm --dir packages/ui test -- organizations`. Expected PASS.

### Task 6: Web wiring

**Files:**
- Create: `apps/web/components/organizations/WorkspaceSlot.tsx`, `apps/web/components/organizations/TeamSettingsPanel.tsx`
- Create: `apps/web/app/(home)/organization/page.tsx`, `apps/web/app/(home)/accept-invitation/[id]/page.tsx`
- Modify: `apps/web/components/home/AppSidebar.tsx`, `template-overrides/.../AppSidebar.tsx`, `scaffold-modules/ai/overrides/unselected/apps/web/components/home/AppSidebar.tsx`: render `<WorkspaceSlot />` below the logo in `SidebarHeader`.

- [ ] `WorkspaceSlot` uses `useTRPC()` + react-query: `current` query; when `active` is null and organizations exist, call `setActive(organizations[0].id)` once; on switch → `setActive`, then `queryClient.invalidateQueries()` + `router.refresh()`; Manage → `router.push("/organization")`; toasts via `sonner`.
- [ ] Pages: `organization/page.tsx` renders `TeamSettingsPanel` (wires `members` query + mutations). `accept-invitation/[id]` uses `getInvitation` and shows Accept/Decline, then `router.push("/")`.
- [ ] Run `pnpm --dir apps/web typecheck`. Expected PASS.

### Task 7: Desktop + mobile

**Files:**
- Modify: `packages/ui/src/components/sidebar/AppSidebar.tsx` (+ `slotWorkspace?: React.ReactNode`, rendered in header), `template-overrides/.../desktop/.../TemplateAppSidebar.tsx` (same prop)
- Create: `apps/desktop/src/renderer/src/components/organizations/WorkspaceSlot.tsx` (desktop `useTRPC` from `../../lib/trpc`; "Manage team" opens a `Dialog` with `TeamSettings`)
- Modify: `apps/desktop/.../home/DashboardRoute.tsx` + template override (`slotWorkspace={<WorkspaceSlot />}`)
- Create: `apps/mobile/lib/organization-api.ts`, `apps/mobile/components/organizations/OrgSelector.tsx`
- Modify: `apps/mobile/app/(home)/settings.tsx` + `scaffold-modules/billing/overrides/unselected/apps/mobile/app/(home)/settings.tsx` (render `<OrgSelector />`)

- [ ] Mobile API mirrors `billing-api.ts`: GET `/api/trpc/organization.current`, POST `/api/trpc/organization.setActive` with JSON body `{ organizationId }`.
- [ ] Run `pnpm --dir apps/desktop typecheck` and `pnpm --dir apps/mobile typecheck` (if present). Expected PASS.

### Task 8: Backfill script

**Files:** Create `packages/database/scripts/backfill-organizations.ts`; Modify `packages/database/package.json` (`"backfill:orgs": "tsx scripts/backfill-organizations.ts"` using the same runner as `seed`).

- [ ] Script: for users with `members: { none: {} }`, create a personal org + owner member (slug from `buildWorkspaceSlug`-equivalent inline logic, since `database` must not depend on `auth`); log the count; idempotent.

### Task 9: Scaffold module + pricing + verification

**Files:**
- Modify: `scaffold-modules/registry.json` (30, implemented true), `packages/ui/src/lib/constants/scaffold-modules.ts`, `apps/mobile/components/downloads/constants.ts`
- Modify: `scaffold-modules/multi_tenancy/manifest.json`
- Create stubs under `scaffold-modules/multi_tenancy/overrides/unselected/...`: auth `organization.ts`, web `WorkspaceSlot.tsx`, desktop `WorkspaceSlot.tsx`, mobile `OrgSelector.tsx`, `apiRegistry.organization.ts`, `user.prisma`, `packages/database/package.json`
- Modify tests that treat `multi_tenancy` as unimplemented: `projectProcedures.test.ts`, `pricing.test.ts`, `scaffoldRoute.test.ts`, `service.test.ts` (switch to `api_keys`/`notifications` as the unimplemented example, assert `multi_tenancy` = 30)

- [ ] Update tests first → run → FAIL; update registry/constants → PASS.
- [ ] Write manifest + stubs.
- [ ] `pnpm template:sync && pnpm template:check-sync`.
- [ ] Variant check: compile `.generated/saas-boilerplate` via `compileScaffoldVariant` for `[]`, `["multi_tenancy"]`, `["multi_tenancy","ai","billing"]`, `["ai","billing"]`; for each run `prisma validate` and grep for imports of removed paths.
- [ ] Final: `pnpm --dir apps/web typecheck && pnpm --dir apps/web test`, `pnpm --dir packages/ui test`, `pnpm --dir packages/auth test`.

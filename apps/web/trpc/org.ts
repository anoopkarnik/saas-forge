import { TRPCError } from '@trpc/server';
import db from '@workspace/database/client';
import {
  hasOrgRole,
  isOrgRole,
  type OrgRole,
} from '@workspace/auth/better-auth/organization-helpers';
import { protectedProcedure } from './init';

// Organization-scoped procedures (multi_tenancy module).
//
// The active org is read from the Session row rather than the session object
// in ctx, because Better Auth's cookie cache can serve a session that is up to
// five minutes stale. Membership is re-checked on every call so a removed
// member loses access immediately.

export async function getActiveOrganizationId(
  sessionId: string | undefined,
): Promise<string | null> {
  if (!sessionId) return null;
  const row = await db.session.findUnique({
    where: { id: sessionId },
    select: { activeOrganizationId: true },
  });
  return row?.activeOrganizationId ?? null;
}

export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const organizationId = await getActiveOrganizationId(ctx.session.session?.id);
  if (!organizationId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'No active organization.',
    });
  }

  const member = await db.member.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: ctx.session.user.id },
    },
    select: { role: true },
  });
  if (!member || !isOrgRole(member.role)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'You are not a member of the active organization.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      org: { id: organizationId, role: member.role as OrgRole },
    },
  });
});

export const orgRoleProcedure = (min: OrgRole) =>
  orgProcedure.use(({ ctx, next }) => {
    if (!hasOrgRole(ctx.org.role, min)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Requires the ${min} role or higher in this organization.`,
      });
    }
    return next();
  });

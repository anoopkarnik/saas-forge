import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import db from '@workspace/database/client';
import { auth } from '@workspace/auth/better-auth/auth';
import {
  buildWorkspaceSlug,
  hasOrgRole,
  ORG_ROLES,
} from '@workspace/auth/better-auth/organization-helpers';
import { createTRPCRouter, protectedProcedure } from '../init';
// scaffold:begin notifications
import { notifyInvitedUser } from '@/lib/notifications/notify';
// scaffold:end notifications
import {
  getActiveOrganizationId,
  orgProcedure,
  orgRoleProcedure,
} from '../org';

// Organizations (multi_tenancy module). Writes go through Better Auth's
// organization plugin so its permission checks, invitation lifecycle and
// emails stay authoritative; the guards here are defence in depth and give
// web, desktop and mobile the same tRPC error codes. Every plugin call passes
// organizationId explicitly instead of relying on the cookie-cached session.

const roleSchema = z.enum(ORG_ROLES);

const STATUS_TO_CODE: Record<number, TRPCError['code']> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
};

async function callAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error instanceof TRPCError) throw error;
    const status = Number(error?.statusCode ?? error?.status);
    throw new TRPCError({
      code: STATUS_TO_CODE[status] ?? 'INTERNAL_SERVER_ERROR',
      message: error?.body?.message ?? error?.message ?? 'Organization request failed.',
      cause: error,
    });
  }
}

async function setSessionActiveOrganization(
  sessionId: string,
  organizationId: string | null,
) {
  await db.session.update({
    where: { id: sessionId },
    data: { activeOrganizationId: organizationId },
  });
}

/** After leaving/deleting an org, point the session at the next-newest membership. */
async function activateFallbackOrganization(sessionId: string, userId: string) {
  const next = await db.member.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true },
  });
  await setSessionActiveOrganization(sessionId, next?.organizationId ?? null);
}

async function assertNotLastOrganization(userId: string, action: string) {
  const count = await db.member.count({ where: { userId } });
  if (count <= 1) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `You cannot ${action} your only workspace.`,
    });
  }
}

/** Load a member of the active org, enforcing that admins cannot act on owners. */
async function findManageableMember(
  memberId: string,
  organizationId: string,
  actorRole: string,
) {
  const target = await db.member.findFirst({
    where: { id: memberId, organizationId },
    select: { id: true, role: true, userId: true },
  });
  if (!target) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found.' });
  }
  if (target.role === 'owner' && actorRole !== 'owner') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only owners can manage other owners.',
    });
  }
  return target;
}

export const organizationRouter = createTRPCRouter({
  current: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const [memberships, activeId, invitations] = await Promise.all([
      db.member.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          organization: { select: { id: true, name: true, slug: true, logo: true } },
        },
      }),
      getActiveOrganizationId(ctx.session.session?.id),
      db.organizationInvitation.findMany({
        where: {
          email: ctx.session.user.email.toLowerCase(),
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          role: true,
          expiresAt: true,
          organization: { select: { name: true } },
          inviter: { select: { name: true, email: true } },
        },
      }),
    ]);

    const organizations = memberships.map((m) => ({ ...m.organization, role: m.role }));
    return {
      active: organizations.find((o) => o.id === activeId) ?? null,
      organizations,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        organizationName: inv.organization.name,
        inviterName: inv.inviter.name || inv.inviter.email,
        role: inv.role ?? 'member',
        expiresAt: inv.expiresAt,
      })),
    };
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const organization: any = await callAuth(() =>
        auth.api.createOrganization({
          headers: ctx.headers,
          body: {
            name: input.name,
            slug: buildWorkspaceSlug(input.name, randomBytes(3).toString('hex')),
          },
        }),
      );
      await setSessionActiveOrganization(ctx.session.session.id, organization.id);
      return { id: organization.id as string, name: organization.name as string, slug: organization.slug as string };
    }),

  setActive: protectedProcedure
    .input(z.object({ organizationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const member = await db.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: input.organizationId,
            userId: ctx.session.user.id,
          },
        },
        select: { role: true },
      });
      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of that organization.',
        });
      }
      await setSessionActiveOrganization(ctx.session.session.id, input.organizationId);
      return { organizationId: input.organizationId };
    }),

  members: orgProcedure.query(async ({ ctx }) => {
    const canManage = hasOrgRole(ctx.org.role, 'admin');
    const [organization, members, invitations] = await Promise.all([
      db.organization.findUnique({
        where: { id: ctx.org.id },
        select: { id: true, name: true, slug: true },
      }),
      db.member.findMany({
        where: { organizationId: ctx.org.id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          userId: true,
          role: true,
          createdAt: true,
          user: { select: { name: true, email: true, image: true } },
        },
      }),
      canManage
        ? db.organizationInvitation.findMany({
            where: { organizationId: ctx.org.id, status: 'pending' },
            orderBy: { createdAt: 'desc' },
            select: { id: true, email: true, role: true, expiresAt: true },
          })
        : Promise.resolve([]),
    ]);

    return {
      organization,
      role: ctx.org.role,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        createdAt: m.createdAt,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
      })),
      invitations: invitations.map((inv) => ({ ...inv, role: inv.role ?? 'member' })),
    };
  }),

  update: orgRoleProcedure('admin')
    .input(z.object({ name: z.string().trim().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      await callAuth(() =>
        auth.api.updateOrganization({
          headers: ctx.headers,
          body: { organizationId: ctx.org.id, data: { name: input.name } },
        }),
      );
      return { success: true };
    }),

  invite: orgRoleProcedure('admin')
    .input(z.object({ email: z.string().trim().email(), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      if (!hasOrgRole(ctx.org.role, input.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot invite someone with a higher role than your own.',
        });
      }
      const invitation: any = await callAuth(() =>
        auth.api.createInvitation({
          headers: ctx.headers,
          body: {
            email: input.email.toLowerCase(),
            role: input.role,
            organizationId: ctx.org.id,
          },
        }),
      );
      // scaffold:begin notifications
      if (invitation?.id) {
        await notifyInvitedUser({
          email: input.email,
          organizationId: ctx.org.id,
          inviterName: ctx.session.user.name || ctx.session.user.email,
          invitationId: invitation.id,
        });
      }
      // scaffold:end notifications
      return { id: invitation?.id as string };
    }),

  cancelInvitation: orgRoleProcedure('admin')
    .input(z.object({ invitationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const invitation = await db.organizationInvitation.findUnique({
        where: { id: input.invitationId },
        select: { organizationId: true },
      });
      if (invitation?.organizationId !== ctx.org.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found.' });
      }
      await callAuth(() =>
        auth.api.cancelInvitation({
          headers: ctx.headers,
          body: { invitationId: input.invitationId },
        }),
      );
      return { success: true };
    }),

  updateMemberRole: orgRoleProcedure('admin')
    .input(z.object({ memberId: z.string().min(1), role: roleSchema }))
    .mutation(async ({ ctx, input }) => {
      await findManageableMember(input.memberId, ctx.org.id, ctx.org.role);
      if (!hasOrgRole(ctx.org.role, input.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot grant a role higher than your own.',
        });
      }
      await callAuth(() =>
        auth.api.updateMemberRole({
          headers: ctx.headers,
          body: { memberId: input.memberId, role: input.role, organizationId: ctx.org.id },
        }),
      );
      return { success: true };
    }),

  removeMember: orgRoleProcedure('admin')
    .input(z.object({ memberId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await findManageableMember(input.memberId, ctx.org.id, ctx.org.role);
      await callAuth(() =>
        auth.api.removeMember({
          headers: ctx.headers,
          body: { memberIdOrEmail: input.memberId, organizationId: ctx.org.id },
        }),
      );
      return { success: true };
    }),

  leave: orgProcedure.mutation(async ({ ctx }) => {
    await assertNotLastOrganization(ctx.session.user.id, 'leave');
    await callAuth(() =>
      auth.api.leaveOrganization({
        headers: ctx.headers,
        body: { organizationId: ctx.org.id },
      }),
    );
    await activateFallbackOrganization(ctx.session.session.id, ctx.session.user.id);
    return { success: true };
  }),

  delete: orgRoleProcedure('owner').mutation(async ({ ctx }) => {
    await assertNotLastOrganization(ctx.session.user.id, 'delete');
    await callAuth(() =>
      auth.api.deleteOrganization({
        headers: ctx.headers,
        body: { organizationId: ctx.org.id },
      }),
    );
    await activateFallbackOrganization(ctx.session.session.id, ctx.session.user.id);
    return { success: true };
  }),

  getInvitation: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const invitation = await db.organizationInvitation.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          organization: { select: { name: true } },
          inviter: { select: { name: true, email: true } },
        },
      });
      // Do not reveal invitations addressed to someone else.
      if (!invitation || invitation.email.toLowerCase() !== ctx.session.user.email.toLowerCase()) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found.' });
      }
      return {
        id: invitation.id,
        organizationName: invitation.organization.name,
        inviterName: invitation.inviter.name || invitation.inviter.email,
        role: invitation.role ?? 'member',
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        expired: invitation.expiresAt.getTime() <= Date.now(),
      };
    }),

  acceptInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result: any = await callAuth(() =>
        auth.api.acceptInvitation({
          headers: ctx.headers,
          body: { invitationId: input.invitationId },
        }),
      );
      const organizationId = result?.invitation?.organizationId as string;
      await setSessionActiveOrganization(ctx.session.session.id, organizationId);
      return { organizationId };
    }),

  rejectInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await callAuth(() =>
        auth.api.rejectInvitation({
          headers: ctx.headers,
          body: { invitationId: input.invitationId },
        }),
      );
      return { success: true };
    }),
});

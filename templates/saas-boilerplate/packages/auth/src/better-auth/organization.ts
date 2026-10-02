// Organizations (multi_tenancy scaffold module).
//
// This is the only file that knows about the Better Auth organization plugin.
// auth.ts spreads `organizationPlugins` and calls the three helpers below; when
// the module is not selected in a scaffold, this file is replaced by a stub that
// exports an empty plugin list and no-op helpers, so auth.ts never changes.
import { randomBytes } from "node:crypto";
import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
    adminAc,
    defaultStatements,
    memberAc,
    ownerAc,
} from "better-auth/plugins/organization/access";
import db from "@workspace/database/client";
import { sendOrganizationInvitationEmail } from "@workspace/email/resend/organization";
import { buildWorkspaceSlug, personalWorkspaceName } from "./organization-helpers";

const INVITATION_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

const ac = createAccessControl({ ...defaultStatements });

// viewer has no org-management permissions at the plugin level; its read-only
// product access is enforced by orgRoleProcedure in apps/web/trpc/org.ts.
const roles = {
    owner: ac.newRole({ ...ownerAc.statements }),
    admin: ac.newRole({ ...adminAc.statements }),
    member: ac.newRole({ ...memberAc.statements }),
    viewer: ac.newRole({ organization: [], member: [], invitation: [] }),
};

type InvitationEmailData = {
    id: string;
    email: string;
    role: string;
    organization: { name: string };
    inviter: { user: { name?: string | null; email: string } };
};

export const sendInvitationEmail = async (data: InvitationEmailData) => {
    const appUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    await sendOrganizationInvitationEmail({
        email: data.email,
        organizationName: data.organization.name,
        inviterName: data.inviter.user.name || data.inviter.user.email,
        role: data.role,
        inviteUrl: `${appUrl}/accept-invitation/${data.id}`,
    });
};

export const organizationPlugins = [
    organization({
        ac,
        roles,
        creatorRole: "owner",
        invitationExpiresIn: INVITATION_EXPIRES_IN_SECONDS,
        schema: {
            invitation: { modelName: "organizationInvitation" },
        },
        sendInvitationEmail: (data: any) => sendInvitationEmail(data),
    }),
];

export async function createPersonalOrganization(user: {
    id: string;
    name?: string | null;
    email: string;
}): Promise<void> {
    try {
        const existing = await db.member.count({ where: { userId: user.id } });
        if (existing > 0) return;

        const name = personalWorkspaceName(user.name, user.email);
        await db.organization.create({
            data: {
                name,
                slug: buildWorkspaceSlug(name, randomBytes(3).toString("hex")),
                members: { create: { userId: user.id, role: "owner" } },
            },
        });
    } catch (error) {
        // Never fail sign-up over this; `backfill:orgs` repairs missing workspaces.
        console.error("Failed to create personal organization for", user.id, error);
    }
}

export async function getInitialActiveOrganizationId(
    userId: string,
): Promise<string | null> {
    const membership = await db.member.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { organizationId: true },
    });
    return membership?.organizationId ?? null;
}

export async function hasPendingOrganizationInvite(email: string): Promise<boolean> {
    const count = await db.organizationInvitation.count({
        where: {
            email: email.toLowerCase(),
            status: "pending",
            expiresAt: { gt: new Date() },
        },
    });
    return count > 0;
}

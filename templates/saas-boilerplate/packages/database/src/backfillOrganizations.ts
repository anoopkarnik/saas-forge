import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

// Gives every user without a membership a personal workspace they own
// (multi_tenancy module). Idempotent: users with any membership are skipped.
// Naming mirrors packages/auth organization-helpers; it is duplicated here
// because @workspace/database must not depend on @workspace/auth.

function workspaceName(name: string | null, email: string) {
  return `${name?.trim() || email.split("@")[0] || "My"}'s Workspace`;
}

function workspaceSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "workspace"}-${randomBytes(3).toString("hex")}`;
}

type BackfillDb = Pick<PrismaClient, "user" | "organization">;

export async function backfillOrganizations(db: BackfillDb): Promise<number> {
  const users = await db.user.findMany({
    where: { members: { none: {} } },
    select: { id: true, name: true, email: true },
  });

  for (const user of users) {
    const name = workspaceName(user.name, user.email);
    await db.organization.create({
      data: {
        name,
        slug: workspaceSlug(name),
        members: { create: { userId: user.id, role: "owner" } },
      },
    });
  }

  return users.length;
}

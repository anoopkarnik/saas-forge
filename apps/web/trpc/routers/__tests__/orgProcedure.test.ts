import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

const { db } = vi.hoisted(() => ({
  db: {
    session: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
  },
}));

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));
vi.mock("@workspace/database/client", () => ({ default: db }));

import { createTRPCRouter } from "../../init";
import { orgProcedure, orgRoleProcedure } from "../../org";

const probe = createTRPCRouter({
  whoami: orgProcedure.query(({ ctx }) => ctx.org),
  adminOnly: orgRoleProcedure("admin").query(({ ctx }) => ctx.org.role),
  write: orgRoleProcedure("member")
    .input(z.object({}).optional())
    .mutation(() => "written"),
});

const ctx = {
  headers: new Headers(),
  session: {
    session: { id: "s1" },
    user: { id: "u1", role: "user", email: "u1@x.io", name: "U" },
  },
} as any;

function activeOrg(id: string | null) {
  db.session.findUnique.mockResolvedValue({ activeOrganizationId: id });
}
function membership(role: string | null) {
  db.member.findUnique.mockResolvedValue(role ? { role } : null);
}

beforeEach(() => vi.clearAllMocks());

describe("orgProcedure", () => {
  it("rejects when the session has no active organization", async () => {
    activeOrg(null);
    await expect(probe.createCaller(ctx).whoami()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("rejects a removed member whose session still points at the org", async () => {
    activeOrg("org1");
    membership(null);
    await expect(probe.createCaller(ctx).whoami()).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });
  });

  it("reads the active org from the session row, not the cookie-cached session", async () => {
    activeOrg("org1");
    membership("member");
    const org = await probe.createCaller(ctx).whoami();

    expect(org).toEqual({ id: "org1", role: "member" });
    expect(db.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1" } }),
    );
    expect(db.member.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId_userId: { organizationId: "org1", userId: "u1" } },
      }),
    );
  });
});

describe("orgRoleProcedure", () => {
  it("forbids a role below the minimum", async () => {
    activeOrg("org1");
    membership("member");
    await expect(probe.createCaller(ctx).adminOnly()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a role above the minimum", async () => {
    activeOrg("org1");
    membership("owner");
    expect(await probe.createCaller(ctx).adminOnly()).toBe("owner");
  });

  it("keeps viewers read-only on member-level writes", async () => {
    activeOrg("org1");
    membership("viewer");
    await expect(probe.createCaller(ctx).write({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

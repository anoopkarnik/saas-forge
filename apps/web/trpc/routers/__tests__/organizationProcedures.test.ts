import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, api } = vi.hoisted(() => ({
  db: {
    session: { findUnique: vi.fn(), update: vi.fn() },
    member: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    organization: { findUnique: vi.fn() },
    organizationInvitation: { findMany: vi.fn(), findUnique: vi.fn() },
  },
  api: {
    getSession: vi.fn(async () => null),
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    createInvitation: vi.fn(),
    cancelInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    rejectInvitation: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    leaveOrganization: vi.fn(),
  },
}));

// scaffold:begin notifications
vi.mock("@/lib/notifications/notify", () => ({ notifyInvitedUser: vi.fn() }));
// scaffold:end notifications
// scaffold:begin audit_log
vi.mock("@/lib/audit/audit", () => ({ audit: vi.fn(async () => undefined), userActor: (userId: string) => ({ type: "user", userId }) }));
// scaffold:end audit_log
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api } }));
vi.mock("@workspace/database/client", () => ({ default: db }));

import { organizationRouter } from "../organizationProcedures";
// scaffold:begin audit_log
import { audit } from "@/lib/audit/audit";
// scaffold:end audit_log

function ctxFor(role = "user") {
  return {
    headers: new Headers({ cookie: "x=1" }),
    session: {
      session: { id: "s1" },
      user: { id: "u1", role, email: "u1@x.io", name: "U" },
    },
  } as any;
}

const caller = (role?: string) => organizationRouter.createCaller(ctxFor(role));

/** Make u1 an active member of org1 with the given role. */
function activeMember(role: string) {
  db.session.findUnique.mockResolvedValue({ activeOrganizationId: "org1" });
  db.member.findUnique.mockImplementation(async ({ where }: any) => {
    if (where.organizationId_userId) return { role };
    return null;
  });
}

beforeEach(() => vi.resetAllMocks());

describe("current", () => {
  it("returns the user's memberships and the active org", async () => {
    db.member.findMany.mockResolvedValue([
      { role: "owner", organization: { id: "org1", name: "A", slug: "a", logo: null } },
      { role: "viewer", organization: { id: "org2", name: "B", slug: "b", logo: null } },
    ]);
    db.session.findUnique.mockResolvedValue({ activeOrganizationId: "org2" });
    db.organizationInvitation.findMany.mockResolvedValue([]);

    const res = await caller().current();

    expect(db.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" } }),
    );
    expect(res.organizations.map((o) => o.id)).toEqual(["org1", "org2"]);
    expect(res.active).toMatchObject({ id: "org2", role: "viewer" });
  });

  it("reports no active org when the session points at an org the user left", async () => {
    db.member.findMany.mockResolvedValue([
      { role: "owner", organization: { id: "org1", name: "A", slug: "a", logo: null } },
    ]);
    db.session.findUnique.mockResolvedValue({ activeOrganizationId: "orgGone" });
    db.organizationInvitation.findMany.mockResolvedValue([]);

    expect((await caller().current()).active).toBeNull();
  });

  it("lists only pending, unexpired invitations for the user's email", async () => {
    db.member.findMany.mockResolvedValue([]);
    db.session.findUnique.mockResolvedValue({ activeOrganizationId: null });
    db.organizationInvitation.findMany.mockResolvedValue([
      {
        id: "inv1",
        role: "member",
        expiresAt: new Date("2030-01-01"),
        organization: { name: "Acme" },
        inviter: { name: "Alex", email: "alex@x.io" },
      },
    ]);

    const res = await caller().current();

    const { where } = db.organizationInvitation.findMany.mock.calls[0]![0];
    expect(where).toMatchObject({ email: "u1@x.io", status: "pending" });
    expect(res.invitations).toEqual([
      expect.objectContaining({ id: "inv1", organizationName: "Acme", inviterName: "Alex" }),
    ]);
  });
});

describe("setActive", () => {
  it("refuses an organization the user does not belong to", async () => {
    db.member.findUnique.mockResolvedValue(null);
    await expect(caller().setActive({ organizationId: "orgX" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.session.update).not.toHaveBeenCalled();
  });

  it("stores the active org on the session row", async () => {
    db.member.findUnique.mockResolvedValue({ role: "member" });
    await caller().setActive({ organizationId: "org2" });
    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { activeOrganizationId: "org2" },
    });
  });
});

describe("create", () => {
  it("creates through Better Auth and makes the new org active", async () => {
    api.createOrganization.mockResolvedValue({ id: "orgNew", name: "Team", slug: "team-abc123" });

    const res = await caller().create({ name: "Team" });

    const args = api.createOrganization.mock.calls[0]![0];
    expect(args.body.name).toBe("Team");
    expect(args.body.slug).toMatch(/^team-[a-f0-9]{6}$/);
    expect(args.headers).toBeInstanceOf(Headers);
    expect(res).toMatchObject({ id: "orgNew" });
    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { activeOrganizationId: "orgNew" },
    });
  });

  it("is blocked for the read-only guest account", async () => {
    await expect(caller("guest").create({ name: "Team" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(api.createOrganization).not.toHaveBeenCalled();
  });
});

describe("members", () => {
  it("lists only the active org's members", async () => {
    activeMember("member");
    db.organization.findUnique.mockResolvedValue({ id: "org1", name: "A", slug: "a" });
    db.member.findMany.mockResolvedValue([
      {
        id: "m1",
        userId: "u1",
        role: "member",
        createdAt: new Date(),
        user: { name: "U", email: "u1@x.io", image: null },
      },
    ]);

    const res = await caller().members();

    expect(db.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org1" } }),
    );
    expect(res.members[0]).toMatchObject({ id: "m1", email: "u1@x.io" });
    // invitations are only visible to admins and owners
    expect(res.invitations).toEqual([]);
    expect(db.organizationInvitation.findMany).not.toHaveBeenCalled();
  });
});

describe("invite", () => {
  it("forbids members from inviting", async () => {
    activeMember("member");
    await expect(
      caller().invite({ email: "new@x.io", role: "member" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("forbids inviting with a role above your own", async () => {
    activeMember("admin");
    await expect(
      caller().invite({ email: "new@x.io", role: "owner" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(api.createInvitation).not.toHaveBeenCalled();
  });

  it("invites into the active org explicitly", async () => {
    activeMember("admin");
    api.createInvitation.mockResolvedValue({ id: "inv1" });

    await caller().invite({ email: "New@X.io", role: "member" });

    expect(api.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { email: "new@x.io", role: "member", organizationId: "org1" },
      }),
    );
  });

  it("surfaces Better Auth errors as tRPC errors with the same message", async () => {
    activeMember("admin");
    api.createInvitation.mockRejectedValue(
      Object.assign(new Error("User is already a member of this organization"), {
        statusCode: 400,
        body: { message: "User is already a member of this organization" },
      }),
    );

    await expect(
      caller().invite({ email: "dup@x.io", role: "member" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "User is already a member of this organization",
    });
  });
});

describe("member management", () => {
  it("does not let an admin change an owner's role", async () => {
    activeMember("admin");
    db.member.findFirst.mockResolvedValue({ id: "m9", role: "owner", userId: "u9" });
    await expect(
      caller().updateMemberRole({ memberId: "m9", role: "member" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(api.updateMemberRole).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND for a member of another org", async () => {
    activeMember("owner");
    db.member.findFirst.mockResolvedValue(null);
    await expect(caller().removeMember({ memberId: "mOther" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(db.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "mOther", organizationId: "org1" } }),
    );
  });

  it("removes a member through Better Auth", async () => {
    activeMember("admin");
    db.member.findFirst.mockResolvedValue({ id: "m2", role: "member", userId: "u2" });
    api.removeMember.mockResolvedValue({});

    await caller().removeMember({ memberId: "m2" });

    expect(api.removeMember).toHaveBeenCalledWith(
      expect.objectContaining({ body: { memberIdOrEmail: "m2", organizationId: "org1" } }),
    );
  });
});

// scaffold:begin audit_log
describe("audit trail", () => {
  it("a role change records exactly one event, scoped to the organization", async () => {
    activeMember("admin");
    db.member.findFirst.mockResolvedValue({ id: "m2", role: "member", userId: "u2" });
    api.updateMemberRole.mockResolvedValue({});

    await caller().updateMemberRole({ memberId: "m2", role: "admin" });

    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      expect.anything(),
      "org.member.role_changed",
      expect.objectContaining({ organizationId: "org1", targetId: "m2", metadata: { role: "admin" } }),
    );
  });

  it("a failed role change records nothing", async () => {
    activeMember("admin");
    db.member.findFirst.mockResolvedValue({ id: "m2", role: "member", userId: "u2" });
    api.updateMemberRole.mockRejectedValue(Object.assign(new Error("nope"), { statusCode: 400 }));

    await expect(caller().updateMemberRole({ memberId: "m2", role: "admin" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(audit).not.toHaveBeenCalled();
  });
});
// scaffold:end audit_log

describe("leave / delete", () => {
  it("refuses to leave the user's only organization", async () => {
    activeMember("member");
    db.member.count.mockResolvedValue(1);
    await expect(caller().leave()).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(api.leaveOrganization).not.toHaveBeenCalled();
  });

  it("refuses to delete the user's only organization", async () => {
    activeMember("owner");
    db.member.count.mockResolvedValue(1);
    await expect(caller().delete()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("only owners may delete", async () => {
    activeMember("admin");
    await expect(caller().delete()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("switches to another workspace after leaving", async () => {
    activeMember("member");
    db.member.count.mockResolvedValue(2);
    api.leaveOrganization.mockResolvedValue({});
    db.member.findFirst.mockResolvedValue({ organizationId: "org2" });

    await caller().leave();

    expect(api.leaveOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ body: { organizationId: "org1" } }),
    );
    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { activeOrganizationId: "org2" },
    });
  });
});

describe("invitations for the signed-in user", () => {
  it("hides an invitation addressed to a different email", async () => {
    db.organizationInvitation.findUnique.mockResolvedValue({
      id: "inv1",
      email: "someone@else.io",
      role: "member",
      status: "pending",
      expiresAt: new Date("2030-01-01"),
      organization: { name: "Acme" },
      inviter: { name: "Alex", email: "alex@x.io" },
    });
    await expect(caller().getInvitation({ id: "inv1" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("accepting makes the invited org active", async () => {
    api.acceptInvitation.mockResolvedValue({
      invitation: { organizationId: "org7" },
      member: { id: "m7" },
    });

    await caller().acceptInvitation({ invitationId: "inv1" });

    expect(db.session.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { activeOrganizationId: "org7" },
    });
  });
});

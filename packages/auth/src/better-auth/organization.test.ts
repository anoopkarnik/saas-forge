import { describe, it, expect, vi, beforeEach } from "vitest";

const { db, sendOrganizationInvitationEmail } = vi.hoisted(() => ({
  db: {
    member: { findFirst: vi.fn(), count: vi.fn() },
    organization: { create: vi.fn() },
    organizationInvitation: { count: vi.fn() },
  },
  sendOrganizationInvitationEmail: vi.fn(),
}));

vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/email/resend/organization", () => ({
  sendOrganizationInvitationEmail,
}));

import {
  createPersonalOrganization,
  getInitialActiveOrganizationId,
  hasPendingOrganizationInvite,
  sendInvitationEmail,
} from "./organization";

beforeEach(() => vi.clearAllMocks());

describe("createPersonalOrganization", () => {
  it("creates a workspace owned by the new user", async () => {
    db.member.count.mockResolvedValue(0);
    db.organization.create.mockResolvedValue({ id: "org1" });

    await createPersonalOrganization({ id: "u1", name: "Alex", email: "alex@x.io" });

    const { data } = db.organization.create.mock.calls[0]![0];
    expect(data.name).toBe("Alex's Workspace");
    expect(data.slug).toMatch(/^alexs-workspace-[a-f0-9]{6}$/);
    expect(data.members).toEqual({ create: { userId: "u1", role: "owner" } });
  });

  it("does nothing when the user already belongs to an organization", async () => {
    db.member.count.mockResolvedValue(1);

    await createPersonalOrganization({ id: "u1", name: "Alex", email: "alex@x.io" });

    expect(db.organization.create).not.toHaveBeenCalled();
  });

  it("never throws, so sign-up cannot fail because of it", async () => {
    db.member.count.mockResolvedValue(0);
    db.organization.create.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      createPersonalOrganization({ id: "u1", name: "Alex", email: "alex@x.io" }),
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("getInitialActiveOrganizationId", () => {
  it("returns the most recently joined organization", async () => {
    db.member.findFirst.mockResolvedValue({ organizationId: "org2" });

    expect(await getInitialActiveOrganizationId("u1")).toBe("org2");
    expect(db.member.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1" }, orderBy: { createdAt: "desc" } }),
    );
  });

  it("returns null when the user has no memberships", async () => {
    db.member.findFirst.mockResolvedValue(null);
    expect(await getInitialActiveOrganizationId("u1")).toBeNull();
  });
});

describe("hasPendingOrganizationInvite", () => {
  it("counts only pending, unexpired invites for the lower-cased email", async () => {
    db.organizationInvitation.count.mockResolvedValue(1);

    expect(await hasPendingOrganizationInvite("Bo@X.io")).toBe(true);
    const { where } = db.organizationInvitation.count.mock.calls[0]![0];
    expect(where.email).toBe("bo@x.io");
    expect(where.status).toBe("pending");
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it("returns false when there is none", async () => {
    db.organizationInvitation.count.mockResolvedValue(0);
    expect(await hasPendingOrganizationInvite("bo@x.io")).toBe(false);
  });
});

describe("sendInvitationEmail", () => {
  it("emails the invitee a link to the accept page", async () => {
    process.env.NEXT_PUBLIC_URL = "https://app.test";

    await sendInvitationEmail({
      id: "inv1",
      email: "bo@x.io",
      role: "admin",
      organization: { name: "Acme Team" },
      inviter: { user: { name: "Alex", email: "alex@x.io" } },
    } as any);

    expect(sendOrganizationInvitationEmail).toHaveBeenCalledWith({
      email: "bo@x.io",
      organizationName: "Acme Team",
      inviterName: "Alex",
      role: "admin",
      inviteUrl: "https://app.test/accept-invitation/inv1",
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

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

vi.mock("@workspace/email/resend/index", () => ({
  sendInvitationEmail: vi.fn(async () => ({})),
}));

import { adminRouter } from "../adminProcedures";
import { sendInvitationEmail } from "@workspace/email/resend/index";

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

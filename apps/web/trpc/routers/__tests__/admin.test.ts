import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: vi.fn(async () => null) } },
}));

const { store } = vi.hoisted(() => ({ store: { value: null as null | { value: string } } }));

vi.mock("@workspace/database/client", () => {
  const appSetting = {
    findUnique: vi.fn(async () => store.value),
    upsert: vi.fn(async ({ create }: any) => {
      store.value = { value: create.value };
      return store.value;
    }),
  };
  const client: any = { appSetting };
  client.$extends = () => client;
  return { default: client };
});

vi.mock("@workspace/email/resend/index", () => ({
  sendInvitationEmail: vi.fn(async () => ({})),
}));

import { adminRouter } from "../adminProcedures";

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

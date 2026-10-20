import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createTRPCRouter, guestReadableAdminProcedure } from "../../init";

// Minimal router on the real guestReadableAdminProcedure so the guard runs.
const probeRouter = createTRPCRouter({
  read: guestReadableAdminProcedure.query(() => "ok"),
  write: guestReadableAdminProcedure.input(z.object({}).optional()).mutation(() => "written"),
});

const ctx = (role: string) =>
  ({ session: { user: { id: "u1", role, email: "u@x.test", name: "U" } } } as any);

describe("guestReadableAdminProcedure", () => {
  it("lets admins read", async () => {
    expect(await probeRouter.createCaller(ctx("admin")).read()).toBe("ok");
  });

  it("lets admins write", async () => {
    expect(await probeRouter.createCaller(ctx("admin")).write({})).toBe("written");
  });

  it("lets guests read", async () => {
    expect(await probeRouter.createCaller(ctx("guest")).read()).toBe("ok");
  });

  it("blocks guest writes (read-only demo)", async () => {
    await expect(
      probeRouter.createCaller(ctx("guest")).write({}),
    ).rejects.toThrow("This is a read-only demo account.");
  });

  it("blocks non-admin users from reading", async () => {
    await expect(
      probeRouter.createCaller(ctx("user")).read(),
    ).rejects.toThrow("Admin access is required");
  });
});

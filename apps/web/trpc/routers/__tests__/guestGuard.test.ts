import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../init";

// A minimal router built on the real protectedProcedure so the guard under test runs.
const probeRouter = createTRPCRouter({
  read: protectedProcedure.query(() => "ok"),
  write: protectedProcedure.input(z.object({}).optional()).mutation(() => "written"),
});

const ctx = (role: string) =>
  ({ session: { user: { id: "u1", role, email: "u@x.test", name: "U" } } } as any);

describe("guest write-guard", () => {
  it("blocks guest mutations with a read-only message", async () => {
    const caller = probeRouter.createCaller(ctx("guest"));
    await expect(caller.write({})).rejects.toThrow("This is a read-only demo account.");
  });

  it("allows guest queries", async () => {
    const caller = probeRouter.createCaller(ctx("guest"));
    expect(await caller.read()).toBe("ok");
  });

  it("allows user mutations", async () => {
    const caller = probeRouter.createCaller(ctx("user"));
    expect(await caller.write({})).toBe("written");
  });

  it("allows admin mutations", async () => {
    const caller = probeRouter.createCaller(ctx("admin"));
    expect(await caller.write({})).toBe("written");
  });
});

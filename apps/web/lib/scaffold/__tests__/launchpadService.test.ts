// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LaunchpadProject, LaunchpadState } from "../launchpad/types";
import type { TRPCContext } from "@/trpc/init";
type StoredProject = LaunchpadProject & { id: string; userId: string };
type StateRow = { projectId: string; state: LaunchpadState };
type FakeClient = {
  projectConfig: {
    findFirst: (input: {
      where: { userId: string; slug?: string; id?: string };
    }) => Promise<StoredProject | null>;
    findMany: (input: {
      where: { userId: string };
    }) => Promise<Array<StoredProject & { launchpad: StateRow | null }>>;
  };
  projectLaunchpad: {
    findUnique: (input: {
      where: { projectId: string };
    }) => Promise<StateRow | null>;
    upsert: (input: {
      where: { projectId: string };
      create: StateRow;
      update: Partial<StateRow>;
    }) => Promise<StateRow>;
  };
  $transaction: (run: (tx: FakeClient) => Promise<unknown>) => Promise<unknown>;
};
const { projects, states, client } = vi.hoisted(() => {
  const projects = new Map<string, StoredProject>();
  const states = new Map<string, StateRow>();
  const client: FakeClient = {
    projectConfig: {
      findFirst: async ({ where }) =>
        [...projects.values()].find(
          (p) =>
            p.userId === where.userId &&
            (where.id ? p.id === where.id : p.slug === where.slug),
        ) ?? null,
      findMany: async ({ where }) =>
        [...projects.values()]
          .filter((p) => p.userId === where.userId)
          .map((p) => ({ ...p, launchpad: states.get(p.id) ?? null })),
    },
    $transaction: async (run) => run(client),
    projectLaunchpad: {
      findUnique: async ({ where }) => states.get(where.projectId) ?? null,
      upsert: async ({ where, create, update }) => {
        const value = { ...(states.get(where.projectId) ?? create), ...update };
        states.set(where.projectId, value);
        return value;
      },
    },
  };
  return { projects, states, client };
});
vi.mock("@workspace/database/client", () => ({ default: client }));
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: { api: { getSession: async () => null } },
}));
import { getLaunchpadPreferences } from "../launchpad/service";
import { launchpadProcedures } from "../launchpad/procedures";
import { createTRPCRouter } from "@/trpc/init";
const router = createTRPCRouter(launchpadProcedures);
const context = (userId = "u1", role = "user") =>
  ({
    headers: new Headers(),
    session: {
      user: { id: userId, role, email: "u@example.com", name: "User" },
    },
  }) as unknown as TRPCContext;
const caller = () => router.createCaller(context());
const report = {
  modules: ["billing"],
  platforms: ["web"],
  checks: [{ group: "services" as const, id: "stripe", status: "ok" as const }],
};

beforeEach(() => {
  projects.clear();
  states.clear();
  projects.set("p1", {
    id: "p1",
    userId: "u1",
    slug: "demo",
    name: "Demo",
    modules: ["billing"],
    platforms: ["web"],
    templateVersion: "2.0.0",
    config: { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe" },
  });
});

describe("Launchpad ownership and persistence", () => {
  it("provides defaults without writing state, then persists shared progress and preferences", async () => {
    expect((await caller().launchpad({ slug: "demo" })).summary.completed).toBe(
      0,
    );
    expect(states.size).toBe(0);
    await caller().completeLaunchpadTask({
      slug: "demo",
      taskId: "local.accounts",
      complete: true,
    });
    await caller().saveLaunchpadPreferences({
      slug: "demo",
      mode: "founder",
      deployment: "docker",
    });
    const journey = await caller().launchpad({ slug: "demo" });
    expect(journey.mode).toBe("founder");
    expect(journey.deployment).toBe("docker");
    expect(journey.tasks.find((t) => t.id === "local.accounts")?.status).toBe(
      "manual",
    );
    expect(projects.get("p1")!.config).toEqual({
      NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe",
    });
  });
  it("rejects another owner's reads and every mutation", async () => {
    const foreign = router.createCaller(context("other"));
    await expect(foreign.launchpad({ slug: "demo" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      foreign.saveLaunchpadPreferences({ slug: "demo", mode: "developer" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      foreign.completeLaunchpadTask({
        slug: "demo",
        taskId: "local.accounts",
        complete: true,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      foreign.importLaunchpadReport({ slug: "demo", scope: "local", report }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(states.size).toBe(0);
  });
  it("requires a session and blocks guest mutations", async () => {
    await expect(
      router
        .createCaller({ headers: new Headers(), session: null })
        .launchpad({ slug: "demo" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      router.createCaller(context("u1", "guest")).completeLaunchpadTask({
        slug: "demo",
        taskId: "local.accounts",
        complete: true,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects invalid imports atomically and preserves a prior pass", async () => {
    await caller().importLaunchpadReport({
      slug: "demo",
      scope: "local",
      report,
    });
    const before = JSON.stringify(states.get("p1"));
    await expect(
      caller().importLaunchpadReport({
        slug: "demo",
        scope: "local",
        report: { ...report, modules: [] },
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(JSON.stringify(states.get("p1"))).toBe(before);
    expect(
      (await caller().launchpad({ slug: "demo" })).tasks.find(
        (t) => t.id === "local.stripe",
      )?.status,
    ).toBe("passed");
  });
  it("uses only the owner's saved preferences for downloaded guides", async () => {
    await caller().saveLaunchpadPreferences({
      slug: "demo",
      mode: "founder",
      deployment: "docker",
    });
    expect(await getLaunchpadPreferences("u1", { slug: "demo" })).toEqual({
      mode: "founder",
      deployment: "docker",
    });
    expect(await getLaunchpadPreferences("u1", { projectId: "p1" })).toEqual({
      mode: "founder",
      deployment: "docker",
    });
    expect(
      await getLaunchpadPreferences("u2", { projectId: "p1" }),
    ).toBeUndefined();
  });
  it("lists current summaries only for the owner, including fresh duplicates", async () => {
    projects.set("other", {
      ...projects.get("p1")!,
      id: "other",
      userId: "u2",
      slug: "private",
    });
    await caller().completeLaunchpadTask({
      slug: "demo",
      taskId: "local.accounts",
      complete: true,
    });
    projects.set("p2", { ...projects.get("p1")!, id: "p2", slug: "copy" });
    const summaries = await caller().launchpadSummaries();
    expect(summaries.map((s) => [s.slug, s.completed])).toEqual([
      ["demo", 1],
      ["copy", 0],
    ]);
  });
  it("resets progress for a new project identity (including duplicated configs)", async () => {
    await caller().completeLaunchpadTask({
      slug: "demo",
      taskId: "local.accounts",
      complete: true,
    });
    projects.set("p2", { ...projects.get("p1")!, id: "p2", slug: "copy" });
    expect((await caller().launchpad({ slug: "copy" })).summary.completed).toBe(
      0,
    );
  });
  it("rejects arbitrary fields before any persistence", async () => {
    await expect(
      caller().importLaunchpadReport({
        slug: "demo",
        scope: "local",
        report: { ...report, token: "secret" } as typeof report,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(states.size).toBe(0);
  });
  it("retries serialization conflicts so concurrent updates do not overwrite progress", async () => {
    const original = client.$transaction;
    let attempts = 0;
    client.$transaction = async (run) => {
      if (++attempts === 1)
        throw Object.assign(new Error("conflict"), { code: "P2034" });
      return run(client);
    };
    try {
      await caller().completeLaunchpadTask({
        slug: "demo",
        taskId: "local.accounts",
        complete: true,
      });
      expect(
        (await caller().launchpad({ slug: "demo" })).summary.completed,
      ).toBe(1);
    } finally {
      client.$transaction = original;
    }
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

// Short-circuit better-auth's module-level db.$extends() call during import.
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () => null),
    },
  },
}));

vi.mock("@workspace/database/client", () => {
  const aiJobRun = {
    create: vi.fn(async () => ({ id: "j1" })),
    findFirst: vi.fn(async () => ({
      id: "j1",
      userId: "u1",
      agentId: "noop",
      status: "PENDING",
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
      result: null,
      errorCode: null,
      errorMessage: null,
    })),
    update: vi.fn(async () => ({})),
  };
  const aiJobEvent = {
    findMany: vi.fn(async () => []),
  };
  const client: any = { aiJobRun, aiJobEvent };
  client.$extends = () => client;
  return { default: client };
});

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({
      hgetall: vi.fn(async () => ({})),
      hset: vi.fn(async () => 1),
    }),
  },
}));

vi.mock("@/lib/backend/client", () => ({
  enqueueJob: vi.fn(async () => {}),
}));

import { aiJobsRouter } from "../aiJobsProcedures";
import { enqueueJob } from "@/lib/backend/client";

const ctx = {
  headers: new Headers(),
  session: { user: { id: "u1", role: "user", email: "u1@example.com", name: "u" } },
} as any;

describe("aiJobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create returns jobId and calls enqueue", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    const res = await caller.create({ agentId: "noop", input: {} });
    expect(res).toEqual({ jobId: "j1" });
    expect(enqueueJob).toHaveBeenCalledOnce();
  });

  it("status returns combined Postgres + Redis data", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    const res = await caller.status({ jobId: "j1" });
    expect(res.id).toBe("j1");
    expect(res.status).toBe("PENDING");
  });
});

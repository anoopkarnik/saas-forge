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
    updateMany: vi.fn(async () => ({ count: 1 })),
  };
  const aiJobEvent = {
    findMany: vi.fn(async () => []),
    findFirst: vi.fn(async () => ({ seq: 0, type: "step", at: new Date() })),
  };
  const client: any = { aiJobRun, aiJobEvent };
  client.$extends = () => client;
  return { default: client };
});

vi.mock("@/lib/ai-jobs/service", () => ({
  dispatchAiJob: vi.fn(async () => {}), cancelAiJob: vi.fn(async () => "cancelled"),
}));
vi.mock("@workspace/jobs/inngest", () => ({ inngest: { send: vi.fn(async () => {}) } }));

import { aiJobsRouter } from "../aiJobsProcedures";
import { cancelAiJob, dispatchAiJob } from "@/lib/ai-jobs/service";
import { inngest } from "@workspace/jobs/inngest";
import db from "@workspace/database/client";

const ctx = {
  headers: new Headers(),
  session: { user: { id: "u1", role: "user", email: "u1@example.com", name: "u" } },
} as any;

describe("aiJobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create returns jobId and dispatches to Inngest", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    const res = await caller.create({ agentId: "noop", input: {} });
    expect(res).toEqual({ jobId: "j1" });
    expect(dispatchAiJob).toHaveBeenCalledWith({ id: "j1", agentId: "noop" });
  });

  it("status returns Postgres status and latest event", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    const res = await caller.status({ jobId: "j1" });
    expect(res.id).toBe("j1");
    expect(res.status).toBe("PENDING");
    expect(res.latest_event).toMatchObject({ seq: 0, type: "step" });
    expect(res.latest_event?.at).toBeTypeOf("string");
  });

  it("cancels atomically and sends an Inngest cancellation event", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    expect(await caller.cancel({ jobId: "j1" })).toEqual({ ok: true });
    expect(cancelAiJob).toHaveBeenCalledWith("j1", "u1");
    expect(inngest.send).toHaveBeenCalledWith({ name: "ai/job.cancelled", data: { jobId: "j1" } });
  });
});

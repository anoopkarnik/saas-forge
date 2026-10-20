// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockWhere = {
  id?: string;
  status?: string | { in: string[] };
  inngestRunId?: string;
  OR?: Array<{ status: string; inngestRunId?: string }>;
  lastHeartbeatAt?: { lt: Date };
};

const { row, send, db } = vi.hoisted(() => {
  const row = {
    id: "j1", userId: "u1", orgId: null, agentId: "noop", input: {},
    status: "PENDING", inngestRunId: null as string | null,
    lastDispatchAt: null as Date | null, createdAt: new Date(),
    lastHeartbeatAt: null as Date | null,
  };
  const document = { status: "INGESTING", chunkCount: 2, byteSize: 10 };
  const send = vi.fn(async () => {});
  const db = {
    aiJobRun: {
      findUnique: vi.fn(async () => ({ ...row })),
      findFirst: vi.fn(async ({ where }: { where: MockWhere }) =>
        row.status === where.status && row.inngestRunId === where.inngestRunId ? { ...row } : null),
      updateMany: vi.fn(async ({ where, data }: { where: MockWhere; data: Record<string, unknown> }) => {
        const statuses = typeof where.status === "object" ? where.status.in : [where.status];
        const runMatches = where.OR
          ? where.OR.some((condition) => condition.status === row.status &&
              (condition.inngestRunId === undefined || condition.inngestRunId === row.inngestRunId))
          : where.inngestRunId === undefined || where.inngestRunId === row.inngestRunId;
        if (where.id !== row.id || (!where.OR && !statuses.includes(row.status)) || !runMatches) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      findMany: vi.fn(async ({ where }: { where: MockWhere }) =>
        where.status === "RUNNING" && row.status === "RUNNING" &&
        row.lastHeartbeatAt && where.lastHeartbeatAt && row.lastHeartbeatAt < where.lastHeartbeatAt.lt
          ? [{ id: row.id }] : []),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { Object.assign(row, data); return { ...row }; }),
    },
    aiDocument: { findUnique: vi.fn(async () => ({ ...document })) },
    aiJobEvent: { createMany: vi.fn(async () => ({ count: 1 })) },
    $transaction: vi.fn(async (callback: (client: typeof db) => Promise<unknown>) => callback(db)),
    $queryRaw: vi.fn(async () => [{ id: row.id }]),
  };
  return { row, document, send, db };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/jobs/inngest", () => ({ inngest: { send } }));

import { appendAiJobEvent, cancelAiJob, claimAiJobRun, completeAiJob, dispatchAiJob, failAiJob, sweepPendingAiJobs } from "../service";

beforeEach(() => {
  row.status = "PENDING";
  row.inngestRunId = null;
  row.lastDispatchAt = null;
  row.lastHeartbeatAt = null;
  row.agentId = "noop";
  send.mockClear();
  db.aiJobRun.updateMany.mockClear();
});

describe("AI job dispatch and ownership", () => {
  it("sends only the job id and records dispatch time", async () => {
    await dispatchAiJob(row);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      name: "ai/agent.requested", data: { jobId: "j1" },
    }));
    expect(row.lastDispatchAt).toBeInstanceOf(Date);
  });

  it("lets the owning Inngest run retry but skips a duplicate run", async () => {
    expect(await claimAiJobRun("j1", "run-a")).toMatchObject({ id: "j1" });
    expect(row.status).toBe("RUNNING");
    expect(await claimAiJobRun("j1", "run-b")).toBeNull();
    expect(await claimAiJobRun("j1", "run-a")).toMatchObject({ id: "j1" });
  });

  it("only records events while the run owns the job, using a stable sequence", async () => {
    await claimAiJobRun("j1", "run-a");
    expect(await appendAiJobEvent("j1", "run-a", 0, "step", { node: "start" })).toBe(true);
    expect(db.aiJobEvent.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [{ jobId: "j1", seq: 0, type: "step", payload: { node: "start" } }],
      skipDuplicates: true,
    }));
    row.status = "CANCELLED";
    expect(await appendAiJobEvent("j1", "run-a", 1, "step", {})).toBe(false);
    expect((await completeAiJob("j1", "run-a", {})).count).toBe(0);
  });

  it("fails abandoned running jobs without touching recently active ones", async () => {
    const now = new Date("2026-10-10T10:00:00.000Z");
    row.status = "RUNNING";
    row.lastHeartbeatAt = new Date("2026-10-10T09:47:00.000Z");
    expect(await sweepPendingAiJobs(now)).toEqual({ sent: 0, failed: 1 });
    expect(row.status).toBe("FAILED");
    row.status = "RUNNING";
    row.lastHeartbeatAt = new Date("2026-10-10T09:59:00.000Z");
    expect(await sweepPendingAiJobs(now)).toEqual({ sent: 0, failed: 0 });
  });

  it("settles a ready document before cancellation", async () => {
    row.status = "RUNNING";
    row.agentId = "rag_ingest";
    db.aiDocument.findUnique.mockResolvedValueOnce({ status: "READY", chunkCount: 2, byteSize: 10 });
    expect(await cancelAiJob("j1", "u1")).toBe("succeeded");
    expect(row.status).toBe("SUCCEEDED");
    expect(db.aiJobRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ result: { document_id: "j1", chunk_count: 2, byte_size: 10 } }),
    }));
  });

  it("locks cancellation before marking ingestion cancelled", async () => {
    row.status = "RUNNING";
    row.agentId = "rag_ingest";
    expect(await cancelAiJob("j1", "u1")).toBe("cancelled");
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(row.status).toBe("CANCELLED");
  });

  it("settles a ready document during stale recovery", async () => {
    row.status = "RUNNING";
    row.agentId = "rag_ingest";
    row.lastHeartbeatAt = new Date("2026-10-10T09:47:00.000Z");
    db.aiDocument.findUnique.mockResolvedValueOnce({ status: "READY", chunkCount: 2, byteSize: 10 });
    expect(await sweepPendingAiJobs(new Date("2026-10-10T10:00:00.000Z"))).toEqual({ sent: 0, failed: 0 });
    expect(row.status).toBe("SUCCEEDED");
  });

  it("does not fail an ingestion that finished after the web call timed out", async () => {
    row.status = "RUNNING";
    row.agentId = "rag_ingest";
    row.inngestRunId = "run-a";
    db.aiDocument.findUnique.mockResolvedValueOnce({ status: "READY", chunkCount: 2, byteSize: 10 });
    expect(await failAiJob("j1", "run-a", "BACKEND_TIMEOUT", "late")).toEqual({ count: 0 });
    expect(row.status).toBe("SUCCEEDED");
  });
});

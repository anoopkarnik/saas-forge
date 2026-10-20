// @vitest-environment node
import { InngestTestEngine } from "@inngest/test";
import { describe, expect, it, vi } from "vitest";

const { claimAiJobRun, appendAiJobEvent, completeAiJob, openAgentStream, runBackendIngestion } = vi.hoisted(() => ({
  claimAiJobRun: vi.fn(async () => ({ id: "j1", userId: "u1", orgId: null, agentId: "noop", input: {} })),
  appendAiJobEvent: vi.fn(async () => true),
  completeAiJob: vi.fn(async () => ({ count: 1 })),
  openAgentStream: vi.fn(async () => new Response(
    "event: step\ndata: {\"node\":\"start\"}\n\nevent: final\ndata: {\"output\":{\"ok\":true}}\n\n",
    { status: 200 },
  )),
  runBackendIngestion: vi.fn(async () => ({ document_id: "j1", chunk_count: 2, byte_size: 10 })),
}));
vi.mock("@/lib/ai-jobs/service", () => ({
  claimAiJobRun, appendAiJobEvent, completeAiJob,
  failAiJob: vi.fn(), sweepPendingAiJobs: vi.fn(),
}));
vi.mock("@/lib/backend/client", () => ({ openAgentStream, runBackendIngestion }));

import { aiJobFunctions } from "../functions";

describe("AI Inngest functions", () => {
  it("runs an agent through the signed backend stream and saves its final result", async () => {
    const fn = aiJobFunctions.find((item) => item.id() === "ai-agent-run")!;
    const { error } = await new InngestTestEngine({ function: fn }).execute({
      events: [{ name: "ai/agent.requested", data: { jobId: "j1" } }],
    });
    expect(error).toBeUndefined();
    expect(openAgentStream).toHaveBeenCalledWith(expect.objectContaining({ agentId: "noop", jobId: "j1" }));
    expect(appendAiJobEvent).toHaveBeenCalledWith("j1", expect.any(String), 0, "step", { node: "start" });
    expect(completeAiJob).toHaveBeenCalledWith("j1", expect.any(String), { output: { ok: true } });
  });

  it("runs ingestion through the signed backend API and saves its result", async () => {
    const fn = aiJobFunctions.find((item) => item.id() === "ai-document-ingest")!;
    const { error } = await new InngestTestEngine({ function: fn }).execute({
      events: [{ name: "ai/ingest.requested", data: { jobId: "j1" } }],
    });
    expect(error).toBeUndefined();
    expect(runBackendIngestion).toHaveBeenCalledWith(expect.objectContaining({ jobId: "j1", userId: "u1" }));
    expect(completeAiJob).toHaveBeenCalledWith("j1", expect.any(String), {
      document_id: "j1", chunk_count: 2, byte_size: 10,
    });
  });
});

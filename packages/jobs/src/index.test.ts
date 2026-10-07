import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
// scaffold:begin jobs
const send = vi.hoisted(() => vi.fn());
vi.mock("inngest", () => ({
  Inngest: class {
    send = send;
  },
}));
// scaffold:end jobs
import { defineJob, enqueue, PermanentJobError, runInline } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("runInline", () => {
  it("retries with doubling waits, then gives up", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("down"));
    const job = defineJob("test.flaky", z.object({}), handler, { retries: 2 });
    const waits: number[] = [];

    await expect(runInline(job, {}, { wait: async (ms) => waits.push(ms) })).rejects.toThrow("down");
    expect(handler).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([200, 400]);
  });

  it("stops at the first success and passes the attempt number", async () => {
    const handler = vi.fn().mockRejectedValueOnce(new Error("blip")).mockResolvedValue(undefined);
    const job = defineJob("test.blip", z.object({}), handler);

    await runInline(job, {}, { wait: async () => {} });
    expect(handler).toHaveBeenLastCalledWith({}, { attempt: 1 });
  });
});

describe("enqueue", () => {
  const handler = vi.fn(async () => {});
  const job = defineJob("test.greet", z.object({ name: z.string() }), handler, { version: 2 });

  it("rejects a payload that does not match the schema", async () => {
    await expect(enqueue(job, { name: 42 } as never)).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  it("runs the job here when no queue is set up", async () => {
    await enqueue(job, { name: "Ada" });
    expect(handler).toHaveBeenCalledWith({ name: "Ada" }, { attempt: 0 });
  });

  // scaffold:begin jobs
  it("sends the job to Inngest when JOBS_DRIVER=inngest", async () => {
    vi.stubEnv("JOBS_DRIVER", "inngest");

    await enqueue(job, { name: "Ada" }, { dedupeKey: "greet:ada" });

    expect(handler).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({
      name: "jobs/test.greet",
      data: { payload: { name: "Ada" }, version: 2 },
      id: "greet:ada",
    });
  });
  // scaffold:end jobs
});

describe("PermanentJobError", () => {
  it("is not retried", async () => {
    const handler = vi.fn().mockRejectedValue(new PermanentJobError("bad config"));
    const job = defineJob("test.permanent", z.object({}), handler, { retries: 3 });
    await expect(runInline(job, {}, { wait: async () => {} })).rejects.toThrow("bad config");
    expect(handler).toHaveBeenCalledOnce();
  });
});

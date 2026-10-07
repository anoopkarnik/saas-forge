// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- loose in-memory Prisma fakes */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// In-memory JobRun and ScheduleRun tables, with ScheduleRun's unique (name, window).
const { db, store } = vi.hoisted(() => {
  const store = { runs: [] as any[], fired: new Map<string, Date>() };
  const db = {
    jobRun: {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `run${store.runs.length + 1}`, status: "dead", createdAt: new Date(), ...data };
        store.runs.push(row);
        return row;
      }),
      findMany: vi.fn(async ({ where }: any) => store.runs.filter((run) => run.status === where.status)),
      findFirst: vi.fn(async ({ where }: any) => store.runs.find((run) => run.id === where.id && run.status === where.status) ?? null),
      update: vi.fn(async ({ where, data }: any) => Object.assign(store.runs.find((run) => run.id === where.id), data)),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const matches = store.runs.filter((run) => run.id === where.id && run.status === where.status);
        matches.forEach((run) => Object.assign(run, data));
        return { count: matches.length };
      }),
    },
    scheduleRun: {
      create: vi.fn(async ({ data }: any) => {
        const key = `${data.name}@${data.window.toISOString()}`;
        if (store.fired.has(key)) throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
        store.fired.set(key, new Date());
      }),
      groupBy: vi.fn(async () => []),
    },
  };
  return { db, store };
});
vi.mock("@workspace/database/client", () => ({ default: db }));
vi.mock("@workspace/auth/better-auth/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

import { NonRetriableError } from "inngest";
import { defineJob, defineSchedule, PermanentJobError } from "@workspace/jobs/index";
import { fireSchedule, onJobFailure, runJobAttempt } from "@/lib/jobs/functions";
import { jobsRouter } from "@/trpc/routers/jobsProcedures";

const admin = jobsRouter.createCaller({
  headers: new Headers(),
  session: { user: { id: "admin1", role: "admin", email: "a@x.test", name: "Admin" } },
} as never);

beforeEach(() => {
  store.runs.length = 0;
  store.fired.clear();
});

describe("jobs module", () => {
  it("dead-letters a job that fails every attempt, shows it to admins, and replays it", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("SMTP down"));
    const job = defineJob("test.notify", z.object({ to: z.string() }), handler, { retries: 2 });
    const event = { id: "evt_1", data: { payload: { to: "ada@example.com" }, version: 1 } };

    // Inngest runs attempts 0..retries, then calls onFailure.
    for (let attempt = 0; attempt <= job.retries; attempt++) {
      await expect(runJobAttempt(job as never, event.data, attempt)).rejects.toThrow("SMTP down");
    }
    await onJobFailure(job as never, event, new Error("SMTP down"));

    const failed = await admin.failed();
    expect(failed).toEqual([expect.objectContaining({ name: "test.notify", attempts: 3, lastError: "SMTP down" })]);

    handler.mockResolvedValue(undefined);
    await admin.replay({ id: failed[0]!.id });
    expect(handler).toHaveBeenLastCalledWith({ to: "ada@example.com" }, { attempt: 0 });
    expect(await admin.failed()).toEqual([]);
    await expect(admin.replay({ id: failed[0]!.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("tells Inngest not to retry a permanent failure", async () => {
    const job = defineJob("test.permanent", z.object({}), async () => {
      throw new PermanentJobError("no client");
    });
    await expect(runJobAttempt(job as never, { payload: {}, version: 1 }, 0)).rejects.toBeInstanceOf(NonRetriableError);
  });

  it("runs a schedule once when the cron fires twice in the same window", async () => {
    const handler = vi.fn(async () => {});
    defineSchedule("test-cleanup", "0 3 * * *", defineJob("test.cleanup", z.object({}), handler));

    expect(await fireSchedule("test-cleanup", new Date("2026-10-07T03:00:05Z"))).toBe(true);
    expect(await fireSchedule("test-cleanup", new Date("2026-10-07T03:00:40Z"))).toBe(false);
    expect(await fireSchedule("test-cleanup", new Date("2026-10-08T03:00:02Z"))).toBe(true);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("keeps the admin surface admin-only", async () => {
    const user = jobsRouter.createCaller({
      headers: new Headers(),
      session: { user: { id: "u1", role: "user", email: "u@x.test", name: "U" } },
    } as never);
    await expect(user.failed()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

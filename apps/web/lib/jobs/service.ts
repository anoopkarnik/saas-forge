import { createHash } from "node:crypto";
import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import { enqueue, getJob, listSchedules } from "@workspace/jobs/index";

/**
 * Dead letters and schedule bookkeeping for the jobs module. Successful runs
 * are not stored here: the Inngest dashboard keeps their history.
 */

export function payloadHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}

export async function recordDeadLetter(input: {
  name: string;
  version: number;
  payload: unknown;
  attempts: number;
  error: string;
  eventId?: string;
}) {
  return db.jobRun.create({
    data: {
      name: input.name,
      version: input.version,
      payload: input.payload as Prisma.InputJsonValue,
      payloadHash: payloadHash(input.payload),
      attempts: input.attempts,
      lastError: input.error.slice(0, 2000),
      eventId: input.eventId,
    },
  });
}

export function listDeadLetters() {
  return db.jobRun.findMany({
    where: { status: "dead" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, name: true, version: true, attempts: true, lastError: true, createdAt: true },
  });
}

export class JobRunNotFoundError extends Error {
  name = "JobRunNotFoundError";
}

/** Queues the failed payload again and marks the run replayed. */
export async function replayJobRun(id: string) {
  const run = await db.jobRun.findFirst({ where: { id, status: "dead" } });
  const job = run ? getJob(run.name) : undefined;
  if (!run || !job) throw new JobRunNotFoundError(`No failed run ${id} to replay.`);
  await enqueue(job, run.payload, { dedupeKey: `replay:${run.id}` });
  await db.jobRun.update({ where: { id }, data: { status: "replayed" } });
  return { id };
}

export async function discardJobRun(id: string) {
  const { count } = await db.jobRun.updateMany({ where: { id, status: "dead" }, data: { status: "discarded" } });
  if (count === 0) throw new JobRunNotFoundError(`No failed run ${id} to discard.`);
  return { id };
}

/**
 * Claims a schedule's firing window; false when that window already fired (a
 * duplicate cron trigger), so the job runs once per window.
 */
export async function claimScheduleWindow(name: string, window: Date): Promise<boolean> {
  try {
    await db.scheduleRun.create({ data: { name, window } });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return false;
    throw error;
  }
}

/** Every registered schedule with its last firing, for the admin page. */
export async function scheduleOverview() {
  const last = await db.scheduleRun.groupBy({ by: ["name"], _max: { firedAt: true } });
  const lastByName = new Map(last.map((row) => [row.name, row._max.firedAt]));
  return listSchedules().map((schedule) => ({ ...schedule, lastFiredAt: lastByName.get(schedule.name) ?? null }));
}

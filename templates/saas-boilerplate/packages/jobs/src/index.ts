import type { z } from "zod";
import type { EnqueueOptions, JobDefinition, Schedule } from "./types";
// scaffold:begin jobs
import { inngestEnabled, sendToInngest } from "./inngest";
// scaffold:end jobs

/**
 * Typed background jobs. Without a queue (tests, development, and projects
 * without the jobs module) `enqueue` runs the job in-process with the same retries.
 */
// scaffold:begin jobs
// With JOBS_DRIVER=inngest it sends the job to Inngest instead (./inngest).
// scaffold:end jobs

export type { EnqueueOptions, JobContext, JobDefinition, Schedule } from "./types";

/** A failure retrying cannot fix (bad config, invalid data): the job stops at once. */
export class PermanentJobError extends Error {
  name = "PermanentJobError";
}

const jobs = new Map<string, JobDefinition<any>>();
const schedules = new Map<string, Schedule>();

export function defineJob<T>(
  name: string,
  schema: z.ZodType<T>,
  handler: JobDefinition<T>["handler"],
  { retries = 3, version = 1 }: { retries?: number; version?: number } = {},
): JobDefinition<T> {
  const job: JobDefinition<T> = { name, schema, handler, retries, version };
  jobs.set(name, job);
  return job;
}

/** Runs `job` with `payload` on `cron`. Schedules need the jobs module to fire. */
export function defineSchedule(name: string, cron: string, job: JobDefinition<any>, payload: unknown = {}): Schedule {
  const schedule = { name, cron, job: job.name, payload };
  schedules.set(name, schedule);
  return schedule;
}

export function getJob(name: string): JobDefinition<any> | undefined {
  return jobs.get(name);
}

export function listJobs(): JobDefinition<any>[] {
  return [...jobs.values()];
}

export function listSchedules(): Schedule[] {
  return [...schedules.values()];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs a job in this process: up to `retries` more attempts, doubling the wait each time. */
export async function runInline<T>(
  job: JobDefinition<T>,
  payload: T,
  { wait = sleep, baseDelayMs = 200 }: { wait?: (ms: number) => Promise<unknown>; baseDelayMs?: number } = {},
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await job.handler(payload, { attempt });
      return;
    } catch (error) {
      if (attempt >= job.retries || error instanceof PermanentJobError) throw error;
      await wait(baseDelayMs * 2 ** attempt);
    }
  }
}

/** Validates the payload, then queues the job (or runs it here; see the module comment). */
export async function enqueue<T>(job: JobDefinition<T>, payload: T, options: EnqueueOptions = {}): Promise<void> {
  const data = job.schema.parse(payload);
  // scaffold:begin jobs
  if (inngestEnabled()) {
    await sendToInngest(job, data, options);
    return;
  }
  // scaffold:end jobs
  await runInline(job, data);
}

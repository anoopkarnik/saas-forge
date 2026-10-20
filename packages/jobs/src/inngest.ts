import { Inngest } from "inngest";
import type { EnqueueOptions, JobDefinition } from "./types";

/**
 * The Inngest side of the jobs module. The client reads INNGEST_EVENT_KEY,
 * INNGEST_SIGNING_KEY, INNGEST_BASE_URL (self-hosted server) and INNGEST_DEV
 * from the environment. Functions are served from /api/inngest (apps/web).
 */
export const inngest = new Inngest({ id: "saas-forge" });

export const jobEvent = (jobName: string) => `jobs/${jobName}`;

export type JobEventData = { payload: unknown; version: number };

export function inngestEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.JOBS_DRIVER === "inngest";
}

export async function sendToInngest<T>(job: JobDefinition<T>, payload: T, options: EnqueueOptions): Promise<void> {
  const data: JobEventData = { payload, version: job.version };
  await inngest.send({
    name: jobEvent(job.name),
    data,
    ...(options.dedupeKey ? { id: options.dedupeKey } : {}),
    ...(options.delayMs ? { ts: Date.now() + options.delayMs } : {}),
  });
}

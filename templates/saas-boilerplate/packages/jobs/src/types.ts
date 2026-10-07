import type { z } from "zod";

export type JobContext = { attempt: number };

export type JobDefinition<T = unknown> = {
  name: string;
  schema: z.ZodType<T>;
  handler: (payload: T, context: JobContext) => Promise<void>;
  /** Retries after the first attempt. */
  retries: number;
  /** Bump when the payload shape changes; handlers get it to read older payloads. */
  version: number;
};

export type Schedule = {
  name: string;
  /** Standard 5-field cron expression, UTC. */
  cron: string;
  job: string;
  payload: unknown;
};

export type EnqueueOptions = {
  /** Run later instead of now. */
  delayMs?: number;
  /** Enqueueing the same key again within 24 hours runs the job once. */
  dedupeKey?: string;
};

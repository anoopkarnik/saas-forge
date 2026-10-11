import "@workspace/email/jobs";
import "@/lib/jobs/cleanup";
// scaffold:begin notifications
import "@/lib/notifications/deliver";
// scaffold:end notifications
// scaffold:begin webhooks
import "@/lib/webhooks/deliver";
// scaffold:end webhooks
import { NonRetriableError } from "inngest";
import { enqueue, getJob, listJobs, listSchedules, PermanentJobError, type JobDefinition } from "@workspace/jobs/index";
import { inngest, jobEvent, type JobEventData } from "@workspace/jobs/inngest";
import { claimScheduleWindow, recordDeadLetter } from "@/lib/jobs/service";
// scaffold:begin ai_agents
import { aiJobFunctions } from "@/lib/ai-jobs/functions";
// scaffold:end ai_agents

/**
 * The Inngest functions served at /api/inngest: one per job (retries come from
 * the job definition; a run that fails every attempt becomes a dead letter on
 * /admin/jobs) and one per cron schedule.
 */

/** One attempt of a job; a permanent failure tells Inngest to stop retrying. */
export async function runJobAttempt(job: JobDefinition<unknown>, data: JobEventData, attempt: number) {
  try {
    await job.handler(job.schema.parse(data.payload), { attempt });
  } catch (error) {
    if (error instanceof PermanentJobError) throw new NonRetriableError(error.message, { cause: error });
    throw error;
  }
}

/** After the last attempt fails: keep the payload as a dead letter for /admin/jobs. */
export async function onJobFailure(
  job: JobDefinition<unknown>,
  failedEvent: { id?: string; data?: unknown },
  error: Error,
) {
  const data = failedEvent.data as JobEventData;
  await recordDeadLetter({
    name: job.name,
    version: data.version,
    payload: data.payload,
    attempts: job.retries + 1,
    error: error.message,
    eventId: failedEvent.id,
  });
}

/** The minute a cron trigger belongs to: two triggers in one minute are the same firing. */
export function scheduleWindow(at: Date): Date {
  return new Date(Math.floor(at.getTime() / 60_000) * 60_000);
}

/** Fires a schedule once per window (duplicate triggers are skipped). Returns whether it ran. */
export async function fireSchedule(name: string, at: Date): Promise<boolean> {
  const schedule = listSchedules().find((entry) => entry.name === name);
  const job = schedule ? getJob(schedule.job) : undefined;
  if (!schedule || !job) throw new Error(`Unknown schedule ${name}`);
  const window = scheduleWindow(at);
  if (!(await claimScheduleWindow(name, window))) return false;
  await enqueue(job, schedule.payload, { dedupeKey: `${name}:${window.toISOString()}` });
  return true;
}

export function jobFunctions() {
  const jobFns = listJobs().map((job) =>
    inngest.createFunction(
      {
        id: job.name,
        // Inngest types retries as the literals 0–20.
        retries: job.retries as 0,
        triggers: { event: jobEvent(job.name) },
        onFailure: ({ event, error }) => onJobFailure(job, event.data.event, error),
      },
      async ({ event, attempt }) => runJobAttempt(job, event.data as JobEventData, attempt),
    ),
  );
  const scheduleFns = listSchedules().map((schedule) =>
    inngest.createFunction(
      { id: `schedule-${schedule.name}`, triggers: { cron: schedule.cron } },
      async () => ({ ran: await fireSchedule(schedule.name, new Date()) }),
    ),
  );
  return [
    ...jobFns,
    ...scheduleFns,
    // scaffold:begin ai_agents
    ...aiJobFunctions,
    // scaffold:end ai_agents
  ];
}

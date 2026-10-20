import { inngest } from "@workspace/jobs/inngest";
import { NonRetriableError } from "inngest";
import { BackendHttpError, openAgentStream, runBackendIngestion } from "@/lib/backend/client";
import {
  appendAiJobEvent, claimAiJobRun, completeAiJob, failAiJob, sweepPendingAiJobs,
} from "@/lib/ai-jobs/service";
import { consumeAgentStream } from "@/lib/ai-jobs/stream";

const cancelOn = [{ event: "ai/job.cancelled", match: "data.jobId" }] as const;
const concurrency = { limit: 2, key: '"ai-jobs"', scope: "env" } as const;
const failure = (error: Error, fallback: string) => ({
  code: error.name === "TimeoutError" || /timeout/i.test(error.message) ? "BACKEND_TIMEOUT" : fallback,
  message: error.name === "TimeoutError" ? "AI backend exceeded the 270-second call limit" : error.message,
});

const agentRun = inngest.createFunction(
  {
    id: "ai-agent-run", retries: 1, concurrency,
    cancelOn: [...cancelOn], triggers: { event: "ai/agent.requested" },
    onFailure: async ({ event, error }) => {
      const failed = event.data.event;
      const { code, message } = failure(error, "AGENT_ERROR");
      await failAiJob(failed.data.jobId, event.data.run_id, code, message);
    },
  },
  async ({ event, runId, step }) => {
    const jobId = event.data.jobId as string;
    const job = await step.run("claim", () => claimAiJobRun(jobId, runId));
    if (!job) return { skipped: true };
    const result = await step.run("execute-agent", async () => {
      const response = await openAgentStream({
        userId: job.userId, orgId: job.orgId, agentId: job.agentId,
        input: job.input as Record<string, unknown>, jobId,
        signal: AbortSignal.timeout(270_000),
      });
      if (response.status >= 400 && response.status < 500) {
        throw new NonRetriableError(`AI backend rejected agent request: ${response.status}`);
      }
      return consumeAgentStream(response, async (type, payload, seq) => {
        await appendAiJobEvent(jobId, runId, seq, type, payload);
      });
    });
    await step.run("complete", () => completeAiJob(jobId, runId, result));
    return result;
  },
);

const ingestRun = inngest.createFunction(
  {
    id: "ai-document-ingest", retries: 1, concurrency,
    cancelOn: [...cancelOn], triggers: { event: "ai/ingest.requested" },
    onFailure: async ({ event, error }) => {
      const failed = event.data.event;
      const { code, message } = failure(error, "INGEST_ERROR");
      await failAiJob(failed.data.jobId, event.data.run_id, code, message);
    },
  },
  async ({ event, runId, step }) => {
    const jobId = event.data.jobId as string;
    const job = await step.run("claim", () => claimAiJobRun(jobId, runId));
    if (!job) return { skipped: true };
    const result = await step.run("execute-ingest", async () => {
      try {
        return await runBackendIngestion({
          jobId, userId: job.userId, orgId: job.orgId,
          input: job.input as Record<string, unknown>, signal: AbortSignal.timeout(270_000),
        });
      } catch (error) {
        if (error instanceof BackendHttpError && error.status >= 400 && error.status < 500) {
          throw new NonRetriableError(error.message);
        }
        throw error;
      }
    });
    await step.run("complete", () => completeAiJob(jobId, runId, result));
    return result;
  },
);

const recoverPending = inngest.createFunction(
  { id: "ai-recover-pending", triggers: { cron: "* * * * *" } },
  async () => sweepPendingAiJobs(),
);

export const aiJobFunctions = [agentRun, ingestRun, recoverPending];

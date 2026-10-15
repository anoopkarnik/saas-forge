import { inngest } from "@workspace/jobs/inngest";
import { NonRetriableError } from "inngest";
import { openAgentStream } from "@/lib/backend/client";
import {
  appendAiJobEvent,
  claimAiJobRun,
  completeAiJob,
  failAiJob,
} from "@/lib/ai-jobs/service";
import { consumeAgentStream } from "@/lib/ai-jobs/stream";
import { validateAgentResult } from "./ai-schema";
import type { SourcePack } from "./types";
import { LAUNCHPAD_AGENT } from "./ai-runtime";

const errorMessage =
  "The guide agent could not finish. Your active checklist is unchanged. Please retry.";
export function normalizeLaunchpadResult(
  value: Record<string, unknown>,
  input: { kind: string; sourcePack: SourcePack },
) {
  if (
    (value.provider !== "nvidia" && value.provider !== "openrouter") ||
    typeof value.model !== "string" ||
    !/^([A-Za-z0-9][A-Za-z0-9._-]*\/)+[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(
      value.model,
    )
  )
    throw new Error("Invalid guide provider.");
  const output = validateAgentResult(
    value.output,
    input.sourcePack,
    input.kind,
  );
  const rawUsage = value.usage as Record<string, unknown> | undefined;
  const usage = Object.fromEntries(
    ["inputTokens", "outputTokens", "totalTokens"].flatMap((name) =>
      Number.isSafeInteger(rawUsage?.[name]) && Number(rawUsage?.[name]) >= 0
        ? [[name, rawUsage![name]]]
        : [],
    ),
  );
  return { output, provider: value.provider, model: value.model, usage };
}

function validateJobResult(
  value: Record<string, unknown>,
  input: { kind: string; sourcePack: SourcePack },
) {
  try {
    return normalizeLaunchpadResult(value, input);
  } catch {
    throw new NonRetriableError(errorMessage);
  }
}

export const launchpadJobFunction = inngest.createFunction(
  {
    id: "launchpad-operation",
    retries: 1,
    concurrency: { limit: 2, key: '"ai-jobs"', scope: "env" },
    cancelOn: [{ event: "ai/job.cancelled", match: "data.jobId" }],
    triggers: { event: "launchpad/operation.requested" },
    onFailure: async ({ event }) =>
      failAiJob(
        event.data.event.data.jobId,
        event.data.run_id,
        "LAUNCHPAD_ERROR",
        errorMessage,
      ),
  },
  async ({ event, runId, step }) => {
    const jobId = event.data.jobId as string;
    const job = await step.run("claim", () => claimAiJobRun(jobId, runId));
    if (!job || job.agentId !== LAUNCHPAD_AGENT) return { skipped: true };
    const input = job.input as unknown as {
      kind: string;
      sourcePack: SourcePack;
    };
    const result = await step.run("guide", async () => {
      const response = await openAgentStream({
        userId: job.userId,
        orgId: null,
        agentId: LAUNCHPAD_AGENT,
        input: job.input as Record<string, unknown>,
        jobId,
        signal: AbortSignal.timeout(200_000),
      });
      if (response.status >= 400 && response.status < 500)
        throw new NonRetriableError(errorMessage);
      try {
        const envelope = await consumeAgentStream(
          response,
          async (type, payload, seq) => {
            if (type === "final")
              await appendAiJobEvent(
                jobId,
                runId,
                seq,
                type,
                validateJobResult(payload, input),
              );
            else if (type === "step")
              await appendAiJobEvent(jobId, runId, seq, type, {
                node: "guidance",
                status: payload.status === "end" ? "end" : "start",
              });
          },
        );
        return validateJobResult(envelope, input);
      } catch (error) {
        if (error instanceof NonRetriableError) throw error;
        if (
          error instanceof Error &&
          error.message ===
            "Launchpad could not produce a safe response. Please request a new draft."
        )
          throw new NonRetriableError(errorMessage);
        throw new Error(errorMessage);
      }
    });
    await step.run("complete", () => completeAiJob(jobId, runId, result));
    return { jobId };
  },
);

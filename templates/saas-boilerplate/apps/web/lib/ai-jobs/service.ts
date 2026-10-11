import type { Prisma } from "@workspace/database/prisma";
import { randomUUID } from "node:crypto";
import db from "@workspace/database/client";
import { inngest } from "@workspace/jobs/inngest";

export type DispatchableAiJob = { id: string; agentId: string };

const eventName = (agentId: string) =>
  agentId === "rag_ingest" ? "ai/ingest.requested" : "ai/agent.requested";

export async function dispatchAiJob(job: DispatchableAiJob): Promise<void> {
  // Every send has a fresh event id. A timed-out send may still have landed;
  // the atomic run claim makes an extra delivery harmless.
  try {
    await inngest.send({
      id: `${job.id}:${randomUUID()}`,
      name: eventName(job.agentId),
      data: { jobId: job.id },
    });
  } finally {
    await db.aiJobRun.updateMany({
      where: { id: job.id, status: "PENDING" },
      data: { lastDispatchAt: new Date() },
    });
  }
}

export async function claimAiJobRun(jobId: string, runId: string) {
  const { count } = await db.aiJobRun.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: "PENDING" },
        { status: "RUNNING", inngestRunId: runId },
      ],
    },
    data: { status: "RUNNING", inngestRunId: runId, startedAt: new Date(), lastHeartbeatAt: new Date() },
  });
  if (!count) return null;
  return db.aiJobRun.findFirst({ where: { id: jobId, status: "RUNNING", inngestRunId: runId } });
}

export async function appendAiJobEvent(
  jobId: string, runId: string, seq: number, type: string, payload: Record<string, unknown>,
) {
  return db.$transaction(async (tx) => {
    const owner = await tx.aiJobRun.updateMany({
      where: { id: jobId, status: "RUNNING", inngestRunId: runId },
      data: { lastHeartbeatAt: new Date() },
    });
    if (!owner.count) return false;
    await tx.aiJobEvent.createMany({
      data: [{ jobId, seq, type, payload: payload as Prisma.InputJsonValue }],
      skipDuplicates: true,
    });
    return true;
  });
}

export async function completeAiJob(jobId: string, runId: string, result: Record<string, unknown>) {
  return db.aiJobRun.updateMany({
    where: { id: jobId, status: "RUNNING", inngestRunId: runId },
    data: { status: "SUCCEEDED", result: result as Prisma.InputJsonValue, finishedAt: new Date() },
  });
}

export async function failAiJob(jobId: string, runId: string, code: string, message: string) {
  return db.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    if (job?.status !== "RUNNING" || job.inngestRunId !== runId) return { count: 0 };
    const now = new Date();
    if (job.agentId === "rag_ingest" && await finishReadyIngestion(tx, jobId, now)) return { count: 0 };
    await tx.aiJobRun.update({
      where: { id: jobId },
      data: { status: "FAILED", errorCode: code, errorMessage: message.slice(0, 2000), finishedAt: now },
    });
    return { count: 1 };
  });
}

type JobTransition = "missing" | "terminal" | "cancelled" | "succeeded";

async function lockJob(tx: Prisma.TransactionClient, jobId: string) {
  // Python takes this same row lock before publishing a READY document.
  await tx.$queryRaw`SELECT id FROM ai_schema."AiJobRun" WHERE id = ${jobId} FOR UPDATE`;
  return tx.aiJobRun.findUnique({ where: { id: jobId } });
}

async function finishReadyIngestion(tx: Prisma.TransactionClient, jobId: string, now: Date) {
  const document = await tx.aiDocument.findUnique({
    where: { id: jobId }, select: { status: true, chunkCount: true, byteSize: true },
  });
  if (document?.status !== "READY") return false;
  await tx.aiJobRun.update({
    where: { id: jobId },
    data: {
      status: "SUCCEEDED", finishedAt: now,
      result: { document_id: jobId, chunk_count: document.chunkCount, byte_size: document.byteSize ?? 0 },
    },
  });
  return true;
}

export async function cancelAiJob(jobId: string, userId: string): Promise<JobTransition> {
  return db.$transaction(async (tx) => {
    const job = await lockJob(tx, jobId);
    if (!job || job.userId !== userId) return "missing";
    if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(job.status)) return "terminal";
    const now = new Date();
    if (job.agentId === "rag_ingest" && await finishReadyIngestion(tx, jobId, now)) {
      return "succeeded";
    }
    await tx.aiJobRun.update({
      where: { id: jobId }, data: { status: "CANCELLED", finishedAt: now },
    });
    return "cancelled";
  });
}

export async function sweepPendingAiJobs(now = new Date()) {
  const stale = new Date(now.getTime() - 60_000);
  // Two 270-second backend attempts plus Inngest retry overhead fit inside this lease.
  const abandoned = new Date(now.getTime() - 12 * 60_000);
  const abandonedJobs = await db.aiJobRun.findMany({
    where: { status: "RUNNING", lastHeartbeatAt: { lt: abandoned } },
    select: { id: true }, take: 100,
  });
  let failed = 0;
  for (const candidate of abandonedJobs) {
    const outcome = await db.$transaction(async (tx) => {
      const job = await lockJob(tx, candidate.id);
      if (job?.status !== "RUNNING" || !job.lastHeartbeatAt || job.lastHeartbeatAt >= abandoned) return false;
      if (job.agentId === "rag_ingest" && await finishReadyIngestion(tx, job.id, now)) return false;
      await tx.aiJobRun.update({
        where: { id: job.id },
        data: {
          status: "FAILED", errorCode: "STALE_RUN",
          errorMessage: "AI execution stopped before reporting a result", finishedAt: now,
        },
      });
      return true;
    });
    if (outcome) failed++;
  }
  const pending = await db.aiJobRun.findMany({
    where: {
      status: "PENDING",
      OR: [{ lastDispatchAt: null }, { lastDispatchAt: { lt: stale } }],
    },
    orderBy: { createdAt: "asc" }, take: 100,
    select: { id: true, agentId: true },
  });
  let sent = 0;
  for (const job of pending) {
    try {
      await dispatchAiJob(job);
      sent++;
    } catch {
      break;
    }
  }
  return { sent, failed };
}

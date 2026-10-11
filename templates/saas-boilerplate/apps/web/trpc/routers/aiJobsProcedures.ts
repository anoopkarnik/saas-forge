import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "@workspace/database/client";
import { inngest } from "@workspace/jobs/inngest";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { cancelAiJob, dispatchAiJob } from "@/lib/ai-jobs/service";

const createInput = z.object({
  agentId: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
});

const statusInput = z.object({ jobId: z.string().min(1) });
const eventsInput = z.object({
  jobId: z.string().min(1),
  sinceSeq: z.number().int().nonnegative().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
const cancelInput = z.object({ jobId: z.string().min(1) });

export const aiJobsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const row = await (db as any).aiJobRun.create({
        data: {
          userId: ctx.session.user.id,
          orgId: null,
          agentId: input.agentId,
          status: "PENDING",
          input: input.input,
        },
        select: { id: true },
      });
      try {
        await dispatchAiJob({ id: row.id, agentId: input.agentId });
      } catch (err) {
        console.error("[aiJobs.create] dispatch failed; row stays PENDING for recovery", err);
      }
      return { jobId: row.id };
    }),

  status: protectedProcedure
    .input(statusInput)
    .query(async ({ ctx, input }) => {
      const row = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const status = row.status as
        | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
      const latest = await (db as any).aiJobEvent.findFirst({
        where: { jobId: input.jobId }, orderBy: { seq: "desc" },
        select: { seq: true, type: true, at: true },
      });

      return {
        id: row.id,
        status,
        agent_id: row.agentId,
        created_at: row.createdAt,
        started_at: row.startedAt,
        finished_at: row.finishedAt,
        latest_event: latest ? { seq: latest.seq, type: latest.type, at: latest.at.toISOString() } : undefined,
        result: status === "SUCCEEDED" ? row.result : undefined,
        error: status === "FAILED"
          ? { code: row.errorCode ?? "UNKNOWN", message: row.errorMessage ?? "" }
          : undefined,
      };
    }),

  events: protectedProcedure
    .input(eventsInput)
    .query(async ({ ctx, input }) => {
      const owned = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });

      const rows = await (db as any).aiJobEvent.findMany({
        where: {
          jobId: input.jobId,
          ...(input.sinceSeq !== undefined ? { seq: { gt: input.sinceSeq } } : {}),
        },
        orderBy: { seq: "asc" },
        take: input.limit,
      });
      return rows.map((r: any) => ({
        seq: r.seq,
        type: r.type,
        payload: r.payload,
        at: r.at,
      }));
    }),

  cancel: protectedProcedure
    .input(cancelInput)
    .mutation(async ({ ctx, input }) => {
      const outcome = await cancelAiJob(input.jobId, ctx.session.user.id);
      if (outcome === "missing") throw new TRPCError({ code: "NOT_FOUND" });
      if (outcome === "cancelled") {
        try {
          await inngest.send({ name: "ai/job.cancelled", data: { jobId: input.jobId } });
        } catch (error) {
          console.error("[aiJobs.cancel] cancellation event failed; row is cancelled", error);
        }
      }
      return outcome === "cancelled" ? { ok: true } : { ok: true, already_terminal: true };
    }),
});

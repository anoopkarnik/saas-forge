import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "@workspace/database/client";
import { Redis } from "@upstash/redis";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { enqueueJob } from "@/lib/backend/client";

const upstash = Redis.fromEnv();

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
        await enqueueJob({
          jobId: row.id,
          userId: ctx.session.user.id,
          orgId: null,
          agentId: input.agentId,
          input: input.input,
        });
      } catch (err) {
        console.error("[aiJobs.create] enqueue failed; row stays PENDING for reaper", err);
      }
      return { jobId: row.id };
    }),

  status: protectedProcedure
    .input(statusInput)
    .query(async ({ ctx, input }) => {
      const live = (await upstash.hgetall<Record<string, string>>(`job:${input.jobId}`)) ?? {};
      const row = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const status = (live.status ?? row.status) as
        | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

      return {
        id: row.id,
        status,
        agent_id: row.agentId,
        created_at: row.createdAt,
        started_at: row.startedAt,
        finished_at: row.finishedAt,
        latest_event: live.latest_event_seq
          ? {
              seq: Number(live.latest_event_seq),
              type: live.latest_event_type ?? "unknown",
              at: live.last_heartbeat ?? new Date().toISOString(),
            }
          : undefined,
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
      const owned = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
        select: { id: true, status: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });

      if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(owned.status)) {
        return { ok: true, already_terminal: true };
      }

      await (db as any).aiJobRun.update({
        where: { id: input.jobId },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      await upstash.hset(`job:${input.jobId}`, { cancel_requested: "1", status: "CANCELLED" });
      return { ok: true };
    }),
});

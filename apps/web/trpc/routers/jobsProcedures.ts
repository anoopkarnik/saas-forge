import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "@/trpc/init";
import "@/lib/jobs/functions";
import {
  JobRunNotFoundError,
  discardJobRun,
  listDeadLetters,
  replayJobRun,
  scheduleOverview,
} from "@/lib/jobs/service";

const runInput = z.object({ id: z.string().min(1) });

function notFound(error: unknown): never {
  if (error instanceof JobRunNotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  throw error;
}

/** Admin view of the jobs module: dead letters (replay, discard) and schedules. */
export const jobsRouter = createTRPCRouter({
  failed: adminProcedure.query(() => listDeadLetters()),
  replay: adminProcedure.input(runInput).mutation(({ input }) => replayJobRun(input.id).catch(notFound)),
  discard: adminProcedure.input(runInput).mutation(({ input }) => discardJobRun(input.id).catch(notFound)),
  schedules: adminProcedure.query(() => scheduleOverview()),
});

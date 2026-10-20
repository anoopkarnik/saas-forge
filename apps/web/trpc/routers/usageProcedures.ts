import { z } from "zod";
import { balanceLedger, dailyUsage, meterTable, recentUsage, usageSummary } from "@/lib/usage/service";
import { createTRPCRouter, protectedProcedure } from "../init";

// The signed-in user's credit usage (billing module): read-only.
export const usageRouter = createTRPCRouter({
  summary: protectedProcedure.query(({ ctx }) => usageSummary(ctx.session.user.id)),

  daily: protectedProcedure
    .input(z.object({ days: z.union([z.literal(30), z.literal(90)]).default(30) }))
    .query(({ ctx, input }) => dailyUsage(ctx.session.user.id, input.days)),

  events: protectedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().int().min(1).max(100).default(25) }))
    .query(({ ctx, input }) => recentUsage(ctx.session.user.id, input)),

  ledger: protectedProcedure.query(({ ctx }) => balanceLedger(ctx.session.user.id)),

  meters: protectedProcedure.query(() => meterTable()),
});

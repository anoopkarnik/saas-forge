import { z } from "zod";
import { protectedProcedure } from "@/trpc/init";
import {
  changeLaunchpad,
  getLaunchpad,
  getLaunchpadSummaries,
} from "./service";
import { completeTask, importReport, savePreferences } from "./state";
import { doctorReportSchema } from "./report";
import { DEPLOYMENT_PATHS, GUIDE_MODES, REPORT_SCOPES } from "./types";
import { briefAnswersSchema } from "./ai-schema";
import {
  acceptLaunchpadDraft,
  cancelLaunchpadOperation,
  confirmLaunchpadBrief,
  discardLaunchpadDraft,
  saveLaunchpadBrief,
  startLaunchpadOperation,
  startOperationSchema,
} from "./ai-service";

const slug = z.string().min(1).max(100);
export const launchpadProcedures = {
  saveLaunchpadBrief: protectedProcedure
    .input(
      z
        .object({
          slug,
          answers: briefAnswersSchema,
          summary: z.string().trim().max(3000).optional(),
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      saveLaunchpadBrief(
        ctx.session.user.id,
        input.slug,
        input.answers,
        input.summary,
      ),
    ),
  confirmLaunchpadBrief: protectedProcedure
    .input(z.object({ slug, revision: z.number().int().positive() }).strict())
    .mutation(({ ctx, input }) =>
      confirmLaunchpadBrief(ctx.session.user.id, input.slug, input.revision),
    ),
  startLaunchpadOperation: protectedProcedure
    .input(startOperationSchema.extend({ slug }))
    .mutation(({ ctx, input: { slug, ...options } }) =>
      startLaunchpadOperation(ctx.session.user.id, slug, options),
    ),
  cancelLaunchpadOperation: protectedProcedure
    .input(z.object({ slug, jobId: z.string().min(1).max(100) }).strict())
    .mutation(({ ctx, input }) =>
      cancelLaunchpadOperation(ctx.session.user.id, input.slug, input.jobId),
    ),
  acceptLaunchpadDraft: protectedProcedure
    .input(z.object({ slug, jobId: z.string().min(1).max(100) }).strict())
    .mutation(({ ctx, input }) =>
      acceptLaunchpadDraft(ctx.session.user.id, input.slug, input.jobId),
    ),
  discardLaunchpadDraft: protectedProcedure
    .input(z.object({ slug, jobId: z.string().min(1).max(100) }).strict())
    .mutation(({ ctx, input }) =>
      discardLaunchpadDraft(ctx.session.user.id, input.slug, input.jobId),
    ),
  launchpad: protectedProcedure
    .input(z.object({ slug }))
    .query(({ ctx, input }) => getLaunchpad(ctx.session.user.id, input.slug)),
  launchpadSummaries: protectedProcedure.query(({ ctx }) =>
    getLaunchpadSummaries(ctx.session.user.id),
  ),
  saveLaunchpadPreferences: protectedProcedure
    .input(
      z
        .object({
          slug,
          mode: z.enum(GUIDE_MODES).optional(),
          deployment: z.enum(DEPLOYMENT_PATHS).optional(),
        })
        .strict(),
    )
    .mutation(({ ctx, input: { slug, ...preferences } }) =>
      changeLaunchpad(ctx.session.user.id, slug, (project, state) =>
        savePreferences(project, state, preferences),
      ),
    ),
  completeLaunchpadTask: protectedProcedure
    .input(
      z
        .object({
          slug,
          taskId: z.string().min(1).max(100),
          complete: z.boolean(),
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      changeLaunchpad(ctx.session.user.id, input.slug, (project, state) =>
        completeTask(project, state, input.taskId, input.complete),
      ),
    ),
  importLaunchpadReport: protectedProcedure
    .input(
      z
        .object({
          slug,
          scope: z.enum(REPORT_SCOPES),
          report: doctorReportSchema,
        })
        .strict(),
    )
    .mutation(({ ctx, input }) =>
      changeLaunchpad(ctx.session.user.id, input.slug, (project, state) =>
        importReport(project, state, input.report, input.scope),
      ),
    ),
};

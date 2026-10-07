import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { isEnabled, sessionSubject } from "@/lib/flags/flags";
import {
  completeTask,
  getOnboarding,
  OnboardingTaskError,
  saveAnswers,
  setChecklistDismissed,
  setWizardOpen,
  WIZARD_STEPS,
} from "@/lib/onboarding/service";
import { createTRPCRouter, protectedProcedure } from "../init";

// Onboarding (onboarding module): a skippable wizard and a setup checklist.
// The read-only demo guest sees neither; protectedProcedure blocks its writes.
export const onboardingRouter = createTRPCRouter({
  state: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role === "guest") {
      return { showWizard: false, step: 0, answers: {}, checklist: null, checklistDismissed: true };
    }
    const checklistFlag = await isEnabled("onboarding.checklist", await sessionSubject(ctx.session));
    return getOnboarding(ctx.session.user.id, { checklistFlag });
  }),

  answer: protectedProcedure
    .input(
      z.object({
        step: z.number().int().min(0).max(WIZARD_STEPS),
        answers: z.record(z.string().max(40), z.string().max(200)).refine((value) => Object.keys(value).length <= 10),
        finish: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await saveAnswers(ctx.session.user.id, input);
      return { ok: true };
    }),

  /** Skip (open: false) or show the wizard again (open: true). */
  setWizard: protectedProcedure.input(z.object({ open: z.boolean() })).mutation(async ({ ctx, input }) => {
    await setWizardOpen(ctx.session.user.id, input.open);
    return { ok: true };
  }),

  dismiss: protectedProcedure.input(z.object({ dismissed: z.boolean() })).mutation(async ({ ctx, input }) => {
    await setChecklistDismissed(ctx.session.user.id, input.dismissed);
    return { ok: true };
  }),

  complete: protectedProcedure.input(z.object({ taskKey: z.string().max(100) })).mutation(async ({ ctx, input }) => {
    try {
      await completeTask(ctx.session.user.id, input.taskKey);
    } catch (error) {
      if (error instanceof OnboardingTaskError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
    return { ok: true };
  }),
});

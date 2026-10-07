import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { isFlagKey, type FlagKey } from "@/lib/flags/definitions";
import { evaluateFlags, sessionSubject } from "@/lib/flags/flags";
import { rulesSchema } from "@/lib/flags/rules";
import { flagHistory, listFlags, previewFlagsFor, updateFlag } from "@/lib/flags/service";
import { adminProcedure, createTRPCRouter, guestReadableAdminProcedure, protectedProcedure } from "../init";

const flagKey = z.string().refine(isFlagKey, { message: "Unknown flag." }).transform((key) => key as FlagKey);

// Feature flags (feature_flags module). Writes are admin-only; the demo guest can look.
export const flagsRouter = createTRPCRouter({
  /** The caller's evaluated flags, for clients without the server layout (desktop, mobile). */
  forSession: protectedProcedure.query(async ({ ctx }) => evaluateFlags(await sessionSubject(ctx.session))),

  list: guestReadableAdminProcedure.query(() => listFlags()),

  history: guestReadableAdminProcedure.input(z.object({ key: flagKey })).query(({ input }) => flagHistory(input.key)),

  update: adminProcedure
    .input(z.object({ key: flagKey, enabled: z.boolean().optional(), rules: rulesSchema.optional() }))
    .mutation(({ ctx, input }) =>
      updateFlag(input.key, { enabled: input.enabled, rules: input.rules }, ctx.session.user.id, ctx.headers),
    ),

  preview: adminProcedure.input(z.object({ user: z.string().trim().min(1).max(320) })).query(async ({ input }) => {
    const result = await previewFlagsFor(input.user);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "No user with that id or email." });
    return result;
  }),
});

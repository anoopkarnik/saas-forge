import { TRPCError } from "@trpc/server";
import type { FlagKey } from "@/lib/flags/definitions";
import { isEnabled, sessionSubject } from "@/lib/flags/flags";
import { protectedProcedure } from "./init";

/**
 * A procedure that exists only for users the flag is on for: a call while it
 * is off is FORBIDDEN, however it was made. Hiding UI with useFlag is never
 * enough on its own.
 */
export const flagProcedure = (key: FlagKey) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    if (!(await isEnabled(key, await sessionSubject(ctx.session)))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "This feature is not enabled for your account." });
    }
    return next();
  });

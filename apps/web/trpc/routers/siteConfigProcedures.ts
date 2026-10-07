import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getPublicSiteConfig,
  getSiteConfigEntries,
  SiteConfigError,
  updateSiteConfig,
} from "@/lib/site-config/service";
// scaffold:begin audit_log
import db from "@workspace/database/client";
import { audit, userActor } from "@/lib/audit/audit";
// scaffold:end audit_log
import { adminProcedure, baseProcedure, createTRPCRouter, guestReadableAdminProcedure } from "../init";

export const siteConfigRouter = createTRPCRouter({
  /** Public settings only; the root layout hydrates the same values. */
  get: baseProcedure.query(() => getPublicSiteConfig()),

  entries: guestReadableAdminProcedure.query(() => getSiteConfigEntries()),

  /** `null` resets a setting to its env value. Keys and values are checked against the registry. */
  update: adminProcedure.input(z.record(z.string(), z.unknown())).mutation(async ({ ctx, input }) => {
    try {
      await updateSiteConfig(input);
    } catch (error) {
      if (error instanceof SiteConfigError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
    // scaffold:begin audit_log
    await audit(db, "site_config.updated", {
      actor: userActor(ctx.session.user.id),
      metadata: { changes: input },
      headers: ctx.headers,
    });
    // scaffold:end audit_log
    return { ok: true };
  }),
});

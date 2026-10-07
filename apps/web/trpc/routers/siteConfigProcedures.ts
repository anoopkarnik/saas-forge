import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getPublicSiteConfig,
  getSiteConfigEntries,
  SiteConfigError,
  updateSiteConfig,
} from "@/lib/site-config/service";
import { adminProcedure, baseProcedure, createTRPCRouter, guestReadableAdminProcedure } from "../init";

export const siteConfigRouter = createTRPCRouter({
  /** Public settings only; the root layout hydrates the same values. */
  get: baseProcedure.query(() => getPublicSiteConfig()),

  entries: guestReadableAdminProcedure.query(() => getSiteConfigEntries()),

  /** `null` resets a setting to its env value. Keys and values are checked against the registry. */
  update: adminProcedure.input(z.record(z.string(), z.unknown())).mutation(async ({ input }) => {
    try {
      await updateSiteConfig(input);
      return { ok: true };
    } catch (error) {
      if (error instanceof SiteConfigError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  }),
});

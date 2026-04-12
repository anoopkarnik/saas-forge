import { createTRPCRouter, adminProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { runAuditInputSchema, analyticsDateRangeSchema } from "@/lib/zod/seo";
import { runSeoAudit } from "@/lib/functions/seoAudit";
import {
  getTrafficOverview,
  getTopPages,
  getTrafficSources,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getTopCountries,
  getRealtimeUsers,
  isGa4Configured,
} from "@/lib/functions/googleAnalytics";

export const seoRouter = createTRPCRouter({
  runAudit: adminProcedure
    .input(runAuditInputSchema)
    .mutation(async ({ input }) => {
      const baseUrl = input.baseUrl || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      return runSeoAudit(baseUrl);
    }),

  getTrafficOverview: adminProcedure
    .input(analyticsDateRangeSchema)
    .query(async ({ input }) => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getTrafficOverview(input.startDate, input.endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getTrafficOverview error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),

  getTopPages: adminProcedure
    .input(analyticsDateRangeSchema)
    .query(async ({ input }) => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getTopPages(input.startDate, input.endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getTopPages error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),

  getTrafficSources: adminProcedure
    .input(analyticsDateRangeSchema)
    .query(async ({ input }) => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getTrafficSources(input.startDate, input.endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getTrafficSources error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),

  getDeviceBreakdown: adminProcedure
    .input(analyticsDateRangeSchema)
    .query(async ({ input }) => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getDeviceBreakdown(input.startDate, input.endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getDeviceBreakdown error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),

  getBrowserBreakdown: adminProcedure
    .input(analyticsDateRangeSchema)
    .query(async ({ input }) => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getBrowserBreakdown(input.startDate, input.endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getBrowserBreakdown error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),

  getTopCountries: adminProcedure
    .input(analyticsDateRangeSchema)
    .query(async ({ input }) => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getTopCountries(input.startDate, input.endDate);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getTopCountries error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),

  getRealtimeUsers: adminProcedure
    .query(async () => {
      if (!isGa4Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_JSON environment variables.",
        });
      }
      try {
        return await getRealtimeUsers();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[SEO] getRealtimeUsers error:", msg);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `GA4 API error: ${msg}` });
      }
    }),
});

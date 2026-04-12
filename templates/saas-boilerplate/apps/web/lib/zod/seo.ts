import { z } from "zod";

export const runAuditInputSchema = z.object({
  baseUrl: z.string().url().optional(),
});

export const analyticsDateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

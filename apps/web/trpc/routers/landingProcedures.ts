import { fetchLandingPageData } from "@/lib/functions/notion";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { z } from "zod";

export const landingRouter = createTRPCRouter({
    getLandingInfoFromNotion: baseProcedure
    .query(async () => {
      const data = await fetchLandingPageData()
       return data;
    }),
});
import { fetchLandingPageData } from "@/lib/functions/fetchLandingPageDataFromNotion";
import { LandingPageProps } from "@/lib/ts-types/landing";
import { redis } from "@/server/redis";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";

const LANDING_PAGE_CACHE_KEY = "landing-page:notion:v1";
const LANDING_CACHE_TTL_SECONDS = 3600; // 10 minutes

export const landingRouter = createTRPCRouter({
    getLandingInfoFromNotion: baseProcedure
    .query(async () => {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      const data = await fetchLandingPageData()
       return data;
      }

      const cached = await redis.get<LandingPageProps>(LANDING_PAGE_CACHE_KEY);
      if (cached) {
        return cached;
      }

      const data = await fetchLandingPageData();

      await redis.set(LANDING_PAGE_CACHE_KEY, data, { ex: LANDING_CACHE_TTL_SECONDS });
      return data;

    }),
});
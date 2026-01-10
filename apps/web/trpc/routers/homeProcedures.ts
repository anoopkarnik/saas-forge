import { fetchDocumentation } from "@/lib/functions/fetchDocumentationFromNotion";
import { DocumentationProps } from "@/lib/ts-types/doc";
import { redis } from "@/server/redis";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { retrieveBlocksTree } from "@workspace/cms/notion/block/retrieveBlockChildren";
import { z } from "zod";

const HOME_PAGE_CACHE_KEY = "home-page:notion:v1";
const HOME_CACHE_TTL_SECONDS = 3600; // 10 minutes

export const documentationRouter = createTRPCRouter({
    getDocumentationInfoFromNotion: baseProcedure
    .query(async () => {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      const data = await fetchDocumentation()
       return data;
      }

      const cached = await redis.get<DocumentationProps>(HOME_PAGE_CACHE_KEY);
      if (cached) {
        return cached;
      }

      const data = await fetchDocumentation();

      await redis.set(HOME_PAGE_CACHE_KEY, data, { ex: HOME_CACHE_TTL_SECONDS });
      return data;

    })
});
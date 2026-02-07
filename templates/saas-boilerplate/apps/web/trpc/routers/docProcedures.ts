import { fetchDocumentation } from "@/lib/functions/fetchDocumentationFromNotion";
import { DocumentationProps } from "@/lib/ts-types/doc";
import { redis } from "@/server/redis";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";
import { retrieveBlocksTree } from "@workspace/cms/notion/block/retrieveBlockChildren";
import { z } from "zod";

const DOCUMENTATION_PAGE_CACHE_KEY = "documentation-page:notion:v1";
const DOCUMENTATION_CACHE_TTL_SECONDS = 3600; // 10 minutes

export const documentationRouter = createTRPCRouter({
    getDocumentationInfoFromNotion: baseProcedure
    .query(async () => {
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      const data = await fetchDocumentation()
       return data;
      }

      const cached = await redis.get<DocumentationProps>(DOCUMENTATION_PAGE_CACHE_KEY);
      if (cached) {
        return cached;
      }

      const data = await fetchDocumentation();

      await redis.set(DOCUMENTATION_PAGE_CACHE_KEY, data, { ex: DOCUMENTATION_CACHE_TTL_SECONDS });
      return data;

    }),
    queryDocumentationById: baseProcedure
    .input(z.object({id: z.string().min(1, "Id is required")}))
    .query(async ({ input }) => {
      const blocks = await retrieveBlocksTree({
        apiToken: process.env.NOTION_API_TOKEN!,
        block_id: input.id
      });

      return blocks;
    })
});
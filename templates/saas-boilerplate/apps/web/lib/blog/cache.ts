import { fetchBlogIndex } from "@/lib/functions/fetchBlog";
import { getCmsProvider } from "@/lib/cms-provider";
import { BlogIndexProps } from "@/lib/ts-types/blog";
import { redis } from "@/server/redis";

const BLOG_CACHE_TTL_SECONDS = 3600;

export const getBlogCacheKey = () =>
  `${(process.env.NEXT_PUBLIC_SAAS_NAME || "blog").toLowerCase()}-blog:v1`;

const redisEnabled = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) &&
  getCmsProvider() !== "constant";

/** Published posts for the blog index, sitemap, RSS and llms.txt; Redis-cached when configured. */
export async function getCachedBlogIndex(): Promise<BlogIndexProps> {
  if (!redisEnabled()) {
    return fetchBlogIndex();
  }

  const cached = await redis.get<BlogIndexProps>(getBlogCacheKey());
  if (cached) {
    return cached;
  }

  const data = await fetchBlogIndex();
  await redis.set(getBlogCacheKey(), data, { ex: BLOG_CACHE_TTL_SECONDS });
  return data;
}

export async function clearBlogCache(): Promise<void> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    await redis.del(getBlogCacheKey());
  }
}

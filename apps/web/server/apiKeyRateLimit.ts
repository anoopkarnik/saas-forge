import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const apiKeyRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"), // 60 requests per minute per key
  analytics: true,
  prefix: "saas-forge:apikey",
});

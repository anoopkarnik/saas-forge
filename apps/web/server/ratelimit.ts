import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

export const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per minute
  analytics: true,
  prefix: "saas-forge:ratelimit",
});

export const chatRateLimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"), // 20 requests per minute
  analytics: true,
  prefix: "saas-forge:chat-ratelimit",
});

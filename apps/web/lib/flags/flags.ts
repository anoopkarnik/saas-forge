import { cookies, headers } from "next/headers";
import { auth } from "@workspace/auth/better-auth/auth";
import { createFlagEvaluator } from "@workspace/flags/evaluator";
import { redis } from "@/server/redis";
import {
  ANONYMOUS_ID_COOKIE,
  FLAGS,
  type FlagKey,
  type FlagValues,
} from "./definitions";

const CACHE_KEY = "feature-flags:v1";
const evaluator = createFlagEvaluator(
  FLAGS,
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? {
        read: () => redis.get(CACHE_KEY),
        write: (states) => redis.set(CACHE_KEY, states, { ex: 3600 }),
        clear: () => redis.del(CACHE_KEY),
      }
    : undefined,
);
export const { isEnabled, evaluateFlags, sessionSubject, invalidateFlagCache } =
  evaluator;

/** Every flag for the current request's visitor (the root layout hydrates FlagsProvider with it). */
export async function evaluateFlagsForRequest(): Promise<FlagValues> {
  const requestHeaders = await headers();
  const session = await auth.api
    .getSession({ headers: requestHeaders })
    .catch(() => null);
  const anonymousId = (await cookies()).get(ANONYMOUS_ID_COOKIE)?.value;
  return evaluateFlags(await sessionSubject(session, anonymousId));
}

/** For route handlers: a 404 response when the flag is off for the caller, otherwise null. */
export async function requireFlag(
  key: FlagKey,
  req: Request,
): Promise<Response | null> {
  const session = await auth.api
    .getSession({ headers: req.headers })
    .catch(() => null);
  if (await isEnabled(key, await sessionSubject(session))) return null;
  return Response.json({ error: "Not found" }, { status: 404 });
}

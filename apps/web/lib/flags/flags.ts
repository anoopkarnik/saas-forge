import { cache } from "react";
import { cookies, headers } from "next/headers";
import db from "@workspace/database/client";
import { auth } from "@workspace/auth/better-auth/auth";
import { logger } from "@workspace/observability/winston-logger";
import { redis } from "@/server/redis";
import {
  ANONYMOUS_ID_COOKIE,
  FLAGS,
  type FlagKey,
  type FlagSubject,
  type FlagValues,
} from "@/lib/flags/definitions";
import { evaluateFlag, parseRules, type FlagState } from "@/lib/flags/rules";

/**
 * Server-side flag evaluation (feature_flags module), the only source of
 * truth: clients receive evaluated booleans, never rules. Without the module
 * this file is a stub that returns each flag's default.
 */

const CACHE_KEY = "feature-flags:v1";
const REDIS_TTL_SECONDS = 3600;
const MEMORY_TTL_MS = 30_000;

let memory: { at: number; states: Record<string, FlagState> } | null = null;
const redisEnabled = () => !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const loadStates = cache(async (): Promise<Record<string, FlagState>> => {
  if (redisEnabled()) {
    try {
      const cached = await redis.get<Record<string, FlagState>>(CACHE_KEY);
      if (cached) return cached;
    } catch (error) {
      logger.warn("Flag cache read failed", { error: (error as Error).message });
    }
  } else if (memory && Date.now() - memory.at < MEMORY_TTL_MS) {
    return memory.states;
  }

  let states: Record<string, FlagState>;
  try {
    const rows = await db.featureFlag.findMany({ select: { key: true, enabled: true, rules: true } });
    states = Object.fromEntries(rows.map((row) => [row.key, { enabled: row.enabled, rules: parseRules(row.rules) }]));
  } catch (error) {
    // No database (a build, an outage): flags keep their code defaults.
    logger.warn("Flag read failed; using defaults", { error: (error as Error).message });
    return {};
  }
  if (redisEnabled()) {
    await redis.set(CACHE_KEY, states, { ex: REDIS_TTL_SECONDS }).catch(() => undefined);
  } else {
    memory = { at: Date.now(), states };
  }
  return states;
});

/** Called after every flag change, before the response, so the next read sees it. */
export async function invalidateFlagCache(): Promise<void> {
  memory = null;
  if (redisEnabled()) await redis.del(CACHE_KEY);
}

function evaluate(key: FlagKey, states: Record<string, FlagState>, subject: FlagSubject): boolean {
  const state = states[key];
  return state ? evaluateFlag(key, state, subject) : FLAGS[key].default;
}

export async function isEnabled(key: FlagKey, subject: FlagSubject = {}): Promise<boolean> {
  return evaluate(key, await loadStates(), subject);
}

export async function evaluateFlags(subject: FlagSubject = {}): Promise<FlagValues> {
  const states = await loadStates();
  return Object.fromEntries((Object.keys(FLAGS) as FlagKey[]).map((key) => [key, evaluate(key, states, subject)])) as FlagValues;
}

type SessionLike = { user: { id: string; role?: string | null }; session?: { id?: string } | null } | null | undefined;

export async function sessionSubject(session: SessionLike, anonymousId?: string | null): Promise<FlagSubject> {
  if (!session) return { anonymousId: anonymousId ?? null };
  let organizationId: string | null = null;
  // scaffold:begin multi_tenancy
  if (session.session?.id) {
    const row = await db.session.findUnique({ where: { id: session.session.id }, select: { activeOrganizationId: true } });
    organizationId = row?.activeOrganizationId ?? null;
  }
  // scaffold:end multi_tenancy
  return { userId: session.user.id, role: session.user.role ?? null, organizationId, anonymousId: anonymousId ?? null };
}

/** Every flag for the current request's visitor (the root layout hydrates FlagsProvider with it). */
export async function evaluateFlagsForRequest(): Promise<FlagValues> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders }).catch(() => null);
  const anonymousId = (await cookies()).get(ANONYMOUS_ID_COOKIE)?.value;
  return evaluateFlags(await sessionSubject(session, anonymousId));
}

/** For route handlers: a 404 response when the flag is off for the caller, otherwise null. */
export async function requireFlag(key: FlagKey, req: Request): Promise<Response | null> {
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  if (await isEnabled(key, await sessionSubject(session))) return null;
  return Response.json({ error: "Not found" }, { status: 404 });
}

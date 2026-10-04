import { auth } from "@workspace/auth/better-auth/auth";
import { getRoutePolicy, type SessionRoutePath } from "@/lib/route-policy";
import { chatRateLimit, ratelimit } from "./ratelimit";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type RouteGuardResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403 | 429; error: string };

/**
 * Enforces a "session" route's entry in lib/route-policy.ts: signed-in user,
 * required role, read-only guest block, then rate limit. Returns the failure
 * as data so each route can keep its own response shape (e.g. CORS headers).
 */
export async function guardRoute(
  req: Request,
  path: SessionRoutePath,
): Promise<RouteGuardResult> {
  const policy = getRoutePolicy(path);

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const role = session.user.role ?? "user";
  if (policy.roles && !policy.roles.includes(role)) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  if (role === "guest" && !policy.allowGuest) {
    return {
      ok: false,
      status: 403,
      error: "This is a read-only demo account.",
    };
  }

  if (policy.rateLimit === "default" || policy.rateLimit === "chat") {
    const limiter = policy.rateLimit === "chat" ? chatRateLimit : ratelimit;
    const { success } = await limiter.limit(session.user.id);
    if (!success) {
      return { ok: false, status: 429, error: "Rate limit exceeded" };
    }
  }

  return { ok: true, session };
}

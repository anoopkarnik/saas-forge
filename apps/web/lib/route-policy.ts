/**
 * Route trust contract — the single source of truth for who may call each
 * page group, API route and webhook, and under what limits.
 *
 * - `middleware.ts` derives its public / auth-page / protected decisions and
 *   request-size limits from this table.
 * - `server/routeGuard.ts` enforces session, role, guest and rate-limit rules
 *   for "session" API routes, keyed by the same paths.
 * - `tests/integration/routePolicy.test.ts` fails when an `app/api` route has
 *   no entry, a "session" route skips `guardRoute`, or a route doesn't use the
 *   input validation its entry declares.
 *
 * Paths mirror the filesystem (`[param]` matches one segment) and match on
 * whole segments, so "/public" never matches "/publicity". Anything without
 * an entry is a protected page.
 *
 * Keep this file edge-safe: middleware imports it, so no Node, database or
 * auth imports.
 */

export type RouteAuth =
  /** Anyone; no session expected. */
  | "public"
  /** Sign-in style pages; signed-in users are redirected home. */
  | "auth-page"
  /** Better Auth's own endpoints. */
  | "auth-handler"
  /**
   * Signed-in user. Pages: session cookie checked by middleware. API routes:
   * verified server-side by `guardRoute`, which answers 401 itself.
   */
  | "session"
  /** `Authorization: Bearer sk_...`, verified by the API-key authenticator. */
  | "api-key"
  /** Provider signature, verified in the handler. */
  | "webhook"
  /** tRPC: auth is per procedure (`baseProcedure` / `protectedProcedure`). */
  | "procedure";

/** Where the request input is validated. */
export type RouteInput =
  | "zod"
  | "image-upload"
  | "form-data"
  /** Verified and parsed by a provider SDK (Stripe, Dodo, Better Auth). */
  | "provider"
  /** Forwarded as-is to the Python backend, which validates it. */
  | "forwarded"
  /** Hand-checked fields; no schema yet. */
  | "manual"
  | "trpc"
  | "none";

export type RoutePolicy = {
  path: string;
  match: "exact" | "prefix";
  auth: RouteAuth;
  /** Session roles allowed in; omitted means any signed-in role. */
  roles?: readonly string[];
  /** Session routes reject the read-only demo guest unless this is true. */
  allowGuest?: boolean;
  /** "api-key" is enforced by the API-key authenticator, not the middleware. */
  rateLimit: "default" | "chat" | "api-key" | "none";
  /** Requests declaring a larger Content-Length get a 413 in middleware. */
  maxBodyBytes?: number;
  input: RouteInput;
  /** The handler sets its own CORS headers; middleware leaves them alone. */
  cors?: "self-managed";
};

const KB = 1024;
const MB = 1024 * KB;

// One row per route so the table reads as an audit list.
// prettier-ignore
export const routePolicies = [
  // Pages
  { path: "/landing", match: "prefix", auth: "public", rateLimit: "none", input: "none" },
  { path: "/public", match: "prefix", auth: "public", rateLimit: "none", input: "none" },
  { path: "/auth-callback", match: "prefix", auth: "public", rateLimit: "none", input: "none" },
  { path: "/sign-in", match: "exact", auth: "auth-page", rateLimit: "none", input: "none" },
  { path: "/sign-up", match: "exact", auth: "auth-page", rateLimit: "none", input: "none" },
  { path: "/error", match: "exact", auth: "auth-page", rateLimit: "none", input: "none" },
  { path: "/forgot-password", match: "exact", auth: "auth-page", rateLimit: "none", input: "none" },
  { path: "/reset-password", match: "exact", auth: "auth-page", rateLimit: "none", input: "none" },
  { path: "/email-verified", match: "exact", auth: "auth-page", rateLimit: "none", input: "none" },

  // Platform
  { path: "/api/healthcheck", match: "exact", auth: "public", rateLimit: "none", input: "none" },
  { path: "/api/auth", match: "prefix", auth: "auth-handler", rateLimit: "none", maxBodyBytes: 1 * MB, input: "provider" },
  { path: "/api/demo-login", match: "exact", auth: "public", rateLimit: "none", maxBodyBytes: 16 * KB, input: "none" },
  { path: "/api/trpc", match: "prefix", auth: "procedure", rateLimit: "none", input: "trpc" },

  // Payment webhooks
  { path: "/api/payments/stripe/webhook", match: "exact", auth: "webhook", rateLimit: "none", maxBodyBytes: 1 * MB, input: "provider" },
  { path: "/api/payments/dodo/webhook", match: "exact", auth: "webhook", rateLimit: "none", maxBodyBytes: 1 * MB, input: "provider" },

  // Session routes
  { path: "/api/cms/upload", match: "exact", auth: "session", roles: ["admin"], rateLimit: "default", maxBodyBytes: 11 * MB, input: "image-upload" },
  { path: "/api/settings/modifyAvatar", match: "exact", auth: "session", rateLimit: "default", maxBodyBytes: 6 * MB, input: "image-upload" },
  { path: "/api/ai/chat", match: "exact", auth: "session", rateLimit: "none", maxBodyBytes: 1 * MB, input: "zod" },
  { path: "/api/ai/speech/stt", match: "exact", auth: "session", rateLimit: "none", maxBodyBytes: 25 * MB, input: "form-data" },
  { path: "/api/ai/speech/tts", match: "exact", auth: "session", rateLimit: "none", maxBodyBytes: 64 * KB, input: "zod" },
  { path: "/api/ai/agents/[agentId]/stream", match: "exact", auth: "session", rateLimit: "none", maxBodyBytes: 256 * KB, input: "forwarded" },
  { path: "/api/scaffold", match: "exact", auth: "session", rateLimit: "default", maxBodyBytes: 256 * KB, input: "manual", cors: "self-managed" },
  { path: "/api/scaffold/upgrade", match: "exact", auth: "session", rateLimit: "none", maxBodyBytes: 64 * KB, input: "zod" },
  { path: "/api/scaffold/builds/[jobId]", match: "exact", auth: "session", rateLimit: "default", maxBodyBytes: 1 * KB, input: "none" },

  // Public REST API (API keys)
  { path: "/api/v1/me", match: "exact", auth: "api-key", rateLimit: "api-key", input: "none" },
  { path: "/api/v1/credits", match: "exact", auth: "api-key", rateLimit: "api-key", input: "none" },
  { path: "/api/v1/scaffold/pricing", match: "exact", auth: "api-key", rateLimit: "api-key", input: "none" },
  { path: "/api/v1/projects", match: "exact", auth: "api-key", rateLimit: "api-key", maxBodyBytes: 256 * KB, input: "zod" },
  { path: "/api/v1/projects/[slug]", match: "exact", auth: "api-key", rateLimit: "api-key", maxBodyBytes: 256 * KB, input: "zod" },
  { path: "/api/v1/projects/[slug]/download", match: "exact", auth: "api-key", rateLimit: "api-key", maxBodyBytes: 64 * KB, input: "manual" },
  { path: "/api/v1/projects/[slug]/upgrade", match: "exact", auth: "api-key", rateLimit: "api-key", maxBodyBytes: 64 * KB, input: "zod" },
] as const satisfies readonly RoutePolicy[];

export type SessionRoutePath = Extract<
  (typeof routePolicies)[number],
  { auth: "session" }
>["path"];

const segments = (path: string) => path.split("/").filter(Boolean);

function matches(policy: RoutePolicy, pathname: string) {
  const want = segments(policy.path);
  const got = segments(pathname);
  if (policy.match === "exact" ? got.length !== want.length : got.length < want.length) {
    return false;
  }
  return want.every((seg, i) => seg.startsWith("[") || seg === got[i]);
}

/** The policy governing a request path, or undefined for protected pages. */
export function resolveRoutePolicy(pathname: string): RoutePolicy | undefined {
  return (routePolicies as readonly RoutePolicy[]).find((policy) =>
    matches(policy, pathname),
  );
}

export function getRoutePolicy(path: SessionRoutePath): RoutePolicy {
  return (routePolicies as readonly RoutePolicy[]).find((p) => p.path === path)!;
}

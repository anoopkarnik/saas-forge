import type { NextRequest } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";
import db from "@workspace/database/client";
import { logger } from "@workspace/observability/winston-logger";
import { audit, userActor } from "@/lib/audit/audit";
import type { AuditAction } from "@/lib/audit/actions";

type Body = Record<string, unknown>;
type AuthEvent = { action: AuditAction; targetId?: string; metadata: Record<string, unknown> };

const str = (value: unknown) => (typeof value === "string" ? value : undefined);

/** Better Auth admin endpoints (web, desktop and mobile all call these) and what each records. */
const ADMIN_ENDPOINTS: Record<string, (body: Body, result: Body) => AuthEvent> = {
  "/admin/create-user": (body, result) => ({
    action: "user.created",
    targetId: str((result.user as Body | undefined)?.id),
    metadata: { email: str(body.email) ?? "", role: body.role as string | undefined },
  }),
  "/admin/update-user": (body) => ({
    action: "user.updated",
    targetId: str(body.userId),
    metadata: { fields: Object.keys((body.data as Body | undefined) ?? {}) },
  }),
  "/admin/set-role": (body) => ({ action: "user.role_changed", targetId: str(body.userId), metadata: { role: body.role } }),
  "/admin/ban-user": (body) => ({
    action: "user.banned",
    targetId: str(body.userId),
    metadata: {
      reason: str(body.banReason),
      expiresInSeconds: typeof body.banExpiresIn === "number" ? body.banExpiresIn : undefined,
    },
  }),
  "/admin/unban-user": (body) => ({ action: "user.unbanned", targetId: str(body.userId), metadata: {} }),
  "/admin/remove-user": (body) => ({ action: "user.removed", targetId: str(body.userId), metadata: {} }),
  "/admin/impersonate-user": (body) => ({ action: "user.impersonated", targetId: str(body.userId), metadata: {} }),
  // Never pass the body here: it carries the new password.
  "/admin/set-user-password": (body) => ({ action: "user.password_set", targetId: str(body.userId), metadata: {} }),
  "/admin/revoke-user-sessions": (body) => ({ action: "user.sessions_revoked", targetId: str(body.userId), metadata: {} }),
};

const endpointOf = (req: Request) => new URL(req.url).pathname.replace(/^\/api\/auth/, "");

export const isAuditedAuthRequest = (req: Request) => endpointOf(req) in ADMIN_ENDPOINTS;

/**
 * Runs a Better Auth request and, when it succeeded, records who did it. The
 * actor is read before the call, since impersonation replaces the session.
 */
export async function withAuthAudit(req: NextRequest, run: (req: NextRequest) => Promise<Response>): Promise<Response> {
  const toEvent = ADMIN_ENDPOINTS[endpointOf(req)]!;
  const body = ((await req.clone().json().catch(() => ({}))) ?? {}) as Body;
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);

  const response = await run(req);
  if (!response.ok || !session) return response;

  try {
    const result = ((await response.clone().json().catch(() => ({}))) ?? {}) as Body;
    const event = toEvent(body, result);
    await audit(db, event.action, {
      actor: userActor(session.user.id),
      targetId: event.targetId,
      metadata: event.metadata as never,
      headers: req.headers,
    });
  } catch (error) {
    // The change already happened; a missing trail entry must not fail it.
    logger.warn("Audit of auth request failed", { endpoint: endpointOf(req), error: (error as Error).message });
  }
  return response;
}

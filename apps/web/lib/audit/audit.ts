import type { Prisma } from "@workspace/database/prisma";
import { getSiteConfig } from "@/lib/site-config/service";
import { AUDIT_ACTIONS, storedMetadata, type AuditAction, type AuditMetadata } from "@/lib/audit/actions";

type AuditClient = Pick<Prisma.TransactionClient, "auditEvent">;

export type AuditActor =
  | { type: "user"; userId: string }
  | { type: "apiKey"; apiKeyId: string; userId?: string | null }
  | { type: "system" };

export const userActor = (userId: string): AuditActor => ({ type: "user", userId });

export type AuditEventInput<A extends AuditAction> = {
  actor: AuditActor;
  targetId?: string | null;
  organizationId?: string | null;
  metadata: AuditMetadata<A>;
  /** The request's headers, for IP and user agent when site config records them. */
  headers?: Pick<Headers, "get"> | null;
};

function requestDetails(headers: Pick<Headers, "get">) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || headers.get("x-real-ip") || null,
    userAgent: headers.get("user-agent")?.slice(0, 512) || null,
  };
}

/**
 * Records one audit event. Pass the transaction client of the change so both
 * commit or roll back together; for Better Auth writes, call it after the
 * write succeeded.
 */
export async function audit<A extends AuditAction>(client: AuditClient, action: A, event: AuditEventInput<A>): Promise<void> {
  const details =
    event.headers && (await getSiteConfig())["audit.recordRequestDetails"] ? requestDetails(event.headers) : null;
  await client.auditEvent.create({
    data: {
      action,
      targetType: AUDIT_ACTIONS[action].targetType,
      targetId: event.targetId ?? null,
      organizationId: event.organizationId ?? null,
      actorType: event.actor.type,
      actorUserId: event.actor.type === "system" ? null : (event.actor.userId ?? null),
      actorApiKeyId: event.actor.type === "apiKey" ? event.actor.apiKeyId : null,
      metadata: storedMetadata(action, event.metadata) as Prisma.InputJsonValue,
      ip: details?.ip ?? null,
      userAgent: details?.userAgent ?? null,
    },
  });
}

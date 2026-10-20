import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import { enqueue } from "@workspace/jobs/index";
import { logger } from "@workspace/observability/winston-logger";
import { deliverWebhookJob } from "@/lib/webhooks/deliver";
import { buildEnvelope, isWebhookEventType, type WebhookEnvelope, type WebhookEventData, type WebhookEventType } from "@/lib/webhooks/events";
import { encryptSecret, generateWebhookSecret, secretPrefix } from "@/lib/webhooks/signing";
import { assertSafeWebhookUrl, UnsafeWebhookUrlError } from "@/lib/webhooks/ssrf";

/** Who an endpoint belongs to: a user, or an organization. */
export type WebhookOwner = { ownerUserId: string } | { organizationId: string };

export class WebhookInputError extends Error {}

const SECRET_OVERLAP_MS = 24 * 60 * 60 * 1000;

const ownerWhere = (owner: WebhookOwner) =>
  "ownerUserId" in owner ? { ownerUserId: owner.ownerUserId, organizationId: null } : { organizationId: owner.organizationId };

const endpointSelect = {
  id: true,
  url: true,
  description: true,
  secretPrefix: true,
  events: true,
  enabled: true,
  disabledReason: true,
  consecutiveFailures: true,
  createdAt: true,
} satisfies Prisma.WebhookEndpointSelect;

export type WebhookEndpointView = Prisma.WebhookEndpointGetPayload<{ select: typeof endpointSelect }>;

function checkedEvents(events: string[]): string[] {
  const unknown = events.filter((type) => !isWebhookEventType(type));
  if (unknown.length) throw new WebhookInputError(`Unknown event types: ${unknown.join(", ")}.`);
  return [...new Set(events)];
}

async function checkedUrl(url: string): Promise<string> {
  try {
    return (await assertSafeWebhookUrl(url)).toString();
  } catch (error) {
    if (error instanceof UnsafeWebhookUrlError) throw new WebhookInputError(error.message);
    throw error;
  }
}

export async function listEndpoints(owner: WebhookOwner): Promise<WebhookEndpointView[]> {
  return db.webhookEndpoint.findMany({ where: ownerWhere(owner), select: endpointSelect, orderBy: { createdAt: "desc" } });
}

/** The secret is returned here and on rotation only. */
export async function createEndpoint(
  owner: WebhookOwner,
  input: { url: string; description?: string; events: string[] },
): Promise<{ endpoint: WebhookEndpointView; secret: string }> {
  const url = await checkedUrl(input.url);
  const events = checkedEvents(input.events);
  const secret = generateWebhookSecret();
  const endpoint = await db.webhookEndpoint.create({
    data: {
      ...("ownerUserId" in owner ? { ownerUserId: owner.ownerUserId } : { organizationId: owner.organizationId }),
      url,
      description: input.description ?? "",
      events,
      secretEncrypted: encryptSecret(secret),
      secretPrefix: secretPrefix(secret),
    },
    select: endpointSelect,
  });
  return { endpoint, secret };
}

async function findOwned(owner: WebhookOwner, id: string) {
  return db.webhookEndpoint.findFirst({ where: { id, ...ownerWhere(owner) } });
}

/** Turning an endpoint back on clears its failure count. Returns null when it is not the owner's. */
export async function updateEndpoint(
  owner: WebhookOwner,
  id: string,
  patch: { url?: string; description?: string; events?: string[]; enabled?: boolean },
): Promise<WebhookEndpointView | null> {
  if (!(await findOwned(owner, id))) return null;
  return db.webhookEndpoint.update({
    where: { id },
    data: {
      ...(patch.url !== undefined ? { url: await checkedUrl(patch.url) } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.events !== undefined ? { events: checkedEvents(patch.events) } : {}),
      ...(patch.enabled !== undefined
        ? { enabled: patch.enabled, ...(patch.enabled ? { consecutiveFailures: 0, disabledReason: null } : {}) }
        : {}),
    },
    select: endpointSelect,
  });
}

export async function deleteEndpoint(owner: WebhookOwner, id: string): Promise<boolean> {
  const { count } = await db.webhookEndpoint.deleteMany({ where: { id, ...ownerWhere(owner) } });
  return count > 0;
}

/** A new secret; the old one keeps signing for 24 hours so receivers can switch. */
export async function rotateSecret(owner: WebhookOwner, id: string, now = new Date()): Promise<{ secret: string } | null> {
  const endpoint = await findOwned(owner, id);
  if (!endpoint) return null;
  const secret = generateWebhookSecret();
  await db.webhookEndpoint.update({
    where: { id },
    data: {
      secretEncrypted: encryptSecret(secret),
      secretPrefix: secretPrefix(secret),
      previousSecretEncrypted: endpoint.secretEncrypted,
      previousSecretExpiresAt: new Date(now.getTime() + SECRET_OVERLAP_MS),
    },
  });
  return { secret };
}

async function queueDelivery(endpointId: string, envelope: WebhookEnvelope): Promise<string> {
  const delivery = await db.webhookDelivery.create({
    data: { endpointId, eventId: envelope.id, eventType: envelope.type, payload: envelope as Prisma.InputJsonValue },
  });
  await enqueue(deliverWebhookJob, { deliveryId: delivery.id });
  return delivery.id;
}

/**
 * Sends an event to the subscribed, enabled endpoints of a user and/or an
 * organization. Never throws, so it is safe after a payment or inside a
 * webhook handler. Returns the number of deliveries queued.
 */
export async function emitWebhook<T extends WebhookEventType>(
  type: T,
  data: WebhookEventData<T>,
  { userId, organizationId }: { userId?: string | null; organizationId?: string | null },
): Promise<number> {
  const owners = [
    ...(userId ? [{ ownerUserId: userId, organizationId: null }] : []),
    ...(organizationId ? [{ organizationId }] : []),
  ];
  if (owners.length === 0) return 0;
  try {
    const endpoints = await db.webhookEndpoint.findMany({
      where: { enabled: true, events: { has: type }, OR: owners },
      select: { id: true },
    });
    if (endpoints.length === 0) return 0;
    const envelope = buildEnvelope(type, data);
    for (const endpoint of endpoints) await queueDelivery(endpoint.id, envelope);
    return endpoints.length;
  } catch (error) {
    logger.warn("Webhook emit failed", { type, error: (error as Error).message });
    return 0;
  }
}

/** Sends `webhook.test` to one endpoint, subscribed or not. */
export async function sendTestEvent(owner: WebhookOwner, id: string): Promise<string | null> {
  const endpoint = await findOwned(owner, id);
  if (!endpoint) return null;
  return queueDelivery(endpoint.id, buildEnvelope("webhook.test", { message: "Test event from SaaS Forge" }));
}

export async function listDeliveries(
  owner: WebhookOwner,
  endpointId: string,
  { cursor, limit = 20 }: { cursor?: string; limit?: number } = {},
) {
  if (!(await findOwned(owner, endpointId))) return null;
  const rows = await db.webhookDelivery.findMany({
    where: { endpointId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      eventId: true,
      eventType: true,
      attempt: true,
      status: true,
      responseCode: true,
      durationMs: true,
      error: true,
      nextAttemptAt: true,
      createdAt: true,
    },
  });
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null };
}

/** Sends the same event (same id, so receivers can dedupe) again as a new delivery. */
export async function replayDelivery(owner: WebhookOwner, deliveryId: string): Promise<string | null> {
  const delivery = await db.webhookDelivery.findFirst({
    where: { id: deliveryId, endpoint: ownerWhere(owner) },
  });
  if (!delivery) return null;
  return queueDelivery(delivery.endpointId, delivery.payload as WebhookEnvelope);
}

import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";
import { enqueue } from "@workspace/jobs/index";
import { logger } from "@workspace/observability/winston-logger";
import { CHANNELS, type Channel, type NotificationDefinition } from "@/lib/notifications/catalog";
// scaffold:begin ai
import { CREDITS_LOW_THRESHOLD, creditsLow } from "@/lib/notifications/catalog";
// scaffold:end ai
// scaffold:begin multi_tenancy
import { organizationInvited } from "@/lib/notifications/catalog";
// scaffold:end multi_tenancy
import { deliverNotificationJob } from "@/lib/notifications/deliver";

type Client = Pick<Prisma.TransactionClient, "notification" | "notificationPreference">;

/** The channels a user receives this type on: their choices, else the type's defaults. */
export async function enabledChannels(
  userId: string,
  definition: NotificationDefinition<unknown>,
  client: Client = db,
): Promise<Set<Channel>> {
  const rows = await client.notificationPreference.findMany({ where: { userId, type: definition.type } });
  const chosen = new Map(rows.map((row) => [row.channel, row.enabled]));
  return new Set(CHANNELS.filter((channel) => chosen.get(channel) ?? definition.defaults[channel]));
}

export type NotifyOptions = {
  /** Write with this client, e.g. the caller's transaction. */
  client?: Client;
  /** Emitting the same key twice for a user notifies once (webhook retries). */
  dedupeKey?: string;
  /** Organization events show in that organization's inbox. */
  organizationId?: string | null;
};

/**
 * Notifies a user: an in-app row, and an email job, on the channels they keep
 * on. Never throws for delivery problems, so it is safe inside webhooks.
 * Returns false when this dedupe key was already used.
 */
export async function notify<T>(
  definition: NotificationDefinition<T>,
  userId: string,
  data: T,
  { client = db, dedupeKey, organizationId = null }: NotifyOptions = {},
): Promise<boolean> {
  const channels = await enabledChannels(userId, definition as NotificationDefinition<unknown>, client);
  const content = definition.render(data);

  if (channels.has("in_app")) {
    // ON CONFLICT DO NOTHING: a duplicate never aborts the caller's transaction.
    const { count } = await client.notification.createMany({
      data: [
        {
          userId,
          type: definition.type,
          title: content.title,
          body: content.body,
          link: content.link ?? null,
          data: data as Prisma.InputJsonValue,
          dedupeKey,
          organizationId,
        },
      ],
      skipDuplicates: true,
    });
    if (count === 0) return false;
  }

  if (channels.has("email")) {
    try {
      await enqueue(
        deliverNotificationJob,
        { userId, title: content.title, body: content.body, link: content.link ?? null },
        dedupeKey ? { dedupeKey: `notification:${userId}:${dedupeKey}` } : {},
      );
    } catch (error) {
      logger.warn("Notification email failed", { type: definition.type, userId, error: (error as Error).message });
    }
  }
  return true;
}

// scaffold:begin ai
/**
 * After a charge: notifies once when it took the balance down to the
 * threshold or below (again after each top-up, since the key includes the total).
 */
export async function notifyIfCreditsLow(userId: string, spent: number): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { creditsTotal: true, creditsUsed: true } });
  if (!user) return;
  const remaining = user.creditsTotal - user.creditsUsed;
  if (remaining > CREDITS_LOW_THRESHOLD || remaining + spent <= CREDITS_LOW_THRESHOLD) return;
  await notify(creditsLow, userId, { remaining: Math.max(remaining, 0) }, { dedupeKey: `credits-low:${user.creditsTotal}` });
}
// scaffold:end ai

// scaffold:begin multi_tenancy
/** Someone invited to an organization who already has an account also sees it in their inbox. */
export async function notifyInvitedUser(input: {
  email: string;
  organizationId: string;
  inviterName: string;
  invitationId: string;
}): Promise<void> {
  const invitee = await db.user.findUnique({ where: { email: input.email.toLowerCase() }, select: { id: true } });
  if (!invitee) return;
  const organization = await db.organization.findUnique({ where: { id: input.organizationId }, select: { name: true } });
  await notify(
    organizationInvited,
    invitee.id,
    {
      organizationName: organization?.name ?? "an organization",
      inviterName: input.inviterName,
      invitationId: input.invitationId,
    },
    { dedupeKey: `org-invite:${input.invitationId}` },
  );
}
// scaffold:end multi_tenancy

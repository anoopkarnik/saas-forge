import db from "@workspace/database/client";
import { CHANNELS, getNotification, listNotifications, type Channel } from "@/lib/notifications/catalog";

/** A user's inbox: personal notifications plus the active organization's. */
function inboxWhere(userId: string, organizationId: string | null) {
  return {
    userId,
    OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])],
  };
}

export type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function listInbox(userId: string, organizationId: string | null, limit = 20): Promise<InboxItem[]> {
  return db.notification.findMany({
    where: inboxWhere(userId, organizationId),
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  });
}

export function unreadCount(userId: string, organizationId: string | null): Promise<number> {
  return db.notification.count({ where: { ...inboxWhere(userId, organizationId), readAt: null } });
}

export async function markRead(userId: string, id: string) {
  await db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string, organizationId: string | null) {
  const { count } = await db.notification.updateMany({
    where: { ...inboxWhere(userId, organizationId), readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}

/** Every type with the user's channel choices filled in from the defaults. */
export async function getPreferences(userId: string) {
  const rows = await db.notificationPreference.findMany({ where: { userId } });
  const chosen = new Map(rows.map((row) => [`${row.type}:${row.channel}`, row.enabled]));
  return listNotifications().map((definition) => ({
    type: definition.type,
    label: definition.label,
    channels: Object.fromEntries(
      CHANNELS.map((channel) => [channel, chosen.get(`${definition.type}:${channel}`) ?? definition.defaults[channel]]),
    ) as Record<Channel, boolean>,
  }));
}

export class UnknownNotificationTypeError extends Error {
  name = "UnknownNotificationTypeError";
}

export async function setPreference(userId: string, type: string, channel: Channel, enabled: boolean) {
  if (!getNotification(type)) throw new UnknownNotificationTypeError(`Unknown notification type ${type}`);
  await db.notificationPreference.upsert({
    where: { userId_type_channel: { userId, type, channel } },
    create: { userId, type, channel, enabled },
    update: { enabled },
  });
}

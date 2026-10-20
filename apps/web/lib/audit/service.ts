import type { Prisma } from "@workspace/database/prisma";
import db from "@workspace/database/client";

export type AuditFilters = {
  /** A user id, or an email resolved to one. */
  actor?: string;
  /** e.g. "org." or "user.role_changed". */
  actionPrefix?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
};

export type AuditEventRow = {
  id: string;
  occurredAt: Date;
  action: string;
  actorType: string;
  actorUserId: string | null;
  actorEmail: string | null;
  actorApiKeyId: string | null;
  organizationId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: Prisma.JsonValue;
  ip: string | null;
  userAgent: string | null;
};

export const EXPORT_LIMIT = 10_000;

async function whereFor(filters: AuditFilters, organizationId?: string): Promise<Prisma.AuditEventWhereInput | null> {
  let actorUserId: string | undefined;
  if (filters.actor) {
    if (filters.actor.includes("@")) {
      const user = await db.user.findUnique({ where: { email: filters.actor.toLowerCase() }, select: { id: true } });
      if (!user) return null;
      actorUserId = user.id;
    } else {
      actorUserId = filters.actor;
    }
  }
  return {
    ...(organizationId ? { organizationId } : {}),
    ...(actorUserId ? { actorUserId } : {}),
    ...(filters.actionPrefix ? { action: { startsWith: filters.actionPrefix } } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(filters.targetId ? { targetId: filters.targetId } : {}),
    ...(filters.from || filters.to
      ? { occurredAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
  };
}

async function withActorEmails(
  rows: Array<Omit<AuditEventRow, "actorEmail">>,
): Promise<AuditEventRow[]> {
  const ids = [...new Set(rows.map((row) => row.actorUserId).filter((id): id is string => !!id))];
  const users = ids.length ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true } }) : [];
  const emails = new Map(users.map((user) => [user.id, user.email]));
  return rows.map((row) => ({ ...row, actorEmail: row.actorUserId ? (emails.get(row.actorUserId) ?? null) : null }));
}

/**
 * Newest first, `limit` per page; pass the last page's `nextCursor` to continue.
 * `organizationId` scopes the trail to one organization.
 */
export async function listAuditEvents(
  filters: AuditFilters,
  { cursor, limit = 50, organizationId }: { cursor?: string; limit?: number; organizationId?: string } = {},
): Promise<{ items: AuditEventRow[]; nextCursor: string | null }> {
  const where = await whereFor(filters, organizationId);
  if (!where) return { items: [], nextCursor: null };
  const rows = await db.auditEvent.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);
  return { items: await withActorEmails(page), nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
}

const CSV_COLUMNS = [
  "occurredAt",
  "action",
  "actorType",
  "actorEmail",
  "actorUserId",
  "actorApiKeyId",
  "organizationId",
  "targetType",
  "targetId",
  "metadata",
  "ip",
  "userAgent",
] as const;

function csvCell(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  // Quote everything; a leading =, +, - or @ would run as a formula in a spreadsheet.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** The filtered trail as CSV, newest first, at most EXPORT_LIMIT rows. */
export async function exportAuditCsv(filters: AuditFilters): Promise<{ csv: string; truncated: boolean }> {
  const where = await whereFor(filters);
  const rows = where
    ? await db.auditEvent.findMany({ where, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: EXPORT_LIMIT + 1 })
    : [];
  const items = await withActorEmails(rows.slice(0, EXPORT_LIMIT));
  const lines = [CSV_COLUMNS.join(","), ...items.map((row) => CSV_COLUMNS.map((column) => csvCell(row[column])).join(","))];
  return { csv: lines.join("\n"), truncated: rows.length > EXPORT_LIMIT };
}

/** Retention: deletes events older than `days` (0 keeps everything). Returns the count. */
export async function deleteAuditEventsOlderThan(days: number, now = new Date()): Promise<number> {
  if (days <= 0) return 0;
  const { count } = await db.auditEvent.deleteMany({
    where: { occurredAt: { lt: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) } },
  });
  return count;
}

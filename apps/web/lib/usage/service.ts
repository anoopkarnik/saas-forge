import db from "@workspace/database/client";
import { METERS, meterLabel, type MeterDefinition } from "@/lib/usage/meters";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function usageSummary(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { creditsTotal: true, creditsUsed: true } });
  const creditsTotal = user?.creditsTotal ?? 0;
  const creditsUsed = user?.creditsUsed ?? 0;
  const alert = await db.usageAlert.findFirst({
    where: { userId, cycle: creditsTotal },
    orderBy: { threshold: "desc" },
    select: { threshold: true, createdAt: true },
  });
  return { creditsTotal, creditsUsed, remaining: Math.max(creditsTotal - creditsUsed, 0), alert };
}

/** Credits per day and meter over the last `days` days (oldest first), for the stacked chart. */
export async function dailyUsage(userId: string, days: number, now = new Date()) {
  const since = new Date(now.getTime() - days * DAY_MS);
  const events = await db.usageEvent.findMany({
    where: { userId, occurredAt: { gte: since }, NOT: { meter: "balance.opening" } },
    select: { meter: true, credits: true, occurredAt: true },
  });
  const meters = [...new Set(events.map((event) => event.meter))].sort();
  const byDay = new Map<string, Record<string, number>>();
  for (let offset = days - 1; offset >= 0; offset--) {
    byDay.set(new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10), {});
  }
  for (const event of events) {
    const day = byDay.get(event.occurredAt.toISOString().slice(0, 10));
    if (day) day[event.meter] = (day[event.meter] ?? 0) + event.credits;
  }
  return {
    meters: meters.map((meter) => ({ meter, label: meterLabel(meter) })),
    days: [...byDay].map(([date, totals]) => ({ date, ...totals })),
  };
}

export async function recentUsage(userId: string, { cursor, limit = 25 }: { cursor?: string; limit?: number } = {}) {
  const rows = await db.usageEvent.findMany({
    where: { userId },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, meter: true, quantity: true, credits: true, sourceType: true, sourceId: true, occurredAt: true },
  });
  const items = rows.slice(0, limit).map((row) => ({ ...row, label: meterLabel(row.meter) }));
  return { items, nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null };
}

export type LedgerEntry = {
  id: string;
  at: Date;
  kind: "purchase" | "usage";
  label: string;
  /** Credits spent (usage) or money paid in minor units (purchase). */
  credits: number | null;
  amount: number | null;
  currency: string | null;
};

/** "Why did my balance change": purchases and spend, newest first. */
export async function balanceLedger(userId: string, limit = 50): Promise<LedgerEntry[]> {
  const [purchases, usage] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
      select: { id: true, date: true, description: true, amount: true, currency: true },
    }),
    db.usageEvent.findMany({
      where: { userId },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { id: true, occurredAt: true, meter: true, credits: true },
    }),
  ]);
  return [
    ...purchases.map((p): LedgerEntry => ({
      id: p.id,
      at: p.date,
      kind: "purchase",
      label: p.description,
      credits: null,
      amount: p.amount,
      currency: p.currency,
    })),
    ...usage.map((u): LedgerEntry => ({
      id: u.id,
      at: u.occurredAt,
      kind: "usage",
      label: meterLabel(u.meter),
      credits: u.credits,
      amount: null,
      currency: null,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);
}

export function meterTable(): Array<{ meter: string } & MeterDefinition> {
  return Object.entries(METERS as Record<string, MeterDefinition>).map(([meter, definition]) => ({ meter, ...definition }));
}

/**
 * Users whose events no longer add up to creditsUsed (only users with events;
 * the first event of a user carries their opening balance).
 */
export async function findUsageDrift(): Promise<Array<{ userId: string; creditsUsed: number; ledger: number }>> {
  const sums = await db.usageEvent.groupBy({ by: ["userId"], _sum: { credits: true } });
  if (sums.length === 0) return [];
  const users = await db.user.findMany({
    where: { id: { in: sums.map((row) => row.userId) } },
    select: { id: true, creditsUsed: true },
  });
  const used = new Map(users.map((user) => [user.id, user.creditsUsed]));
  return sums
    .map((row) => ({ userId: row.userId, creditsUsed: used.get(row.userId) ?? 0, ledger: row._sum.credits ?? 0 }))
    .filter((row) => row.creditsUsed !== row.ledger);
}

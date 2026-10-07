import type { Prisma } from "@workspace/database/prisma";
import { logger } from "@workspace/observability/winston-logger";
// scaffold:begin notifications
import { usageThreshold } from "@/lib/notifications/catalog";
import { notify } from "@/lib/notifications/notify";
// scaffold:end notifications

/**
 * The usage ledger (billing module). Every credit spent is a UsageEvent, so a
 * balance can be explained. Without billing, a stub with the same signature
 * only moves User.creditsUsed (scaffold-modules/billing overrides).
 */

type Client = Pick<Prisma.TransactionClient, "user" | "usageEvent" | "usageAlert">;

export type UsageInput = {
  userId: string;
  organizationId?: string | null;
  /** A meter from ./meters, e.g. "ai.tokens". */
  meter: string;
  quantity: number;
  /** Credits this usage costs (negative for a refund). */
  credits: number;
  sourceType: string;
  sourceId?: string | null;
  /** The same key twice records and charges once (request retries). */
  idempotencyKey: string;
};

/** Percent of a credit cycle (the current creditsTotal) that raises an alert. */
export const USAGE_ALERT_THRESHOLDS = [80, 95];

/**
 * Users who spent credits before the ledger existed get one opening event, so
 * the sum of their events keeps matching creditsUsed. `applied` is the part of
 * creditsUsed the caller already changed in this transaction.
 */
async function ensureOpeningBalance(tx: Client, userId: string, applied: number): Promise<void> {
  if (await tx.usageEvent.findFirst({ where: { userId }, select: { id: true } })) return;
  const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsUsed: true } });
  const opening = (user?.creditsUsed ?? 0) - applied;
  if (opening === 0) return;
  await tx.usageEvent.createMany({
    data: [
      {
        userId,
        meter: "balance.opening",
        quantity: 0,
        credits: opening,
        sourceType: "opening",
        idempotencyKey: `opening:${userId}`,
      },
    ],
    skipDuplicates: true,
  });
}

/** ON CONFLICT DO NOTHING on the idempotency key; false when it was already recorded. */
async function insertEvent(tx: Client, input: UsageInput): Promise<boolean> {
  const { count } = await tx.usageEvent.createMany({
    data: [
      {
        userId: input.userId,
        organizationId: input.organizationId ?? null,
        meter: input.meter,
        quantity: input.quantity,
        credits: input.credits,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        idempotencyKey: input.idempotencyKey,
      },
    ],
    skipDuplicates: true,
  });
  return count > 0;
}

/** Records alerts for the thresholds this charge crossed, once per cycle each. Returns the new ones. */
async function crossedThresholds(tx: Client, userId: string, spent: number): Promise<Array<{ percent: number; remaining: number }>> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { creditsTotal: true, creditsUsed: true } });
  if (!user || user.creditsTotal <= 0) return [];
  const crossed = USAGE_ALERT_THRESHOLDS.filter((percent) => {
    const line = (user.creditsTotal * percent) / 100;
    return user.creditsUsed >= line && user.creditsUsed - spent < line;
  });
  const alerts = [];
  for (const percent of crossed) {
    const { count } = await tx.usageAlert.createMany({
      data: [{ userId, threshold: percent, cycle: user.creditsTotal }],
      skipDuplicates: true,
    });
    if (count > 0) alerts.push({ percent, remaining: Math.max(user.creditsTotal - user.creditsUsed, 0) });
  }
  return alerts;
}

/**
 * Charges usage: records the event and increments creditsUsed in the caller's
 * transaction, unless the idempotency key was already used. Threshold alerts
 * are returned for `announceUsageAlerts` once the transaction commits.
 */
export async function recordUsage(
  tx: Client,
  input: UsageInput,
): Promise<{ charged: boolean; alerts: Array<{ percent: number; remaining: number }> }> {
  await ensureOpeningBalance(tx, input.userId, 0);
  if (!(await insertEvent(tx, input))) return { charged: false, alerts: [] };
  if (input.credits !== 0) {
    await tx.user.update({ where: { id: input.userId }, data: { creditsUsed: { increment: input.credits } } });
  }
  return { charged: true, alerts: input.credits > 0 ? await crossedThresholds(tx, input.userId, input.credits) : [] };
}

/** Records usage whose credits the caller already moved (e.g. the scaffold ledger). */
export async function logUsage(tx: Client, input: UsageInput): Promise<boolean> {
  await ensureOpeningBalance(tx, input.userId, input.credits);
  return insertEvent(tx, input);
}

/** After commit: tells the user about crossed thresholds (the Usage page shows them either way). */
export async function announceUsageAlerts(userId: string, alerts: Array<{ percent: number; remaining: number }>): Promise<void> {
  if (alerts.length === 0) return;
  logger.info("Usage threshold reached", { userId, thresholds: alerts.map((alert) => alert.percent) });
  // scaffold:begin notifications
  for (const alert of alerts) {
    await notify(usageThreshold, userId, alert, { dedupeKey: `usage-threshold:${userId}:${alert.percent}:${alert.remaining}` });
  }
  // scaffold:end notifications
}

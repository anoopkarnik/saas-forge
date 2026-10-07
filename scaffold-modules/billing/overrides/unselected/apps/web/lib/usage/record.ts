import type { Prisma } from "@workspace/database/prisma";

/**
 * Without the billing module there is no usage ledger: spending credits only
 * moves User.creditsUsed. Same signatures as the billing version, so callers
 * (AI chat) need no changes.
 */

type Client = Pick<Prisma.TransactionClient, "user">;

export type UsageInput = {
  userId: string;
  organizationId?: string | null;
  meter: string;
  quantity: number;
  credits: number;
  sourceType: string;
  sourceId?: string | null;
  idempotencyKey: string;
};

export async function recordUsage(
  tx: Client,
  input: UsageInput,
): Promise<{ charged: boolean; alerts: Array<{ percent: number; remaining: number }> }> {
  if (input.credits !== 0) {
    await tx.user.update({ where: { id: input.userId }, data: { creditsUsed: { increment: input.credits } } });
  }
  return { charged: true, alerts: [] };
}

/** No ledger, no alerts. */
export const announceUsageAlerts: (userId: string, alerts: Array<{ percent: number; remaining: number }>) => Promise<void> =
  async () => {};

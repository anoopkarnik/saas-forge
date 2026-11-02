import db from "@workspace/database/client";

export type CreditPurchase = {
  userId: string;
  credits: number;
  eventId: string;
  checkoutSessionId: string;
  amount: number;
  currency: string;
};

/** Returns true only when this call committed the purchase and its credits. */
export async function recordCreditPurchase(
  purchase: CreditPurchase,
  receipt: () => Promise<string | null> = async () => null,
): Promise<boolean> {
  const where = { checkoutSessionId: purchase.checkoutSessionId };
  if (await db.transaction.findFirst({ where })) return false;
  try {
    return await db.$transaction(async (tx) => {
      // A concurrent delivery can have committed after the fast duplicate check.
      if (await tx.transaction.findFirst({ where })) return false;
      const { credits, ...transaction } = purchase;
      await tx.transaction.create({
        data: {
          ...transaction,
          receiptUrl: await receipt(),
          description: "Credit Purchase",
        },
      });
      await tx.user.update({
        where: { id: purchase.userId },
        data: { creditsTotal: { increment: credits } },
      });
      return true;
    });
  } catch (error) {
    // The unique checkout ID is the final defense against concurrent deliveries.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    )
      return false;
    throw error;
  }
}

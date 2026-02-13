import { NextRequest, NextResponse } from "next/server";

// Conditionally initialize webhooks only when DODO_PAYMENTS_WEBHOOK_KEY is configured
let webhookHandler: ((req: NextRequest) => Promise<NextResponse>) | null = null;

if (process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
  // Dynamic import is not needed; we guard with a runtime check
  const { Webhooks } = require("@dodopayments/nextjs");
  const db = require("@workspace/database/client").default;
  const { revalidatePath } = require("next/cache");

  webhookHandler = Webhooks({
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    onSubscriptionActive: async (payload: any) => {
      console.log("Received onSubscriptionActive webhook:", payload);
      // Add your business logic here
    },
    onPaymentSucceeded: async (payload: any) => {
      const credits = payload?.data?.metadata?.credits;
      const userId = payload?.data?.metadata?.userId;
      const currency = payload?.data?.settlement_currency;
      const amount = payload?.data?.total_amount;

      if (!credits || !userId) {
        throw new Error("Invalid payload");
      }

      await db.user.update({
        where: {
          id: userId,
        },
        data: {
          creditsTotal: {
            increment: Number(credits),
          },
        },
      });

      await db.transaction.create({
        data: {
          userId,
          eventId: payload?.data?.payment_id,
          description: "Credit Purchase",
          amount: Number(amount),
          currency: currency,
        },
      });

      // Revalidate the billing page cache so updated credits show immediately
      revalidatePath("/(home)");
    },
  });
}

export async function POST(req: NextRequest) {
  if (!webhookHandler) {
    return NextResponse.json(
      { error: "Payment gateway is not configured" },
      { status: 503 }
    );
  }
  return webhookHandler(req);
}

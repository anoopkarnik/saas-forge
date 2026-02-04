import { Webhooks } from "@dodopayments/nextjs";
import db from "@workspace/database/client";

export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,
  onSubscriptionActive: async (payload) => {
    console.log("Received onSubscriptionActive webhook:", payload);
    // Add your business logic here
  },
  onPaymentSucceeded: async (payload) => {
    const credits = payload?.data?.metadata?.credits;
    const userId = payload?.data?.metadata?.userId;
    
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
        amount: Number(credits),
        currency: "USD",
      },
    });
    
  },
});

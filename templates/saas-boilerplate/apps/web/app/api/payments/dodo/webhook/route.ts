import { Webhooks } from "@dodopayments/nextjs";
import db from "@workspace/database/client";
import { revalidatePath } from "next/cache";

export const POST = Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,
  onSubscriptionActive: async (payload) => {
    console.log("Received onSubscriptionActive webhook:", payload);
    // Add your business logic here
  },
  onPaymentSucceeded: async (payload) => {
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

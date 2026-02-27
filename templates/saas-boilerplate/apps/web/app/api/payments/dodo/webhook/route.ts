import { NextRequest, NextResponse } from "next/server";

let webhookHandler: ((req: NextRequest) => Promise<NextResponse>) | null = null;
let isInitialized = false;

async function initWebhook() {
  if (isInitialized) return;
  isInitialized = true;

  if (process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    const { Webhooks } = await import("@dodopayments/nextjs");
    const { default: db } = await import("@workspace/database/client");
    const { revalidatePath } = await import("next/cache");

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
}

export async function POST(req: NextRequest) {
  await initWebhook();
  
  if (!webhookHandler) {
    return NextResponse.json(
      { error: "Payment gateway is not configured" },
      { status: 503 }
    );
  }
  return webhookHandler(req);
}

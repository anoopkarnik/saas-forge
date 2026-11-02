import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  processDodoPaymentFailed,
  processDodoPaymentSucceeded,
} from "@workspace/billing/payments/dodo";

export async function POST(req: NextRequest) {
  if (!process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    return NextResponse.json(
      { error: "Payment gateway is not configured" },
      { status: 503 },
    );
  }
  const { Webhooks } = await import("@dodopayments/nextjs");
  const webhookHandler = Webhooks({
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    onSubscriptionActive: async (payload) => {
      console.log("Received onSubscriptionActive webhook:", payload);
    },
    onPaymentFailed: processDodoPaymentFailed,
    onPaymentSucceeded: async (payload) => {
      if (
        await processDodoPaymentSucceeded(
          payload,
          process.env.NEXT_PUBLIC_DODO_PAYMENTS_URL,
        )
      ) {
        revalidatePath("/", "layout");
      }
    },
  });
  return webhookHandler(req);
}

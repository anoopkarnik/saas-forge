import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@workspace/billing/providers/stripe";
import { processStripeEvent } from "@workspace/billing/payments/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripeClient();
  const body = await request.text();
  const signature = (await headers()).get("Stripe-Signature") as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "Webhook Error: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 400 },
    );
  }
  const result = await processStripeEvent(event);
  return NextResponse.json(result.body, { status: result.status });
}

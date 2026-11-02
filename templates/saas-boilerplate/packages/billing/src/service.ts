import db from "@workspace/database/client";
import { BillingError } from "./errors";
// scaffold:begin payment_gateway.dodo
import { getDodoClient } from "./providers/dodo";
// scaffold:end payment_gateway.dodo
// scaffold:begin payment_gateway.stripe
import { getStripeClient } from "./providers/stripe";
// scaffold:end payment_gateway.stripe

const CREDITS_PER_UNIT = 50;

export async function createBillingCustomer(
  gateway: string,
  input: { email: string; name: string },
) {
  // scaffold:begin payment_gateway.stripe
  if (gateway === "stripe") return getStripeClient().customers.create(input);
  // scaffold:end payment_gateway.stripe
  // scaffold:begin payment_gateway.dodo
  if (gateway !== "stripe") return getDodoClient().customers.create(input);
  // scaffold:end payment_gateway.dodo
  throw new BillingError(
    "PRECONDITION_FAILED",
    "No payment gateway is configured",
  );
}

export type CheckoutInput = {
  credits: number;
  user: { id: string; email: string; name?: string | null };
  gateway: string;
  appUrl: string;
};

export async function createCheckoutSession({
  credits,
  user,
  gateway,
  appUrl,
}: CheckoutInput): Promise<{ checkoutUrl: string | null | undefined }> {
  if (credits % CREDITS_PER_UNIT !== 0) {
    throw new BillingError("BAD_REQUEST", "Credits must be a multiple of 50");
  }
  const quantity = credits / CREDITS_PER_UNIT;
  if (quantity < 1)
    throw new BillingError("BAD_REQUEST", "Quantity out of range");
  // scaffold:begin payment_gateway.stripe
  if (gateway === "stripe") {
    const session = await getStripeClient().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${credits} Credits` },
            unit_amount: quantity * 50,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}?payment=success`,
      cancel_url: appUrl,
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      metadata: { userId: String(user.id), credits: String(credits) },
    });
    return { checkoutUrl: session.url };
  }
  // scaffold:end payment_gateway.stripe
  // scaffold:begin payment_gateway.dodo
  if (gateway !== "stripe") {
    const session = await getDodoClient().checkoutSessions.create({
      product_cart: [
        { product_id: process.env.DODO_CREDITS_PRODUCT_ID!, quantity },
      ],
      return_url: `${appUrl}?payment=success`,
      customer: {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      },
      metadata: { userId: String(user.id), credits: String(credits) },
    });
    return { checkoutUrl: session.checkout_url };
  }
  // scaffold:end payment_gateway.dodo
  throw new BillingError(
    "PRECONDITION_FAILED",
    "No payment gateway is configured",
  );
}

export async function getTransactions(userId: string) {
  return db.transaction.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
}

export async function getCreditsBalance(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { creditsTotal: true, creditsUsed: true },
  });
  return {
    creditsTotal: user?.creditsTotal ?? 0,
    creditsUsed: user?.creditsUsed ?? 0,
  };
}

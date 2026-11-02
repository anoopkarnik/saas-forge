import Stripe from "stripe";
import { BillingError } from "../errors";

let _stripeClient: Stripe | null = null;
export function getStripeClient(): Stripe {
  if (!_stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new BillingError(
        "PRECONDITION_FAILED",
        "Stripe payment gateway is not configured",
      );
    }
    _stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripeClient;
}

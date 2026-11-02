import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { BillingError } from "@workspace/billing/errors";
import {
  createBillingCustomer,
  createCheckoutSession,
  getTransactions,
  getCreditsBalance,
} from "@workspace/billing/service";
// scaffold:begin analytics
import { track } from "@workspace/analytics/server";
// scaffold:end analytics

// The selected provider's scaffold manifest pins this default.
const DEFAULT_PAYMENT_GATEWAY = "dodo";
const paymentGateway = () =>
  process.env.NEXT_PUBLIC_PAYMENT_GATEWAY || DEFAULT_PAYMENT_GATEWAY;

async function billingCall<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof BillingError)
      throw new TRPCError({ code: error.code, message: error.message });
    throw error;
  }
}

export const billingRouter = createTRPCRouter({
  createNewCustomer: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email address"),
        name: z.string().min(1, "Name is required"),
      }),
    )
    .mutation(({ input }) =>
      billingCall(() => createBillingCustomer(paymentGateway(), input)),
    ),
  createCheckoutSession: protectedProcedure
    .input(z.object({ credits: z.number().int().positive() }))
    .mutation(
      async ({
        input,
        ctx,
      }): Promise<{ checkoutUrl: string | null | undefined }> => {
        const userId = ctx.session.user.id;
        if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
        const gateway = paymentGateway();
        const result = await billingCall(() =>
          createCheckoutSession({
            credits: input.credits,
            user: ctx.session.user,
            gateway,
            appUrl: process.env.NEXT_PUBLIC_URL || "http://localhost:3000",
          }),
        );
        // scaffold:begin analytics
        await track(
          "billing.checkout_started",
          { credits: input.credits, gateway },
          { distinctId: userId, headers: ctx.headers },
        );
        // scaffold:end analytics
        return result;
      },
    ),
  getTransactions: protectedProcedure.query(({ ctx }) =>
    getTransactions(ctx.session.user.id),
  ),
  getCreditsBalance: protectedProcedure.query(({ ctx }) =>
    getCreditsBalance(ctx.session.user.id),
  ),
});

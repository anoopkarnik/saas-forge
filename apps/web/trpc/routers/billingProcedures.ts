import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import DodoPayments from 'dodopayments';
import Stripe from 'stripe';
import { z } from "zod";
import db from "@workspace/database/client";
import { TRPCError } from "@trpc/server";

let _dodoClient: DodoPayments | null = null;
function getDodoClient(): DodoPayments {
  if (!_dodoClient) {
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Dodo payment gateway is not configured" });
    }
    _dodoClient = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: (process.env.DODO_PAYMENTS_ENVIRONMENT || 'live_mode') as 'test_mode' | 'live_mode',
    });
  }
  return _dodoClient;
}

let _stripeClient: Stripe | null = null;
function getStripeClient(): Stripe {
  if (!_stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe payment gateway is not configured" });
    }
    _stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    });
  }
  return _stripeClient;
}

const CREDITS_PER_UNIT = 50; // example: 1 quantity = 50 credits

export const billingRouter = createTRPCRouter({   
    createNewCustomer: protectedProcedure
    .input( z.object({
      email: z.string().email("Invalid email address"),
      name: z.string().min(1, "Name is required"),
    }))
    .mutation(async ({ input }) => {
      const gateway = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY;
      
      if (gateway === 'stripe') {
        const response = await getStripeClient().customers.create({
          email: input.email,
          name: input.name,
        });
        return response;
      }

      const response = await getDodoClient().customers.create({
        email: input.email,
        name: input.name,
      });
      return response;
    }),
    createCheckoutSession: protectedProcedure
    .input(z.object({credits: z.number().int().positive()}))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (input.credits % CREDITS_PER_UNIT !== 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Credits must be a multiple of 50" });
      }
      const quantity = input.credits / CREDITS_PER_UNIT;

      if (quantity < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quantity out of range" });
      }

      const gateway = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY;

      if (gateway === 'stripe') {
        const session = await getStripeClient().checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `${input.credits} Credits`
                },
                unit_amount: quantity * 50
              },
              quantity: 1
            }
          ],
          mode: 'payment',
          success_url: `${process.env.NEXT_PUBLIC_URL}`,
          cancel_url: `${process.env.NEXT_PUBLIC_URL}`,
          client_reference_id: userId,
          customer_email: ctx.session.user.email ?? undefined,
          metadata: { userId: String(userId), credits: String(input.credits) }
        });
        
        return { checkoutUrl: session.url };
      }

      const session = await getDodoClient().checkoutSessions.create({
        product_cart: [
        { product_id: process.env.DODO_CREDITS_PRODUCT_ID!, quantity }
            ],
            return_url: `${process.env.NEXT_PUBLIC_URL}`,
            customer: {
              email: ctx.session.user.email ?? undefined,
              name: ctx.session.user.name ?? undefined,
            },
            metadata: { userId: String(userId), credits: String(input.credits) }
          });
      
      return { checkoutUrl: session.checkout_url };
    }),
    getTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const transactions = await (db as any).transaction.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          date: "desc",
        },
      });
      return transactions as {
        id: string;
        userId: string;
        eventId: string;
        checkoutSessionId: string | null;
        receiptUrl: string | null;
        description: string;
        amount: number;
        currency: string;
        date: Date;
        createdAt: Date;
        updatedAt: Date;
      }[];
    }),
    getCreditsBalance: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { creditsTotal: true, creditsUsed: true }
      });
      return {
        creditsTotal: user?.creditsTotal ?? 0,
        creditsUsed: user?.creditsUsed ?? 0,
      };
    }),
});
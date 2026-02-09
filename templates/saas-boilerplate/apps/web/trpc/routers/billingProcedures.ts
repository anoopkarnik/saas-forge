import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import DodoPayments from 'dodopayments';
import { z } from "zod";
import db from "@workspace/database/client";
import { TRPCError } from "@trpc/server";

const client = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY, // This is the default and can be omitted
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT! as  'test_mode' | 'live_mode', // defaults to 'live_mode'
});

const CREDITS_PER_UNIT = 50; // example: 1 quantity = 50 credits

export const billingRouter = createTRPCRouter({   
    createNewCustomer: protectedProcedure
    .input( z.object({
      email: z.string().email("Invalid email address"),
      name: z.string().min(1, "Name is required"),
    }))
    .mutation(async ({ input }) => {
      const response = await client.customers.create({
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

      const session = await client.checkoutSessions.create({
        product_cart: [
        { product_id: process.env.DODO_CREDITS_PRODUCT_ID!, quantity }
            ],
            return_url: `${process.env.NEXT_PUBLIC_URL}/billing`,
            customer: {
              email: ctx.session.user.email ?? undefined,
              name: ctx.session.user.name ?? undefined,
            },
            metadata: { userId: String(userId), credits: String(input.credits) }
          });
      
      console.log("Checkout session created:", session);

      return { checkoutUrl: session.checkout_url };
    }),
    getTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const transactions = await db.transaction.findMany({
        where: {
          userId: userId,
        },
        orderBy: {
          date: "desc",
        },
      });
      return transactions;
    }),
});
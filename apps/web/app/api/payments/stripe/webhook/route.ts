import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import db from "@workspace/database/client"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover'
});

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = (await headers()).get("Stripe-Signature") as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (error) {
        return NextResponse.json({
            error: "Webhook Error: " + (error instanceof Error ? error.message : "Unknown error"),
        }, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    console.log(`[Stripe Webhook] Event: ${event.type}, ID: ${event.id}, Session: ${session.id}`);

    if (event.type === "checkout.session.completed") {
        const credits = Number(session.metadata?.['credits']);
        const userId = session.client_reference_id;
        
        if (!credits || !userId) {
            return NextResponse.json({
                error: "Missing userId or credits",
            }, { status: 400 });
        }

        // Idempotency: check by checkout session ID (stays the same across Stripe retries/recoveries)
        const existingTx = await db.transaction.findFirst({
            where: { checkoutSessionId: session.id }
        });

        if (existingTx) {
            console.log(`[Stripe Webhook] Ignoring duplicate checkout session: ${session.id} (event: ${event.id})`);
            return NextResponse.json({
                message: "Event already processed",
            }, { status: 200 });
        }

        try {
            await db.$transaction(async (tx:any) => {
                // Re-check INSIDE the transaction to prevent TOCTOU race condition
                const alreadyProcessed = await tx.transaction.findFirst({
                    where: { checkoutSessionId: session.id }
                });
                if (alreadyProcessed) {
                    console.log(`[Stripe Webhook] Duplicate ignored (inside tx): ${session.id}`);
                    return;
                }

                // Retrieve receipt URL from the payment intent's charge
                let receiptUrl: string | null = null;
                try {
                    if (session.payment_intent) {
                        const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
                            expand: ['latest_charge']
                        });
                        const charge = paymentIntent.latest_charge as Stripe.Charge;
                        receiptUrl = charge?.receipt_url ?? null;
                    }
                } catch (e) {
                    console.warn(`[Stripe Webhook] Could not retrieve receipt URL for session ${session.id}:`, e);
                }

                await tx.transaction.create({
                    data: {
                        userId,
                        eventId: event.id,
                        checkoutSessionId: session.id,
                        receiptUrl,
                        description: "Credit Purchase",
                        amount: Number(session.amount_total),
                        currency: session.currency || "USD",
                    },
                });

                await tx.user.update({
                    where: { id: userId },
                    data: {
                        creditsTotal: {
                            increment: credits
                        }
                    }
                });

                console.log(`[Stripe Webhook] Credits +${credits} for user ${userId} (session: ${session.id})`);
            });

            console.log(`[Stripe Webhook] Credits +${credits} for user ${userId} (session: ${session.id})`);
            return NextResponse.json({
                message: "Checkout session completed and credits updated",
            }, { status: 200 });

        } catch (error: any) {
            // P2002 = unique constraint on checkoutSessionId — race condition fallback
            if (error?.code === 'P2002') {
                console.log(`[Stripe Webhook] Race condition caught — duplicate session: ${session.id}`);
                return NextResponse.json({
                    message: "Event already processed",
                }, { status: 200 });
            }
            console.error("[Stripe Webhook] Error processing payment:", error);
            return NextResponse.json({
                error: "Failed to process payment",
            }, { status: 500 });
        }
    }

    return NextResponse.json({
        message: "Stripe webhook received but not processed",
    })
}
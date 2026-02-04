"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Slider } from "@workspace/ui/components/shadcn/slider";
import { Button } from "@workspace/ui/components/shadcn/button";

// ✅ adjust this import path to wherever your trpc client is exported
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

const CreditsPurchase = () => {
    const [creditsToBuy, setCreditsToBuy] = useState<number[]>([100]);

    const creditsToBuyAmount = creditsToBuy[0] ?? 100;
    const trpc = useTRPC();

    // You were doing dollars as (credits/50).toFixed(2) in your original.
    // That means: 50 credits = $1.00, 100 credits = $2.00, etc.
    const price = useMemo(() => (creditsToBuyAmount / 50).toFixed(2), [creditsToBuyAmount]);


    // ✅ tRPC mutation
    const createCheckout = useMutation(
        trpc.billing.createCheckoutSession.mutationOptions({
            onSuccess: ({ checkoutUrl }) => {
                // redirect user to Dodo hosted checkout
                if (checkoutUrl) {
                    window.location.href = checkoutUrl;
                }
            },
            onError: (err) => {
                // you can replace with toast if you have one
                console.error(err);
                alert(err.message || "Failed to create checkout session");
            },
        })
    );


    return (
        <Card className="bg-sidebar">
            <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Purchase Credits
                </CardTitle>
                <CardDescription>
                    <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <p>Around 20 credits are required to download a basic boilerplate</p>
                    </div>
                </CardDescription>
            </CardHeader>

            <CardContent>


                <div className="h-4" />

                <Slider
                    defaultValue={[100]}
                    max={1000}
                    min={50}
                    step={50}
                    onValueChange={(value) => setCreditsToBuy(value)}
                    value={creditsToBuy}
                    disabled={createCheckout.isPending}
                />

                <div className="h-4" />

                <Button
                    disabled={createCheckout.isPending}
                    onClick={() => createCheckout.mutate({ credits: creditsToBuyAmount })}
                >
                    {createCheckout.isPending
                        ? "Redirecting…"
                        : `Buy ${creditsToBuyAmount} Credits for $${price}`}
                </Button>
            </CardContent>

            <CardFooter className="flex items-center gap-4" />
        </Card>
    );
};

export default CreditsPurchase;

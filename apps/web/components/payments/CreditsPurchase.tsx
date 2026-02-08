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
import { Check, Info, Zap } from "lucide-react";
import { Slider } from "@workspace/ui/components/shadcn/slider";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Badge } from "@workspace/ui/components/shadcn/badge";

// ✅ adjust this import path to wherever your trpc client is exported
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

const CreditsPurchase = () => {
    const [creditsToBuy, setCreditsToBuy] = useState<number[]>([100]);

    const creditsToBuyAmount = creditsToBuy[0] ?? 100;
    const trpc = useTRPC();

    const price = useMemo(() => (creditsToBuyAmount / 50).toFixed(2), [creditsToBuyAmount]);

    // ✅ tRPC mutation
    const createCheckout = useMutation(
        trpc.billing.createCheckoutSession.mutationOptions({
            onSuccess: ({ checkoutUrl }) => {
                if (checkoutUrl) {
                    window.location.href = checkoutUrl;
                }
            },
            onError: (err) => {
                console.error(err);
                alert(err.message || "Failed to create checkout session");
            },
        })
    );


    return (
        <Card className="h-full border-muted/60 shadow-sm flex flex-col relative overflow-hidden">
            {creditsToBuyAmount >= 500 && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                    Best Value
                </div>
            )}

            <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Top Up Credits</CardTitle>
                <CardDescription>
                    Purchase one-time credits to continue using premium features.
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-8">
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-3xl font-bold text-foreground">{creditsToBuyAmount}</span>
                            <span className="text-sm text-muted-foreground ml-1 font-medium">Credits</span>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary">${price}</div>
                            <div className="text-xs text-muted-foreground">One-time payment</div>
                        </div>
                    </div>

                    <Slider
                        defaultValue={[100]}
                        max={1000}
                        min={50}
                        step={50}
                        onValueChange={(value) => setCreditsToBuy(value)}
                        value={creditsToBuy}
                        disabled={createCheckout.isPending}
                        className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground px-1">
                        <span>50</span>
                        <span>500</span>
                        <span>1000</span>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>Instant delivery to your account</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>Never expires</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2">
                <Button
                    className="w-full h-11 text-base font-semibold shadow-md active:scale-[0.98] transition-all"
                    disabled={createCheckout.isPending}
                    onClick={() => createCheckout.mutate({ credits: creditsToBuyAmount })}
                >
                    {createCheckout.isPending
                        ? "Redirecting to Checkout..."
                        : `Purchase ${creditsToBuyAmount} Credits`}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default CreditsPurchase;

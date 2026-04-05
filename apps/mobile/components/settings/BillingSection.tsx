import React, { useEffect, useState, useMemo } from "react";
import { View, ActivityIndicator, Linking, Alert, Platform } from "react-native";
import { Label, MutedText, Button } from "@/components/common";
import Slider from "@react-native-community/slider";
import {
    fetchTransactions,
    createCheckoutSession,
    type Transaction,
} from "@/lib/billing-api";
import { useCredits } from "@/lib/credits-provider";

function formatAmount(amount: number, currency: string = "USD") {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
    }).format(amount / 100);
}

function formatDate(date: Date | string | number) {
    return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    }).format(new Date(date));
}

export default function BillingSection() {
    const { credits, refreshCredits } = useCredits();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [creditsToBuy, setCreditsToBuy] = useState(100);
    const [isPurchasing, setIsPurchasing] = useState(false);

    const price = useMemo(() => (creditsToBuy / 50).toFixed(2), [creditsToBuy]);
    const availableCredits = credits
        ? credits.creditsTotal - credits.creditsUsed
        : 0;

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setIsLoading(true);
        try {
            const txns = await fetchTransactions();
            setTransactions(txns);
        } catch (err) {
            console.error("Failed to load billing data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const { checkoutUrl } = await createCheckoutSession(creditsToBuy);
            if (checkoutUrl) {
                await Linking.openURL(checkoutUrl);
                // Credits will auto-refresh when app returns to foreground
            }
        } catch (err: any) {
            const message = err?.message || "Failed to create checkout session";
            if (Platform.OS === "web") {
                window.alert(message);
            } else {
                Alert.alert("Error", message);
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    const paymentGateway = process.env.EXPO_PUBLIC_PAYMENT_GATEWAY;
    if (!paymentGateway || paymentGateway === "none") return null;

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Plans & Billing
            </MutedText>

            {isLoading ? (
                <View className="rounded-xl bg-card border border-border/30 p-8 items-center">
                    <ActivityIndicator size="small" />
                </View>
            ) : (
                <>
                    {/* Balance Card */}
                    <View className="rounded-xl bg-primary/10 border border-primary/20 p-5 mb-3">
                        <MutedText className="text-xs font-medium mb-1">
                            Available Balance
                        </MutedText>
                        <View className="flex-row items-baseline gap-1">
                            <Label className="text-4xl font-extrabold tracking-tight">
                                {availableCredits.toLocaleString()}
                            </Label>
                            <MutedText className="text-sm font-medium">
                                Credits
                            </MutedText>
                        </View>
                        <MutedText className="text-xs mt-2">
                            Use credits to generate content and perform AI actions.
                        </MutedText>
                    </View>

                    {/* Top Up Credits */}
                    <View className="rounded-xl bg-card border border-border/30 p-5 mb-3">
                        <Label className="text-base font-bold mb-1">
                            Top Up Credits
                        </Label>
                        <MutedText className="text-xs mb-4">
                            Purchase one-time credits to continue using premium features.
                        </MutedText>

                        <View className="flex-row justify-between items-end mb-2">
                            <View>
                                <Label className="text-2xl font-bold">
                                    {creditsToBuy}
                                </Label>
                                <MutedText className="text-xs">Credits</MutedText>
                            </View>
                            <View className="items-end">
                                <Label className="text-xl font-bold text-primary">
                                    ${price}
                                </Label>
                                <MutedText className="text-xs">
                                    One-time payment
                                </MutedText>
                            </View>
                        </View>

                        <Slider
                            minimumValue={50}
                            maximumValue={1000}
                            step={50}
                            value={creditsToBuy}
                            onValueChange={(val) => setCreditsToBuy(val)}
                            disabled={isPurchasing}
                            minimumTrackTintColor="hsl(240 5.9% 10%)"
                            maximumTrackTintColor="hsl(240 3.8% 46.1%)"
                            style={{ width: "100%", height: 40 }}
                        />
                        <View className="flex-row justify-between px-1 mb-4">
                            <MutedText className="text-xs">50</MutedText>
                            <MutedText className="text-xs">500</MutedText>
                            <MutedText className="text-xs">1000</MutedText>
                        </View>

                        {creditsToBuy >= 500 && (
                            <View className="bg-primary/10 rounded-lg px-3 py-2 mb-3">
                                <MutedText className="text-xs font-semibold text-primary">
                                    Best Value
                                </MutedText>
                            </View>
                        )}

                        <View className="bg-muted/40 rounded-lg p-3 mb-4 gap-2">
                            <MutedText className="text-xs">
                                {"\u26A1"} Instant delivery to your account
                            </MutedText>
                            <MutedText className="text-xs">
                                {"\u2705"} Never expires
                            </MutedText>
                        </View>

                        <Button
                            label={
                                isPurchasing
                                    ? "Redirecting..."
                                    : `Purchase ${creditsToBuy} Credits`
                            }
                            loading={isPurchasing}
                            onPress={handlePurchase}
                            disabled={isPurchasing}
                        />
                    </View>

                    {/* Transaction History */}
                    <View className="rounded-xl bg-card border border-border/30 overflow-hidden">
                        <View className="p-4 border-b border-border/20">
                            <Label className="text-base font-bold">
                                Transaction History
                            </Label>
                            <MutedText className="text-xs mt-1">
                                View your purchase history and download invoices.
                            </MutedText>
                        </View>

                        {transactions.length === 0 ? (
                            <View className="p-8 items-center">
                                <MutedText className="text-sm font-medium">
                                    No transactions found
                                </MutedText>
                                <MutedText className="text-xs mt-1">
                                    Purchases you make will appear here.
                                </MutedText>
                            </View>
                        ) : (
                            transactions.map((txn, index) => (
                                <View
                                    key={txn.id}
                                    className={`flex-row items-center p-4 ${
                                        index > 0
                                            ? "border-t border-border/20"
                                            : ""
                                    }`}
                                >
                                    <View className="flex-1">
                                        <Label className="text-sm">
                                            Credit Purchase
                                        </Label>
                                        <MutedText className="text-xs">
                                            {formatDate(txn.date)}
                                        </MutedText>
                                    </View>
                                    <View className="items-end">
                                        <Label className="text-sm font-semibold">
                                            {formatAmount(
                                                txn.amount,
                                                txn.currency
                                            )}
                                        </Label>
                                        <View className="bg-green-500/10 rounded px-2 py-0.5 mt-1">
                                            <MutedText className="text-xs text-green-600 font-medium">
                                                Paid
                                            </MutedText>
                                        </View>
                                    </View>
                                    {txn.receiptUrl && (
                                        <MutedText
                                            className="text-xs text-primary ml-3"
                                            onPress={() =>
                                                Linking.openURL(txn.receiptUrl!)
                                            }
                                        >
                                            Invoice {"\u203A"}
                                        </MutedText>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                </>
            )}
        </View>
    );
}

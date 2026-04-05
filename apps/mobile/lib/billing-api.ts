import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export type CreditsBalance = {
    creditsTotal: number;
    creditsUsed: number;
};

export type Transaction = {
    id: string;
    userId: string;
    eventId: string;
    checkoutSessionId: string | null;
    receiptUrl: string | null;
    description: string;
    amount: number;
    currency: string;
    date: string;
    createdAt: string;
    updatedAt: string;
};

async function authenticatedFetch(url: string, options?: RequestInit) {
    if (Platform.OS === "web") {
        return fetch(url, { ...options, credentials: "include" });
    }
    const res = await authClient.$fetch(url, options);
    return res;
}

export async function fetchCreditsBalance(): Promise<CreditsBalance> {
    const res = await authenticatedFetch(
        `${baseURL}/api/trpc/billing.getCreditsBalance`
    );

    if (!res.ok) {
        throw new Error("Failed to fetch credits balance");
    }

    const json = await res.json();
    return json.result?.data?.json ?? json.result?.data ?? json;
}

export async function fetchTransactions(): Promise<Transaction[]> {
    const res = await authenticatedFetch(
        `${baseURL}/api/trpc/billing.getTransactions`
    );

    if (!res.ok) {
        throw new Error("Failed to fetch transactions");
    }

    const json = await res.json();
    return json.result?.data?.json ?? json.result?.data ?? json;
}

export async function createCheckoutSession(
    credits: number
): Promise<{ checkoutUrl?: string }> {
    const res = await authenticatedFetch(
        `${baseURL}/api/trpc/billing.createCheckoutSession`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credits }),
        }
    );

    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(
            error?.error?.json?.message ?? "Failed to create checkout session"
        );
    }

    const json = await res.json();
    return json.result?.data?.json ?? json.result?.data ?? json;
}

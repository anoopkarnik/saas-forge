import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { fetchCreditsBalance, type CreditsBalance } from "@/lib/billing-api";
import { useAuth } from "@/lib/auth-provider";

type CreditsContextType = {
    credits: CreditsBalance | null;
    refreshCredits: () => Promise<void>;
};

const CreditsContext = createContext<CreditsContextType>({
    credits: null,
    refreshCredits: async () => {},
});

export function CreditsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [credits, setCredits] = useState<CreditsBalance | null>(null);

    const refreshCredits = useCallback(async () => {
        try {
            const bal = await fetchCreditsBalance();
            setCredits(bal);
        } catch {
            // silent
        }
    }, []);

    // Fetch on mount / user change
    useEffect(() => {
        if (!user) return;
        refreshCredits();
    }, [user, refreshCredits]);

    // Re-fetch when app comes back to foreground (e.g. after checkout in browser)
    useEffect(() => {
        if (!user) return;
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") {
                refreshCredits();
            }
        });
        return () => sub.remove();
    }, [user, refreshCredits]);

    return (
        <CreditsContext.Provider value={{ credits, refreshCredits }}>
            {children}
        </CreditsContext.Provider>
    );
}

export function useCredits() {
    return useContext(CreditsContext);
}

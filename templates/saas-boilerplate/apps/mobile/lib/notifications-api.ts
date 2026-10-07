import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export type AppNotification = {
    id: string;
    title: string;
    body: string;
    link: string | null;
    readAt: string | null;
    createdAt: string;
};

async function authenticatedFetch(url: string, options?: RequestInit) {
    if (Platform.OS === "web") {
        return fetch(url, { ...options, credentials: "include" });
    }
    return authClient.$fetch(url, options);
}

async function call<T>(procedure: string, body?: unknown): Promise<T> {
    const res = await authenticatedFetch(
        `${baseURL}/api/trpc/${procedure}`,
        body === undefined
            ? undefined
            : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) throw new Error(`Failed to load ${procedure}`);
    const json = await res.json();
    return json.result?.data?.json ?? json.result?.data ?? json;
}

export const fetchNotifications = () => call<AppNotification[]>("notification.list");
export const markNotificationRead = (id: string) => call<void>("notification.markRead", { id });
export const markAllNotificationsRead = () => call<number>("notification.markAllRead", {});

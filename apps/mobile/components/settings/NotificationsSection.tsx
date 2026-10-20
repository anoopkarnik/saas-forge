import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { Button, Label, MutedText } from "@/components/common";
import { authClient } from "@/lib/auth-client";
import {
    fetchNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    type AppNotification,
} from "@/lib/notifications-api";

/** The inbox on mobile (notifications module); preferences are set on web or desktop. */
export default function NotificationsSection() {
    const { data: session } = authClient.useSession();
    const readOnly = (session?.user as { role?: string } | undefined)?.role === "guest";
    const [items, setItems] = useState<AppNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            setItems(await fetchNotifications());
        } catch (err) {
            console.error("Failed to load notifications:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const unread = items.filter((item) => !item.readAt).length;

    return (
        <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2">
                <Label className="text-sm">Notifications{unread ? ` (${unread} unread)` : ""}</Label>
                {!readOnly && unread > 0 ? (
                    <Button
                        variant="outline"
                        label="Mark all read"
                        onPress={async () => { await markAllNotificationsRead(); await load(); }}
                    />
                ) : null}
            </View>
            {isLoading ? (
                <ActivityIndicator />
            ) : items.length === 0 ? (
                <MutedText className="text-xs">You're all caught up.</MutedText>
            ) : (
                items.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        className={`rounded-lg border border-border/30 p-3 mb-2 ${item.readAt ? "" : "bg-primary/10"}`}
                        activeOpacity={0.8}
                        disabled={readOnly || !!item.readAt}
                        onPress={async () => { await markNotificationRead(item.id); await load(); }}
                    >
                        <Label className="text-sm">{item.title}</Label>
                        <MutedText className="text-xs mt-1">{item.body}</MutedText>
                        <MutedText className="text-[11px] mt-1">{new Date(item.createdAt).toLocaleString()}</MutedText>
                    </TouchableOpacity>
                ))
            )}
        </View>
    );
}

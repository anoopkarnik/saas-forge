import React, { useEffect, useState } from "react";
import { View, Alert, ActivityIndicator } from "react-native";
import { authClient } from "@/lib/auth-client";
import { Label, MutedText, Button } from "@/components/common";

interface Session {
    id: string;
    token: string;
    userAgent?: string;
    ipAddress?: string;
    createdAt: string;
    updatedAt: string;
    isCurrent?: boolean;
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export default function SessionsSection() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [revokingId, setRevokingId] = useState<string | null>(null);
    const [isRevokingAll, setIsRevokingAll] = useState(false);

    const fetchSessions = async () => {
        setIsLoading(true);
        try {
            const { data } = await authClient.listSessions();
            const sorted = (data || [])
                .slice()
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setSessions(sorted);
        } catch {
            Alert.alert("Error", "Failed to load sessions");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleRevokeSession = async (session: Session) => {
        Alert.alert("Revoke Session", "Are you sure you want to revoke this session?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Revoke",
                style: "destructive",
                onPress: async () => {
                    setRevokingId(session.id);
                    try {
                        await authClient.revokeSession({ token: session.token });
                        setSessions((prev) => prev.filter((s) => s.id !== session.id));
                    } catch {
                        Alert.alert("Error", "Failed to revoke session");
                    } finally {
                        setRevokingId(null);
                    }
                },
            },
        ]);
    };

    const handleRevokeAll = () => {
        Alert.alert(
            "Sign Out All Devices",
            "This will sign out all other sessions except the current one.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out All",
                    style: "destructive",
                    onPress: async () => {
                        setIsRevokingAll(true);
                        try {
                            await authClient.revokeOtherSessions();
                            await fetchSessions();
                        } catch {
                            Alert.alert("Error", "Failed to revoke sessions");
                        } finally {
                            setIsRevokingAll(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Sessions
            </MutedText>
            <View className="rounded-xl bg-card border border-border/30 p-4">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-1 mr-3">
                        <Label className="text-base font-medium">Active Sessions</Label>
                        <MutedText className="text-xs">Manage your logged-in devices</MutedText>
                    </View>
                    <Button
                        label={isRevokingAll ? "..." : "Sign Out All"}
                        variant="outline"
                        onPress={handleRevokeAll}
                        disabled={isRevokingAll}
                        className="shrink-0 h-8 px-3"
                        style={{ width: "auto" }}
                    />
                </View>

                {isLoading ? (
                    <View className="py-6 items-center">
                        <ActivityIndicator />
                    </View>
                ) : sessions.length === 0 ? (
                    <MutedText className="text-center py-4">No active sessions</MutedText>
                ) : (
                    sessions.map((session, idx) => (
                        <View
                            key={session.id}
                            className={`flex-row items-center py-3 ${idx > 0 ? "border-t border-border/20" : ""}`}
                        >
                            <View
                                className={`h-2.5 w-2.5 rounded-full mr-3 ${session.isCurrent ? "bg-green-500" : "bg-muted-foreground/30"}`}
                            />
                            <View className="flex-1">
                                <View className="flex-row items-center gap-2">
                                    <Label className="text-sm">
                                        {session.userAgent?.split(" ")[0] || "Unknown"}
                                    </Label>
                                    {session.isCurrent && (
                                        <View className="bg-green-500/20 px-1.5 py-0.5 rounded">
                                            <MutedText className="text-[10px] text-green-400 font-medium">
                                                Current
                                            </MutedText>
                                        </View>
                                    )}
                                </View>
                                <MutedText className="text-xs">
                                    {session.ipAddress || "IP Hidden"} · {formatDate(session.createdAt)}
                                </MutedText>
                            </View>
                            {!session.isCurrent && (
                                <Button
                                    label={revokingId === session.id ? "..." : "Revoke"}
                                    variant="outline"
                                    onPress={() => handleRevokeSession(session)}
                                    disabled={revokingId === session.id}
                                    className="shrink-0 h-7 px-2"
                                    style={{ width: "auto" }}
                                />
                            )}
                        </View>
                    ))
                )}
            </View>
        </View>
    );
}

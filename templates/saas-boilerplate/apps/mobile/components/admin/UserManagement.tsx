import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Modal,
    Pressable,
    Platform,
} from "react-native";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-provider";
import { Heading, Subtitle, Label, MutedText } from "@/components/common";

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    banned: boolean;
    image?: string;
    createdAt: string;
};

type Props = {
    onBack: () => void;
};

export default function UserManagement({ onBack }: Props) {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === "web") {
            window.alert(`${title}: ${message}`);
        } else {
            const { Alert: NativeAlert } = require("react-native");
            NativeAlert.alert(title, message);
        }
    };

    const fetchUsers = useCallback(async () => {
        try {
            const { data, error } = await authClient.admin.listUsers({
                query: { limit: 100 },
            });
            if (error) {
                showAlert("Error", "Failed to load users");
            } else if (data) {
                setUsers(data?.users || []);
            }
        } catch (e) {
            showAlert("Error", "An error occurred while fetching users");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleSetRole = async (userId: string, newRole: "admin" | "user") => {
        setActionLoading(userId);
        try {
            const { error } = await authClient.admin.setRole({ userId, role: newRole });
            if (error) throw error;
            showAlert("Success", `Role updated to ${newRole}`);
            fetchUsers();
        } catch (e: any) {
            showAlert("Error", e.message || "Failed to update role");
        } finally {
            setActionLoading(null);
        }
    };

    const handleBanToggle = async (userId: string, isBanned: boolean) => {
        setActionLoading(userId);
        try {
            if (isBanned) {
                const { error } = await authClient.admin.unbanUser({ userId });
                if (error) throw error;
                showAlert("Success", "User unbanned");
            } else {
                const { error } = await authClient.admin.banUser({ userId });
                if (error) throw error;
                showAlert("Success", "User banned");
            }
            fetchUsers();
        } catch (e: any) {
            showAlert("Error", e.message || "Failed to update ban status");
        } finally {
            setActionLoading(null);
        }
    };

    const doRemoveUser = async (userId: string) => {
        setActionLoading(userId);
        try {
            const { error } = await authClient.admin.removeUser({ userId });
            if (error) throw error;
            showAlert("Success", "User removed");
            fetchUsers();
        } catch (e: any) {
            showAlert("Error", e?.message || "Failed to remove user");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemoveUser = (userId: string) => {
        if (Platform.OS === "web") {
            if (window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) {
                doRemoveUser(userId);
            }
        } else {
            const { Alert: NativeAlert } = require("react-native");
            NativeAlert.alert(
                "Delete User",
                "Are you sure you want to permanently delete this user? This cannot be undone.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => doRemoveUser(userId) },
                ]
            );
        }
    };

    const closeModal = () => setSelectedUser(null);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <ScrollView
                className="flex-1"
                contentContainerClassName="p-5 pb-24"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="hsl(142, 81%, 71%)" />
                }
            >
                <View className="flex-row items-center gap-3 mb-1">
                    <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                        <MutedText className="text-2xl">‹</MutedText>
                    </TouchableOpacity>
                    <Heading className="text-left text-2xl">User Management</Heading>
                </View>
                <Subtitle className="text-left mb-6">
                    {users.length} registered user{users.length !== 1 ? "s" : ""}
                </Subtitle>

                <View className="gap-3">
                    {users.map((userItem) => {
                        const isCurrentUser = userItem.id === currentUser?.id;
                        const isLoading = actionLoading === userItem.id;

                        return (
                            <TouchableOpacity
                                key={userItem.id}
                                className="flex-row items-center gap-3 p-4 rounded-xl bg-card border border-border/30"
                                activeOpacity={isCurrentUser ? 1 : 0.7}
                                onPress={() => !isCurrentUser && setSelectedUser(userItem)}
                                disabled={isCurrentUser || isLoading}
                            >
                                <View className="w-10 h-10 rounded-full bg-sidebar-accent items-center justify-center">
                                    <Label className="text-sm font-bold text-sidebar-accent-foreground">
                                        {userItem.name?.charAt(0)?.toUpperCase() || "U"}
                                    </Label>
                                </View>
                                <View className="flex-1">
                                    <View className="flex-row items-center gap-2">
                                        <Label className="text-sm" numberOfLines={1}>
                                            {userItem.name || "Unknown"}
                                        </Label>
                                        {isCurrentUser && (
                                            <View className="px-1.5 py-0.5 rounded bg-primary/15">
                                                <MutedText className="text-[10px] text-primary font-medium">You</MutedText>
                                            </View>
                                        )}
                                    </View>
                                    <MutedText className="text-xs" numberOfLines={1}>
                                        {userItem.email}
                                    </MutedText>
                                </View>
                                <View className="items-end gap-1">
                                    <View className={`px-2 py-0.5 rounded-full ${userItem.role === "admin" ? "bg-primary/15" : "bg-muted"}`}>
                                        <MutedText className={`text-[10px] font-medium capitalize ${userItem.role === "admin" ? "text-primary" : ""}`}>
                                            {userItem.role}
                                        </MutedText>
                                    </View>
                                    {userItem.banned && (
                                        <View className="px-2 py-0.5 rounded-full bg-destructive/15">
                                            <MutedText className="text-[10px] font-medium text-destructive">Banned</MutedText>
                                        </View>
                                    )}
                                </View>
                                {isLoading && <ActivityIndicator size="small" />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* User Actions Modal */}
            <Modal
                visible={!!selectedUser}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <Pressable className="flex-1 bg-black/50 justify-end" onPress={closeModal}>
                    <Pressable
                        className="bg-card rounded-t-2xl p-5 pb-10"
                        onPress={(e) => e.stopPropagation()}
                    >
                        {selectedUser && (
                            <>
                                <View className="items-center mb-1">
                                    <View className="w-10 h-1 rounded-full bg-muted mb-4" />
                                </View>
                                <View className="flex-row items-center gap-3 mb-5">
                                    <View className="w-12 h-12 rounded-full bg-sidebar-accent items-center justify-center">
                                        <Label className="text-lg font-bold text-sidebar-accent-foreground">
                                            {selectedUser.name?.charAt(0)?.toUpperCase() || "U"}
                                        </Label>
                                    </View>
                                    <View className="flex-1">
                                        <Label className="text-base">{selectedUser.name || "Unknown"}</Label>
                                        <MutedText className="text-xs">{selectedUser.email}</MutedText>
                                        <View className="flex-row gap-2 mt-1">
                                            <View className={`px-2 py-0.5 rounded-full ${selectedUser.role === "admin" ? "bg-primary/15" : "bg-muted"}`}>
                                                <MutedText className={`text-[10px] font-medium capitalize ${selectedUser.role === "admin" ? "text-primary" : ""}`}>
                                                    {selectedUser.role}
                                                </MutedText>
                                            </View>
                                            {selectedUser.banned && (
                                                <View className="px-2 py-0.5 rounded-full bg-destructive/15">
                                                    <MutedText className="text-[10px] font-medium text-destructive">Banned</MutedText>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <View className="gap-2">
                                    {/* Demote / Promote */}
                                    <TouchableOpacity
                                        className="flex-row items-center gap-3 p-4 rounded-xl bg-muted/50"
                                        activeOpacity={0.7}
                                        disabled={actionLoading === selectedUser.id}
                                        onPress={() => {
                                            const userId = selectedUser.id;
                                            const newRole = selectedUser.role === "admin" ? "user" : "admin";
                                            closeModal();
                                            setTimeout(() => handleSetRole(userId, newRole), 350);
                                        }}
                                    >
                                        <Label className="text-2xl">{selectedUser.role === "admin" ? "👤" : "🛡️"}</Label>
                                        <View>
                                            <Label className="text-sm">
                                                {selectedUser.role === "admin" ? "Demote to User" : "Promote to Admin"}
                                            </Label>
                                            <MutedText className="text-xs">
                                                {selectedUser.role === "admin"
                                                    ? "Remove admin privileges"
                                                    : "Grant admin privileges"}
                                            </MutedText>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Ban / Unban */}
                                    <TouchableOpacity
                                        className="flex-row items-center gap-3 p-4 rounded-xl bg-muted/50"
                                        activeOpacity={0.7}
                                        disabled={actionLoading === selectedUser.id}
                                        onPress={() => {
                                            const userId = selectedUser.id;
                                            const isBanned = selectedUser.banned;
                                            closeModal();
                                            setTimeout(() => handleBanToggle(userId, isBanned), 350);
                                        }}
                                    >
                                        <Label className="text-2xl">{selectedUser.banned ? "✅" : "🚫"}</Label>
                                        <View>
                                            <Label className="text-sm">
                                                {selectedUser.banned ? "Unban User" : "Ban User"}
                                            </Label>
                                            <MutedText className="text-xs">
                                                {selectedUser.banned
                                                    ? "Restore access for this user"
                                                    : "Prevent this user from signing in"}
                                            </MutedText>
                                        </View>
                                    </TouchableOpacity>

                                    {/* Delete User */}
                                    <TouchableOpacity
                                        className="flex-row items-center gap-3 p-4 rounded-xl bg-destructive/10"
                                        activeOpacity={0.7}
                                        disabled={actionLoading === selectedUser.id}
                                        onPress={() => {
                                            const userId = selectedUser.id;
                                            closeModal();
                                            setTimeout(() => handleRemoveUser(userId), 350);
                                        }}
                                    >
                                        <Label className="text-2xl">🗑️</Label>
                                        <View>
                                            <Label className="text-sm text-destructive">Delete User</Label>
                                            <MutedText className="text-xs">Permanently remove this user</MutedText>
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className="mt-4 p-3 rounded-xl bg-muted items-center"
                                    activeOpacity={0.7}
                                    onPress={closeModal}
                                >
                                    <Label className="text-sm">Cancel</Label>
                                </TouchableOpacity>
                            </>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

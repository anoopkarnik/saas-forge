import React, { useState } from "react";
import { View, Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { Label, MutedText, ErrorText, Button } from "@/components/common";
import { Input } from "@/components/common";

export default function DangerZoneSection() {
    const router = useRouter();
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = () => {
        if (confirmation !== "permanently delete") {
            setError("Please type 'permanently delete' to confirm");
            return;
        }
        setError("");

        if (Platform.OS === "web") {
            if (window.confirm("This will permanently delete your account and all associated data. This action cannot be undone.")) {
                (async () => {
                    setIsDeleting(true);
                    try {
                        const { error: deleteError } = await authClient.deleteUser({
                            fetchOptions: {
                                onSuccess: () => router.replace("/sign-in"),
                            },
                        });
                        if (deleteError) {
                            window.alert("Error: " + (deleteError.message || "Failed to delete account"));
                            console.error("Delete Error:", deleteError);
                        } else {
                            await authClient.signOut();
                            router.replace("/sign-in");
                        }
                    } catch (err: any) {
                        window.alert("Error: " + (err?.message || "Failed to delete account"));
                        console.error("Delete Exception:", err);
                    } finally {
                        setIsDeleting(false);
                    }
                })();
            }
        } else {
            Alert.alert(
                "Delete Account",
                "This will permanently delete your account and all associated data. This action cannot be undone.",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                            setIsDeleting(true);
                            try {
                                const { error: deleteError } = await authClient.deleteUser({
                                    fetchOptions: {
                                        onSuccess: () => router.replace("/sign-in"),
                                    },
                                });
                                if (deleteError) {
                                    Alert.alert("Error", deleteError.message || JSON.stringify(deleteError) || "Failed to delete account");
                                    console.error("Better-Auth Delete Error:", deleteError);
                                } else {
                                    await authClient.signOut();
                                    router.replace("/sign-in");
                                }
                            } catch (err: any) {
                                Alert.alert("Error", err?.message || JSON.stringify(err) || "Failed to delete account");
                                console.error("Delete Account Exception:", err);
                            } finally {
                                setIsDeleting(false);
                            }
                        },
                    },
                ]
            );
        }
    };

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium text-destructive">
                Danger Zone
            </MutedText>
            <View className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                <Label className="text-base font-medium text-destructive mb-1">
                    Delete Account
                </Label>
                <MutedText className="text-xs text-destructive/80 mb-4">
                    Permanently delete your account and all associated data. This action cannot be
                    undone.
                </MutedText>

                <View className="mb-3">
                    <Label className="text-sm mb-1">
                        Type &apos;permanently delete&apos; to confirm
                    </Label>
                    <Input
                        value={confirmation}
                        onChangeText={(text) => {
                            setConfirmation(text);
                            setError("");
                        }}
                        placeholder="permanently delete"
                        className="border-destructive/30"
                    />
                    {error ? <ErrorText>{error}</ErrorText> : null}
                </View>

                <Button
                    label={isDeleting ? "Deleting..." : "Delete Account"}
                    variant="primary"
                    onPress={handleDeleteAccount}
                    disabled={isDeleting}
                    loading={isDeleting}
                    className="bg-destructive"
                />
            </View>
        </View>
    );
}

import { View, ScrollView, Linking, Platform } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { Heading, Subtitle, MutedText, Label, Button } from "@/components/common";
import ProfileSection from "@/components/settings/ProfileSection";
import PasswordSection from "@/components/settings/PasswordSection";
import SessionsSection from "@/components/settings/SessionsSection";
import ThemeSection from "@/components/settings/ThemeSection";
import DangerZoneSection from "@/components/settings/DangerZoneSection";
import BillingSection from "@/components/settings/BillingSection";

export default function Settings() {
    const router = useRouter();

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    credentials: "include" as const,
                    onSuccess: () => {
                        router.replace("/sign-in");
                    },
                },
            });
        } catch {
            router.replace("/sign-in");
        }
    };

    const confirmSignOut = () => {
        if (Platform.OS === "web") {
            if (window.confirm("Are you sure you want to sign out?")) {
                handleSignOut();
            }
        } else {
            const { Alert } = require("react-native");
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: handleSignOut },
            ]);
        }
    };

    const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_MAIL;
    const calendlyUrl = process.env.EXPO_PUBLIC_CALENDLY_BOOKING_URL;

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Heading className="text-left text-2xl mb-1">Settings</Heading>
            <Subtitle className="text-left mb-6">Manage your account and preferences</Subtitle>

            {/* Profile: Avatar, Name, Email */}
            <ProfileSection />

            {/* Theme Switcher */}
            <ThemeSection />

            {/* Password Management */}
            <PasswordSection />

            {/* Active Sessions */}
            <SessionsSection />

            {/* Plans & Billing */}
            <BillingSection />

            {/* Support Section */}
            <View className="mb-6">
                <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                    Support
                </MutedText>
                <View className="rounded-xl bg-card border border-border/30 overflow-hidden">
                    <View className="flex-row items-center gap-3 p-4">
                        <MutedText className="text-lg">{"\uD83D\uDCD6"}</MutedText>
                        <View className="flex-1">
                            <Label className="text-sm">Documentation</Label>
                        </View>
                        <MutedText
                            className="text-sm"
                            numberOfLines={1}
                            onPress={() => router.push("/documentation")}
                        >
                            Read guides {"\u203A"}
                        </MutedText>
                    </View>
                    {calendlyUrl && (
                        <View className="flex-row items-center gap-3 p-4 border-t border-border/20">
                            <MutedText className="text-lg">{"\uD83D\uDCC5"}</MutedText>
                            <View className="flex-1">
                                <Label className="text-sm">Book a Meeting</Label>
                            </View>
                            <MutedText
                                className="text-sm"
                                numberOfLines={1}
                                onPress={() => Linking.openURL(calendlyUrl)}
                            >
                                Schedule via Calendly {"\u203A"}
                            </MutedText>
                        </View>
                    )}
                </View>
            </View>

            {/* About */}
            <View className="mb-6">
                <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                    About
                </MutedText>
                <View className="rounded-xl bg-card border border-border/30 overflow-hidden">
                    <View className="flex-row items-center gap-3 p-4">
                        <MutedText className="text-lg">{"\uD83D\uDCF1"}</MutedText>
                        <View className="flex-1">
                            <Label className="text-sm">Version</Label>
                        </View>
                        <MutedText className="text-sm">1.0.0</MutedText>
                    </View>
                </View>
            </View>

            {/* Danger Zone: Delete Account */}
            <DangerZoneSection />

            {/* Sign Out */}
            <Button
                label="Sign Out"
                variant="outline"
                onPress={confirmSignOut}
                className="mt-2 mb-8"
            />
        </ScrollView>
    );
}

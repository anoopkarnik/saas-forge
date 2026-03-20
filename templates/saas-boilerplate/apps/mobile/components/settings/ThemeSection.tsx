import React from "react";
import { View, TouchableOpacity } from "react-native";
import { useColorScheme } from "nativewind";
import { Label, MutedText } from "@/components/common";

const THEMES = [
    { value: "light" as const, label: "Light", icon: "\u2600\uFE0F" },
    { value: "dark" as const, label: "Dark", icon: "\uD83C\uDF19" },
    { value: "system" as const, label: "System", icon: "\uD83D\uDCBB" },
];

export default function ThemeSection() {
    const { colorScheme, setColorScheme } = useColorScheme();

    // Determine the active selection — we treat non-light/dark as "system"
    const activeTheme =
        colorScheme === "light" ? "light" : colorScheme === "dark" ? "dark" : "system";

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Appearance
            </MutedText>
            <View className="rounded-xl bg-card border border-border/30 p-4">
                <Label className="text-base font-medium mb-1">Theme</Label>
                <MutedText className="text-xs mb-4">
                    Choose your preferred appearance.
                </MutedText>
                <View className="flex-row gap-3">
                    {THEMES.map((theme) => {
                        const isActive = activeTheme === theme.value;
                        return (
                            <TouchableOpacity
                                key={theme.value}
                                className={`flex-1 items-center py-3 rounded-lg border ${
                                    isActive
                                        ? "border-primary bg-primary/10"
                                        : "border-border/30 bg-sidebar/30"
                                }`}
                                activeOpacity={0.7}
                                onPress={() => setColorScheme(theme.value)}
                            >
                                <MutedText className="text-lg mb-1">{theme.icon}</MutedText>
                                <Label
                                    className={`text-xs ${isActive ? "text-primary" : "text-muted-foreground"}`}
                                >
                                    {theme.label}
                                </Label>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

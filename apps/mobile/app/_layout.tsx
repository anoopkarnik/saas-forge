import "../global.css";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-provider";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
    const themeName = process.env.EXPO_PUBLIC_THEME || "green";
    const themeMode = process.env.EXPO_PUBLIC_THEME_TYPE || "system"; // 'dark', 'light', 'system'
    const { colorScheme, setColorScheme } = useColorScheme();

    useEffect(() => {
        if (themeMode !== "system") {
            setColorScheme(themeMode as "light" | "dark");
        }
    }, [themeMode]);

    const isDark = colorScheme === "dark";
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <View className={`flex-1 theme-${themeName} ${isDark ? "dark" : ""}`}>
                        <StatusBar style={isDark ? "light" : "dark"} />
                        <Stack screenOptions={{ headerShown: false, contentStyle: { flex: 1 } }} />
                    </View>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

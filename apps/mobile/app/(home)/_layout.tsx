import { Tabs, Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { useAuth } from "@/lib/auth-provider";
import { CreditsProvider } from "@/lib/credits-provider";
import { Ionicons } from "@expo/vector-icons";
import TabHeader from "@/components/home/TabHeader";

const BG = "hsl(240, 6%, 10%)";

export default function HomeLayout() {
    const { session, user, isPending } = useAuth();
    const isAdmin = user?.role === "admin";

    if (isPending) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!session) {
        return <Redirect href="/sign-in" />;
    }

    return (
        <CreditsProvider>
        <View style={styles.root}>
            <TabHeader />
            <Tabs
                screenOptions={{
                    headerShown: false,
                    sceneStyle: { backgroundColor: BG, flex: 1 },
                    tabBarStyle: {
                        backgroundColor: BG,
                        borderTopColor: "hsla(240, 6%, 20%, 0.4)",
                        borderTopWidth: 1,
                        height: 72,
                        paddingBottom: 12,
                        paddingTop: 8,
                    },
                    tabBarActiveTintColor: "hsl(142, 81%, 71%)",
                    tabBarInactiveTintColor: "hsla(0, 0%, 98%, 0.5)",
                    tabBarLabelStyle: {
                        fontSize: 11,
                        fontWeight: "600",
                    },
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Home",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="home-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="support"
                    options={{
                        title: "Support",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="admin"
                    options={{
                        title: "Admin",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="shield-outline" size={size} color={color} />
                        ),
                        ...(isAdmin ? {} : { href: null }),
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{
                        title: "Settings",
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="settings-outline" size={size} color={color} />
                        ),
                    }}
                />
                {/* Hidden routes — kept as screens but not shown in tab bar */}
                <Tabs.Screen name="documentation" options={{ href: null }} />
            </Tabs>
        </View>
        </CreditsProvider>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: BG,
        ...(Platform.OS === "web" ? { height: "100%" as any } : {}),
    },
});

import { Stack, Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth-provider";

export default function AuthLayout() {
    const { session, isPending } = useAuth();

    if (isPending) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (session) {
        return <Redirect href="/(home)" />;
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}

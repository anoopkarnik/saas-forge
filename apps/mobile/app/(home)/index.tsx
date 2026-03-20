import { View, ScrollView } from "react-native";
import { useAuth } from "@/lib/auth-provider";
import { Heading, Subtitle } from "@/components/common";

export default function Home() {
    const { user } = useAuth();

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            {/* Welcome */}
            <View className="items-center py-8">
                <Heading>Welcome{user?.name ? `, ${user.name}` : ""}!</Heading>
                <Subtitle className="mt-1">You are signed in.</Subtitle>
            </View>
        </ScrollView>
    );
}

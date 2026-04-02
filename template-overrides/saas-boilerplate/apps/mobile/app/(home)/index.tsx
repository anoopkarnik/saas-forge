import { View } from "react-native";
import { Heading, MutedText, Subtitle } from "@/components/common";

export default function Home() {
    return (
        <View className="flex-1 bg-background px-5 py-8">
            <View className="rounded-3xl border border-border/40 bg-card p-5">
                <MutedText className="text-xs uppercase tracking-wider mb-2">Starter Ready</MutedText>
                <Heading className="text-left text-2xl">Welcome to your SaaS starter</Heading>
                <Subtitle className="text-left mt-3">
                    This template keeps shared SaaS features in sync with the main boilerplate while leaving the
                    root-only scaffold download workflow out of the starter app.
                </Subtitle>
            </View>
        </View>
    );
}

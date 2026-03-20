import { Stack } from "expo-router";

const BG = "hsl(240, 6%, 10%)";

export default function DocumentationLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerBackTitle: "Back",
                headerStyle: { backgroundColor: BG },
                headerTintColor: "hsl(0, 0%, 98%)",
                headerTitleStyle: { color: "hsl(0, 0%, 98%)" },
                contentStyle: { backgroundColor: BG },
            }}
        />
    );
}

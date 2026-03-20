import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import ErrorCard from "@/components/auth/ErrorCard";

export default function ErrorPage() {
    const router = useRouter();

    return (
        <View className="flex-1 items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br px-4">
            <ErrorCard
                errorMessage={"Oops! Something went wrong!"}
                onBackToLoginClick={() => router.push("/sign-in")}
            />
        </View>
    );
}

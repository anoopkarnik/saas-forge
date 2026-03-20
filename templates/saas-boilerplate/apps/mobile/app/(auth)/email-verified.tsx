import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import VerificationCard from "@/components/auth/VerificationCard";

export default function EmailVerified() {
    const router = useRouter();

    return (
        <View className="flex-1 items-center justify-center bg-background px-4">
            <VerificationCard
                errorMessage={"Email Not Verified"}
                successMessage={"Email Verified"}
                onBackToLoginClick={() => router.push("/sign-in")}
            />
        </View>
    );
}

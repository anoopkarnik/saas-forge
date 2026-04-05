import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import ForgotPasswordCard from "@/components/auth/ForgotPasswordCard";

export default function ForgotPassword() {
    const router = useRouter();
    const [error, setError] = useState<string | undefined>();
    const [success, setSuccess] = useState<string | undefined>();

    const resetPasswordFunction = async (email: string) => {
        try {
            const { error } = await authClient.requestPasswordReset({
                email,
                redirectTo: "/reset-password",
            });
            if (error) {
                setSuccess(undefined);
                setError(error as any);
                return;
            }
            setSuccess("Check your email for the reset link");
        } catch {
            setError("Something went wrong!");
        }
    };

    return (
        <View className="flex-1 items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br px-4">
            <ForgotPasswordCard
                resetFunction={resetPasswordFunction}
                errorMessage={error}
                successMessage={success}
                onBackToLoginClick={() => router.push("/sign-in")}
            />
        </View>
    );
}

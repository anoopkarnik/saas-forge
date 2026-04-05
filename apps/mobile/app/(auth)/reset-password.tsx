import React, { useState } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authClient } from "@/lib/auth-client";
import ResetPasswordCard from "@/components/auth/ResetPasswordCard";
import ErrorCard from "@/components/auth/ErrorCard";

export default function ResetPassword() {
    const router = useRouter();
    const params = useLocalSearchParams<{ token?: string }>();
    const token = params.token;

    const [error, setError] = useState<string | undefined>(undefined);
    const [success, setSuccess] = useState<string | undefined>(undefined);

    const resetPassword = async (token: string, password: string) => {
        try {
            const { error } = await authClient.resetPassword({
                token,
                newPassword: password,
            });
            if (error) {
                setSuccess(undefined);
                setError(error as any);
                return;
            }
            setSuccess("Password reset successfully");
        } catch {
            setError("Something went wrong!");
        }
    };

    if (error) {
        return (
            <View className="flex-1 items-center justify-center bg-background px-4">
                <ErrorCard
                    errorMessage={error}
                    onBackToLoginClick={() => router.push("/sign-in")}
                />
            </View>
        );
    }

    return (
        <View className="flex-1 items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br px-4">
            <ResetPasswordCard
                token={token as string}
                resetFunction={resetPassword}
                errorMessage={error}
                successMessage={success}
                onBackToLoginClick={() => router.push("/sign-in")}
            />
        </View>
    );
}

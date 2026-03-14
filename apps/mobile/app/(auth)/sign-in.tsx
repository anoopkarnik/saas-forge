import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import { LoginSchema } from "@workspace/auth/utils/zod";
import { authClient } from "@/lib/auth-client";
import LoginCard from "@/components/auth/LoginCard";

export default function SignIn() {
    const router = useRouter();
    const [error, setError] = useState<string | undefined>(undefined);

    const loginWithSocials = async (type: string) => {
        await authClient.signIn.social({
            provider: type as any,
            callbackURL: "/auth-callback",
        });
    };

    const loginWithEmail = async (data: z.infer<typeof LoginSchema>) => {
        const { error } = await authClient.signIn.email({
            ...data,
            callbackUrl: "/",
            rememberMe: true,
        });
        if (error) {
            setError(error.message);
        } else {
            router.push("/");
        }
    };

    return (
        <View className="flex-1 items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br px-4">
            <LoginCard
                showEmail={process.env.EXPO_PUBLIC_AUTH_EMAIL === "true"}
                showGoogleProvider={process.env.EXPO_PUBLIC_AUTH_GOOGLE === "true"}
                showGithubProvider={process.env.EXPO_PUBLIC_AUTH_GITHUB === "true"}
                showLinkedinProvider={process.env.EXPO_PUBLIC_AUTH_LINKEDIN === "true"}
                onEmailSubmit={loginWithEmail}
                onGoogleProviderSubmit={() => loginWithSocials("google")}
                onGithubProviderSubmit={() => loginWithSocials("github")}
                onLinkedinProviderSubmit={() => loginWithSocials("linkedin")}
                onSignUpClick={() => router.push("/sign-up")}
                onForgotPasswordClick={() => router.push("/forgot-password")}
                errorMessage={error}
            />
        </View>
    );
}

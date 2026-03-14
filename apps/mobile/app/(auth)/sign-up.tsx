import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { RegisterSchema } from "@workspace/auth/utils/zod";
import { authClient } from "@/lib/auth-client";
import RegisterCard from "@/components/auth/RegisterCard";

export default function SignUp() {
    const router = useRouter();
    const params = useLocalSearchParams<{ error?: string }>();
    const [urlError, setUrlError] = useState("");

    useEffect(() => {
        if (params.error === "OAuthAccountNotLinked") {
            setUrlError("This email is already in use with another provider.");
        }
    }, [params.error]);

    const loginWithSocials = async (type: string) => {
        await authClient.signIn.social({
            provider: type as any,
            callbackURL: "/auth-callback",
        });
    };

    const register = async (data: z.infer<typeof RegisterSchema>) => {
        const result = await authClient.signUp.email(data);
        return result;
    };

    return (
        <View className="flex-1 items-center justify-center bg-gradient-to-br from-primary to-sidebar dark:bg-gradient-to-br px-4">
            <RegisterCard
                showEmail={process.env.EXPO_PUBLIC_AUTH_EMAIL === "true"}
                showGoogleProvider={process.env.EXPO_PUBLIC_AUTH_GOOGLE === "true"}
                showGithubProvider={process.env.EXPO_PUBLIC_AUTH_GITHUB === "true"}
                showLinkedinProvider={process.env.EXPO_PUBLIC_AUTH_LINKEDIN === "true"}
                onEmailSubmit={register}
                onGoogleProviderSubmit={() => loginWithSocials("google")}
                onGithubProviderSubmit={() => loginWithSocials("github")}
                onLinkedinProviderSubmit={() => loginWithSocials("linkedin")}
                onSignInClick={() => router.push("/sign-in")}
                onTermsOfServiceClick={() => { }}
                onPrivacyPolicyClick={() => { }}
                errorMessage={urlError}
            />
        </View>
    );
}

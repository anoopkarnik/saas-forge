import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RegisterSchema } from "@workspace/auth/utils/zod";
import { RegisterCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";

const FIELDS = [
    { name: "name" as const, label: "Name", type: "text", placeholder: "Enter your name" },
    { name: "email" as const, label: "Email", type: "email", placeholder: "Enter your email" },
    { name: "password" as const, label: "Password", type: "password", placeholder: "******" },
    { name: "confirmPassword" as const, label: "Confirm Password", type: "password", placeholder: "******" },
] as const;

const RegisterCard = ({
    showEmail,
    showGoogleProvider,
    showGithubProvider,
    showLinkedinProvider,
    onEmailSubmit,
    onGoogleProviderSubmit,
    onGithubProviderSubmit,
    onLinkedinProviderSubmit,
    errorMessage,
    onSignInClick,
    onTermsOfServiceClick,
    onPrivacyPolicyClick,
}: RegisterCardProps) => {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof RegisterSchema>>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(data: z.infer<typeof RegisterSchema>) {
        setIsPending(true);
        const { error } = await onEmailSubmit(data);
        if (error) {
            setError(error);
        } else {
            setSuccess(
                "Registration successful! Please verify your email before logging in!"
            );
            setError(null);
        }
        setIsPending(false);
    }

    return (
        <View className="w-full max-w-md rounded- bg-card/50 p-6 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <View className="mb-6">
                <Text className="text-3xl font-bold tracking-tight text-center text-foreground">
                    Create an account
                </Text>
                <Text className="text-sm text-muted-foreground text-center mt-1">
                    Enter your information to get started
                </Text>
            </View>

            {/* Email Form */}
            {showEmail && (
                <View className="mb-6">
                    {FIELDS.map((field) => (
                        <View key={field.name} className="mb-4">
                            <Text className="text-sm font-medium text-foreground mb-1.5">
                                {field.label}
                            </Text>
                            <Controller
                                control={control}
                                name={field.name}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                        placeholder={field.placeholder}
                                        placeholderTextColor="hsl(240 3.8% 46.1%)"
                                        secureTextEntry={field.type === "password"}
                                        keyboardType={
                                            field.type === "email" ? "email-address" : "default"
                                        }
                                        autoCapitalize={
                                            field.type === "email" ? "none" : field.name === "name" ? "words" : "none"
                                        }
                                        editable={!isPending}
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                    />
                                )}
                            />
                            {errors[field.name] && (
                                <Text className="text-xs text-destructive mt-1">
                                    {errors[field.name]?.message}
                                </Text>
                            )}
                        </View>
                    ))}

                    <FormResult type="error" message={error as string} />
                    <FormResult type="success" message={success as string} />

                    {/* Submit Button */}
                    <TouchableOpacity
                        className="h-10 w-full items-center justify-center rounded-md bg-primary mt-2"
                        onPress={handleSubmit(onSubmit)}
                        disabled={isPending}
                        activeOpacity={0.8}
                    >
                        {isPending ? (
                            <ActivityIndicator color="hsl(0 0% 98%)" size="small" />
                        ) : (
                            <Text className="text-sm font-medium text-primary-foreground">
                                Create Account
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Separator */}
            {(showGoogleProvider || showGithubProvider || showLinkedinProvider) &&
                showEmail && (
                    <View className="relative my-4">
                        <View className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
                        <View className="flex-row justify-center">
                            <Text className="bg-card px-2 text-xs uppercase text-muted-foreground">
                                Or continue with
                            </Text>
                        </View>
                    </View>
                )}

            {/* Social Providers */}
            <View className="gap-3">
                {showGoogleProvider && (
                    <TouchableOpacity
                        className="h-10 w-full flex-row items-center justify-center rounded-md border border-input bg-background"
                        onPress={onGoogleProviderSubmit}
                        activeOpacity={0.7}
                    >
                        <Text className="text-sm font-medium text-foreground">
                            Google
                        </Text>
                    </TouchableOpacity>
                )}
                {showGithubProvider && (
                    <TouchableOpacity
                        className="h-10 w-full flex-row items-center justify-center rounded-md border border-input bg-background"
                        onPress={onGithubProviderSubmit}
                        activeOpacity={0.7}
                    >
                        <Text className="text-sm font-medium text-foreground">
                            GitHub
                        </Text>
                    </TouchableOpacity>
                )}
                {showLinkedinProvider && (
                    <TouchableOpacity
                        className="h-10 w-full flex-row items-center justify-center rounded-md border border-input bg-background"
                        onPress={onLinkedinProviderSubmit}
                        activeOpacity={0.7}
                    >
                        <Text className="text-sm font-medium text-foreground">
                            LinkedIn
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Sign In Link */}
            <View className="mt-6 flex-row items-center justify-center">
                <Text className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                </Text>
                <TouchableOpacity onPress={onSignInClick}>
                    <Text className="text-sm font-medium text-primary">Log in</Text>
                </TouchableOpacity>
            </View>

            {/* Terms / Privacy */}
            <View className="mt-3 px-4">
                <Text className="text-xs text-center text-muted-foreground">
                    By clicking continue, you agree to our{" "}
                </Text>
                <View className="flex-row justify-center flex-wrap">
                    <TouchableOpacity onPress={onTermsOfServiceClick}>
                        <Text className="text-xs text-muted-foreground underline">
                            Terms of Service
                        </Text>
                    </TouchableOpacity>
                    <Text className="text-xs text-muted-foreground"> and </Text>
                    <TouchableOpacity onPress={onPrivacyPolicyClick}>
                        <Text className="text-xs text-muted-foreground underline">
                            Privacy Policy
                        </Text>
                    </TouchableOpacity>
                    <Text className="text-xs text-muted-foreground">.</Text>
                </View>
            </View>
        </View>
    );
};

export default RegisterCard;

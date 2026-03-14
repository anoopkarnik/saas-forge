import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoginSchema } from "@workspace/auth/utils/zod";
import { LoginCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";

const LoginCard = ({
    showEmail,
    showGoogleProvider,
    showGithubProvider,
    showLinkedinProvider,
    onEmailSubmit,
    onGoogleProviderSubmit,
    onGithubProviderSubmit,
    onLinkedinProviderSubmit,
    errorMessage,
    onSignUpClick,
    onForgotPasswordClick,
}: LoginCardProps) => {
    const [pending, setPending] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(data: z.infer<typeof LoginSchema>) {
        setPending(true);
        await onEmailSubmit(data);
        setPending(false);
    }

    return (
        <View className="w-full max-w-md rounded-xl  bg-card/50 p-6 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <View className="mb-6">
                <Text className="text-3xl font-bold tracking-tight text-center text-foreground">
                    Login
                </Text>
                <Text className="text-sm text-muted-foreground text-center mt-1">
                    Welcome back! Please enter your details.
                </Text>
            </View>

            {/* Email Form */}
            {showEmail && (
                <View className="mb-6">
                    {/* Email Field */}
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-1.5">
                            Email
                        </Text>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                    placeholder="name@example.com"
                                    placeholderTextColor="hsl(240 3.8% 46.1%)"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    editable={!pending}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                            )}
                        />
                        {errors.email && (
                            <Text className="text-xs text-destructive mt-1">
                                {errors.email.message}
                            </Text>
                        )}
                    </View>

                    {/* Password Field */}
                    <View className="mb-4">
                        <View className="flex-row items-center justify-between mb-1.5">
                            <Text className="text-sm font-medium text-foreground">
                                Password
                            </Text>
                            <TouchableOpacity onPress={onForgotPasswordClick}>
                                <Text className="text-xs font-medium text-primary">
                                    Forgot password?
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                                    placeholder="******"
                                    placeholderTextColor="hsl(240 3.8% 46.1%)"
                                    secureTextEntry
                                    editable={!pending}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                            )}
                        />
                        {errors.password && (
                            <Text className="text-xs text-destructive mt-1">
                                {errors.password.message}
                            </Text>
                        )}
                    </View>

                    <FormResult type="error" message={errorMessage} />

                    {/* Submit Button */}
                    <TouchableOpacity
                        className="h-10 w-full items-center justify-center rounded-md bg-primary mt-2"
                        onPress={handleSubmit(onSubmit)}
                        disabled={pending}
                        activeOpacity={0.8}
                    >
                        {pending ? (
                            <ActivityIndicator color="hsl(0 0% 98%)" size="small" />
                        ) : (
                            <Text className="text-sm font-medium text-primary-foreground">
                                Sign in
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* Separator */}
            {(showGoogleProvider || showGithubProvider || showLinkedinProvider) &&
                showEmail && (
                    <View className="relative my-4">
                        <View className="absolute inset-0 top-1/2 flex items-center" >
                            <View className="w-full border-t border-border/60" />
                        </View>
                        <View className="flex-row justify-center ">
                            <Text className="px-2 z-20 text-xs uppercase text-muted-foreground bg-card/50 shadow-xl backdrop-blur-sm ">
                                Or continue with
                            </Text>
                        </View>
                    </View>
                )}

            {/* Social Providers */}
            <View className="gap-3">
                {showGoogleProvider && (
                    <TouchableOpacity
                        className="h-10 w-full flex-row items-center justify-center rounded-md border border-input bg-background hover:bg-muted/50 transition-colors"
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
                        className="h-10 w-full flex-row items-center justify-center rounded-md border border-input bg-background hover:bg-muted/50 transition-colors"
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
                        className="h-10 w-full flex-row items-center justify-center rounded-md border border-input bg-background hover:bg-muted/50 transition-colors"
                        onPress={onLinkedinProviderSubmit}
                        activeOpacity={0.7}
                    >
                        <Text className="text-sm font-medium text-foreground">
                            LinkedIn
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Sign Up Link */}
            <View className="mt-6 flex-row items-center justify-center">
                <Text className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                </Text>
                <TouchableOpacity onPress={onSignUpClick}>
                    <Text className="text-sm font-medium text-primary">Sign up</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default LoginCard;

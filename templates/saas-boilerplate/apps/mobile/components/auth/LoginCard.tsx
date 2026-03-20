import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoginSchema } from "@workspace/auth/utils/zod";
import { LoginCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";
import {
    Input,
    Button,
    Heading,
    Subtitle,
    Label,
    ErrorText,
    MutedText,
} from "../common";

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
                <Heading>Login</Heading>
                <Subtitle>Welcome back! Please enter your details.</Subtitle>
            </View>

            {/* Email Form */}
            {showEmail && (
                <View className="mb-6">
                    {/* Email Field */}
                    <View className="mb-4">
                        <Label className="mb-1.5">Email</Label>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    placeholder="name@example.com"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                    onChangeText={onChange}
                                    value={value}
                                />
                            )}
                        />
                        {errors.email && (
                            <ErrorText>{errors.email.message}</ErrorText>
                        )}
                    </View>

                    {/* Password Field */}
                    <View className="mb-4">
                        <View className="flex-row items-center justify-between mb-1.5">
                            <Label>Password</Label>
                            <TouchableOpacity onPress={onForgotPasswordClick}>
                                <Label className="text-xs text-primary hover:opacity-80">
                                    Forgot password?
                                </Label>
                            </TouchableOpacity>
                        </View>
                        <Controller
                            control={control}
                            name="password"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    placeholder="******"
                                    secureTextEntry
                                    editable={!pending}
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                />
                            )}
                        />
                        {errors.password && (
                            <ErrorText>{errors.password.message}</ErrorText>
                        )}
                    </View>

                    <FormResult type="error" message={errorMessage} />

                    {/* Submit Button */}
                    <Button
                        className="mt-2"
                        label="Sign in"
                        loading={pending}
                        onPress={handleSubmit(onSubmit)}
                        disabled={pending}
                    />
                </View>
            )}

            {/* Social Providers */}
            <View className="gap-3">
                {showGoogleProvider && (
                    <Button
                        variant="outline"
                        label="Google"
                        onPress={onGoogleProviderSubmit}
                    />
                )}
                {showGithubProvider && (
                    <Button
                        variant="outline"
                        label="GitHub"
                        onPress={onGithubProviderSubmit}
                    />
                )}
                {showLinkedinProvider && (
                    <Button
                        variant="outline"
                        label="LinkedIn"
                        onPress={onLinkedinProviderSubmit}
                    />
                )}
            </View>

            {/* Sign Up Link */}
            <View className="mt-6 flex-row items-center justify-center">
                <MutedText>Don't have an account? </MutedText>
                <TouchableOpacity onPress={onSignUpClick}>
                    <Label className="text-primary hover:opacity-80">Sign up</Label>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default LoginCard;

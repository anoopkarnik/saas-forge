import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RegisterSchema } from "@workspace/auth/utils/zod";
import { RegisterCardProps } from "@workspace/auth/utils/typescript";
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
                <Heading>Create an account</Heading>
                <Subtitle>Enter your information to get started</Subtitle>
            </View>

            {/* Email Form */}
            {showEmail && (
                <View className="mb-6">
                    {FIELDS.map((field) => (
                        <View key={field.name} className="mb-4">
                            <Label className="mb-1.5">{field.label}</Label>
                            <Controller
                                control={control}
                                name={field.name}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <Input
                                        placeholder={field.placeholder}
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
                                <ErrorText>{errors[field.name]?.message}</ErrorText>
                            )}
                        </View>
                    ))}

                    <FormResult type="error" message={error as string} />
                    <FormResult type="success" message={success as string} />

                    {/* Submit Button */}
                    <Button
                        className="mt-2"
                        label="Create Account"
                        loading={isPending}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isPending}
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

            {/* Sign In Link */}
            <View className="mt-6 flex-row items-center justify-center">
                <MutedText>Already have an account? </MutedText>
                <TouchableOpacity onPress={onSignInClick} className="hover:opacity-80">
                    <Label className="text-primary">Log in</Label>
                </TouchableOpacity>
            </View>

            {/* Terms / Privacy */}
            <View className="mt-3 px-4">
                <MutedText className="text-xs text-center">
                    By clicking continue, you agree to our{" "}
                </MutedText>
                <View className="flex-row justify-center flex-wrap">
                    <TouchableOpacity onPress={onTermsOfServiceClick}>
                        <MutedText className="text-xs underline">
                            Terms of Service
                        </MutedText>
                    </TouchableOpacity>
                    <MutedText className="text-xs"> and </MutedText>
                    <TouchableOpacity onPress={onPrivacyPolicyClick}>
                        <MutedText className="text-xs underline">
                            Privacy Policy
                        </MutedText>
                    </TouchableOpacity>
                    <MutedText className="text-xs">.</MutedText>
                </View>
            </View>
        </View>
    );
};

export default RegisterCard;

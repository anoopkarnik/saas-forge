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
import { ForgotPasswordSchema } from "@workspace/auth/utils/zod";
import { ForgotPasswordCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";

const ForgotPasswordCard = ({
    errorMessage,
    successMessage,
    resetFunction,
    onBackToLoginClick,
}: ForgotPasswordCardProps) => {
    const [pending, setPending] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof ForgotPasswordSchema>>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(data: z.infer<typeof ForgotPasswordSchema>) {
        setPending(true);
        await resetFunction(data.email);
        setPending(false);
    }

    return (
        <ScrollView
            className="flex-1"
            contentContainerClassName="flex-grow justify-center"
            keyboardShouldPersistTaps="handled"
        >
            <View className="w-full max-w-md rounded-xl bg-card/50 p-6 shadow-xl backdrop-blur-sm">
                {/* Header */}
                <View className="mb-6">
                    <Text className="text-3xl font-bold tracking-tight text-center text-foreground">
                        Forgot Password
                    </Text>
                    <Text className="text-sm text-muted-foreground text-center mt-1">
                        Enter your email to reset your password
                    </Text>
                </View>

                {/* Form */}
                <View className="mb-6">
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

                    {errorMessage && (
                        <FormResult type="error" message={JSON.stringify(errorMessage)} />
                    )}
                    {successMessage && (
                        <FormResult
                            type="success"
                            message={JSON.stringify(successMessage)}
                        />
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        className="h-10 w-full items-center justify-center rounded-md bg-primary mt-4"
                        onPress={handleSubmit(onSubmit)}
                        disabled={pending}
                        activeOpacity={0.8}
                    >
                        {pending ? (
                            <ActivityIndicator color="hsl(0 0% 98%)" size="small" />
                        ) : (
                            <Text className="text-sm font-medium text-primary-foreground">
                                Send Reset Link
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Back to Login */}
                <View className="items-center">
                    <TouchableOpacity onPress={onBackToLoginClick}>
                        <Text className="text-sm font-normal text-muted-foreground">
                            Back to Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default ForgotPasswordCard;

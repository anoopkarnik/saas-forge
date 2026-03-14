import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ResetPasswordSchema } from "@workspace/auth/utils/zod";
import { ResetPasswordCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";

const ResetPasswordCard = ({
    errorMessage,
    successMessage,
    token,
    resetFunction,
    onBackToLoginClick,
}: ResetPasswordCardProps) => {
    const [pending, setPending] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<z.infer<typeof ResetPasswordSchema>>({
        resolver: zodResolver(ResetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(data: z.infer<typeof ResetPasswordSchema>) {
        setPending(true);
        await resetFunction(token, data.password);
        Alert.alert("Success", "Password reset successfully");
        if (onBackToLoginClick) {
            onBackToLoginClick();
        }
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
                        Reset Password
                    </Text>
                    <Text className="text-sm text-muted-foreground text-center mt-1">
                        Enter your new password below
                    </Text>
                </View>

                {/* Form */}
                <View className="mb-6">
                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-1.5">
                            New Password
                        </Text>
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

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-foreground mb-1.5">
                            Confirm Password
                        </Text>
                        <Controller
                            control={control}
                            name="confirmPassword"
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
                        {errors.confirmPassword && (
                            <Text className="text-xs text-destructive mt-1">
                                {errors.confirmPassword.message}
                            </Text>
                        )}
                    </View>

                    <FormResult type="error" message={errorMessage} />
                    <FormResult type="success" message={successMessage} />

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
                                Reset Password
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Back to Login */}
                <View className="items-center">
                    <TouchableOpacity onPress={onBackToLoginClick}>
                        <Text className="text-sm font-medium text-primary">
                            Back to Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default ResetPasswordCard;

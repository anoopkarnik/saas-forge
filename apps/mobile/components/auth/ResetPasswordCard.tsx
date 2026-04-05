import { useState } from "react";
import { View, Alert, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ResetPasswordSchema } from "@workspace/auth/utils/zod";
import { ResetPasswordCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";
import {
    Input,
    Button,
    Heading,
    Subtitle,
    Label,
    ErrorText,
} from "../common";

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
                    <Heading>Reset Password</Heading>
                    <Subtitle>Enter your new password below</Subtitle>
                </View>

                {/* Form */}
                <View className="mb-6">
                    <View className="mb-4">
                        <Label className="mb-1.5">New Password</Label>
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

                    <View className="mb-4">
                        <Label className="mb-1.5">Confirm Password</Label>
                        <Controller
                            control={control}
                            name="confirmPassword"
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
                        {errors.confirmPassword && (
                            <ErrorText>{errors.confirmPassword.message}</ErrorText>
                        )}
                    </View>

                    <FormResult type="error" message={errorMessage} />
                    <FormResult type="success" message={successMessage} />

                    {/* Submit Button */}
                    <Button
                        className="mt-4"
                        label="Reset Password"
                        loading={pending}
                        onPress={handleSubmit(onSubmit)}
                        disabled={pending}
                    />
                </View>

                {/* Back to Login */}
                <View className="items-center">
                    <Button
                        variant="ghost"
                        label="Back to Login"
                        onPress={onBackToLoginClick}
                    />
                </View>
            </View>
        </ScrollView>
    );
};

export default ResetPasswordCard;

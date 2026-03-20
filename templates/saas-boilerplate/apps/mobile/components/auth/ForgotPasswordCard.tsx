import { useState } from "react";
import { View, ScrollView } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ForgotPasswordSchema } from "@workspace/auth/utils/zod";
import { ForgotPasswordCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";
import {
    Input,
    Button,
    Heading,
    Subtitle,
    Label,
    ErrorText,
} from "../common";

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
                    <Heading>Forgot Password</Heading>
                    <Subtitle>Enter your email to reset your password</Subtitle>
                </View>

                {/* Form */}
                <View className="mb-6">
                    <View className="mb-4">
                        <Label className="mb-1.5">Email</Label>
                        <Controller
                            control={control}
                            name="email"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <Input
                                    placeholder="name@example.com"
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
                            <ErrorText>{errors.email.message}</ErrorText>
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
                    <Button
                        className="mt-4"
                        label="Send Reset Link"
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

export default ForgotPasswordCard;

import React, { useEffect, useState } from "react";
import { View, Alert } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { ResetPasswordSettingsSchema, AddPasswordSchema } from "@workspace/auth/utils/zod";
import { Label, MutedText, ErrorText, Button } from "@/components/common";
import { Input } from "@/components/common";

export default function PasswordSection() {
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const checkHasPassword = async () => {
            try {
                const { data: accounts } = await authClient.listAccounts();
                const hasCredential = accounts?.some((acc: any) => acc.providerId === "credential");
                setHasPassword(!!hasCredential);
            } catch {
                setHasPassword(false);
            }
        };
        checkHasPassword();
    }, []);

    const schema = hasPassword === false ? AddPasswordSchema : ResetPasswordSettingsSchema;

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema as any),
        defaultValues: {
            ...(hasPassword !== false && { currentPassword: "" }),
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            if (!hasPassword) {
                // Set password for social-only account
                const { error } = await authClient.setPassword({
                    newPassword: data.newPassword,
                    confirmPassword: data.confirmPassword,
                } as any);
                if (error) {
                    Alert.alert("Error", (error as any)?.message || "Failed to set password");
                } else {
                    Alert.alert("Success", "Password set successfully");
                    setHasPassword(true);
                    reset();
                }
            } else {
                // Change existing password
                const { error } = await authClient.changePassword({
                    newPassword: data.newPassword,
                    currentPassword: data.currentPassword || "",
                    revokeOtherSessions: true,
                });
                if (error) {
                    Alert.alert("Error", (error as any)?.statusText || "Failed to change password");
                } else {
                    Alert.alert("Success", "Password updated successfully");
                    reset();
                }
            }
        } catch {
            Alert.alert("Error", "Failed to update password");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Security
            </MutedText>
            <View className="rounded-xl bg-card border border-border/30 p-4">
                <Label className="text-base font-medium mb-1">
                    {hasPassword ? "Change Password" : "Set Password"}
                </Label>
                <MutedText className="text-xs mb-4">
                    {hasPassword
                        ? "Update your current password."
                        : "Add a password to your social-only account."}
                </MutedText>

                {hasPassword !== false && (
                    <View className="mb-3">
                        <Label className="text-sm mb-1">Current Password</Label>
                        <Controller
                            control={control}
                            name="currentPassword"
                            render={({ field: { onChange, value } }) => (
                                <Input
                                    value={value}
                                    onChangeText={onChange}
                                    placeholder="Current password"
                                    secureTextEntry
                                    editable={hasPassword !== null}
                                />
                            )}
                        />
                        {(errors as any).currentPassword?.message && (
                            <ErrorText>{(errors as any).currentPassword.message as string}</ErrorText>
                        )}
                    </View>
                )}

                <View className="mb-3">
                    <Label className="text-sm mb-1">New Password</Label>
                    <Controller
                        control={control}
                        name="newPassword"
                        render={({ field: { onChange, value } }) => (
                            <Input
                                value={value}
                                onChangeText={onChange}
                                placeholder="New password"
                                secureTextEntry
                            />
                        )}
                    />
                    {(errors as any).newPassword?.message && (
                        <ErrorText>{(errors as any).newPassword.message as string}</ErrorText>
                    )}
                </View>

                <View className="mb-4">
                    <Label className="text-sm mb-1">Confirm Password</Label>
                    <Controller
                        control={control}
                        name="confirmPassword"
                        render={({ field: { onChange, value } }) => (
                            <Input
                                value={value}
                                onChangeText={onChange}
                                placeholder="Confirm password"
                                secureTextEntry
                            />
                        )}
                    />
                    {(errors as any).confirmPassword?.message && (
                        <ErrorText>{(errors as any).confirmPassword.message as string}</ErrorText>
                    )}
                </View>

                <Button
                    label={
                        isSubmitting
                            ? "Updating..."
                            : hasPassword
                                ? "Update Password"
                                : "Set Password"
                    }
                    variant="primary"
                    onPress={handleSubmit(onSubmit)}
                    disabled={hasPassword === null || isSubmitting}
                    loading={isSubmitting}
                />
            </View>
        </View>
    );
}

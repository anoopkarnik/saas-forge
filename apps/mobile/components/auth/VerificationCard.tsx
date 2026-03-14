import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { VerificationCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";

const VerificationCard = ({
    errorMessage,
    successMessage,
    onBackToLoginClick,
}: VerificationCardProps) => {
    return (
        <View className="w-full max-w-md rounded-xl bg-card/50 p-6 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <View className="mb-6">
                <Text className="text-3xl font-bold tracking-tight text-center text-foreground">
                    Verification
                </Text>
                <Text className="text-sm text-muted-foreground text-center mt-1">
                    Verifying your identity...
                </Text>
            </View>

            {/* Content */}
            <View className="items-center justify-center py-4">
                {!successMessage && !errorMessage && (
                    <ActivityIndicator size="large" color="hsl(240 5.9% 10%)" />
                )}
                {!successMessage && (
                    <FormResult type="error" message={errorMessage} />
                )}
                <FormResult type="success" message={successMessage} />
            </View>

            {/* Back to Login */}
            <View className="items-center mt-4">
                <TouchableOpacity onPress={onBackToLoginClick}>
                    <Text className="text-sm font-medium text-primary">
                        Back to Login
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default VerificationCard;

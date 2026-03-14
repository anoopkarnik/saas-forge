import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ErrorCardProps } from "@workspace/auth/utils/typescript";

const ErrorCard = ({ errorMessage, onBackToLoginClick }: ErrorCardProps) => {
    return (
        <View className="w-full rounded-xl bg-card/50 p-6 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <View className="mb-6">
                <View className="flex-row items-center justify-center gap-3 mb-2">
                    <Text className="text-3xl">⚠️</Text>
                    <Text className="text-3xl font-bold tracking-tight text-destructive">
                        Error
                    </Text>
                </View>
                <Text className="text-sm text-muted-foreground text-center px-4">
                    {errorMessage || "Oops! Something went wrong!"}
                </Text>
            </View>

            {/* Back to Login Button */}
            <TouchableOpacity
                className="h-10 w-full items-center justify-center rounded-md border border-input bg-background"
                onPress={onBackToLoginClick}
                activeOpacity={0.7}
            >
                <Text className="text-sm font-medium text-foreground">
                    Back to Login
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default ErrorCard;

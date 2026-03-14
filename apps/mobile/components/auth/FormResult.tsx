import React from "react";
import { View, Text } from "react-native";
import { FormResultProps } from "@workspace/auth/utils/typescript";

export const FormResult = ({ type, message }: FormResultProps) => {
    if (!message) return null;

    if (type === "success") {
        return (
            <View className="flex-row items-center gap-2 rounded-md bg-green-700/15 p-3">
                <Text className="text-sm text-green-700">✓</Text>
                <Text className="text-sm text-green-700 flex-1">{message}</Text>
            </View>
        );
    }

    return (
        <View className="flex-row items-center gap-2 rounded-md bg-destructive/15 p-3">
            <Text className="text-sm text-destructive">⚠</Text>
            <Text className="text-sm text-destructive flex-1">{message}</Text>
        </View>
    );
};

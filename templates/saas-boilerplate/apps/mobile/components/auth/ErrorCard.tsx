import { View, Text } from "react-native";
import { ErrorCardProps } from "@workspace/auth/utils/typescript";
import { Heading, Button, MutedText } from "../common";

const ErrorCard = ({ errorMessage, onBackToLoginClick }: ErrorCardProps) => {
    return (
        <View className="w-full rounded-xl bg-card/50 p-6 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <View className="mb-6">
                <View className="flex-row items-center justify-center gap-3 mb-2">
                    <Text className="text-3xl">⚠️</Text>
                    <Heading className="text-destructive">Error</Heading>
                </View>
                <MutedText className="text-center px-4">
                    {errorMessage || "Oops! Something went wrong!"}
                </MutedText>
            </View>

            {/* Back to Login Button */}
            <Button
                variant="outline"
                label="Back to Login"
                onPress={onBackToLoginClick}
            />
        </View>
    );
};

export default ErrorCard;

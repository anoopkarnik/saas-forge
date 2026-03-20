import { View, ActivityIndicator } from "react-native";
import { VerificationCardProps } from "@workspace/auth/utils/typescript";
import { FormResult } from "./FormResult";
import { Heading, Subtitle, Button } from "../common";

const VerificationCard = ({
    errorMessage,
    successMessage,
    onBackToLoginClick,
}: VerificationCardProps) => {
    return (
        <View className="w-full max-w-md rounded-xl bg-card/50 p-6 shadow-xl backdrop-blur-sm">
            {/* Header */}
            <View className="mb-6">
                <Heading>Verification</Heading>
                <Subtitle>Verifying your identity...</Subtitle>
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
                <Button
                    variant="ghost"
                    label="Back to Login"
                    onPress={onBackToLoginClick}
                />
            </View>
        </View>
    );
};

export default VerificationCard;

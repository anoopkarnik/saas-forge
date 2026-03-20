import React from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Heading, MutedText, Label } from "@/components/common";
import { Button } from "@/components/common";

type CmsSectionWrapperProps = {
    title: string;
    icon: string;
    description: string;
    onBack: () => void;
    onSave: () => void;
    isSaving: boolean;
    isDirty: boolean;
    children: React.ReactNode;
};

export default function CmsSectionWrapper({
    title,
    icon,
    description,
    onBack,
    onSave,
    isSaving,
    isDirty,
    children,
}: CmsSectionWrapperProps) {
    return (
        <View className="flex-1 bg-background">
            <ScrollView
                className="flex-1"
                contentContainerClassName="p-5 pb-32"
                keyboardShouldPersistTaps="handled"
            >
                <View className="flex-row items-center gap-3 mb-1">
                    <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                        <MutedText className="text-2xl">{"\u2039"}</MutedText>
                    </TouchableOpacity>
                    <MutedText className="text-xl">{icon}</MutedText>
                    <Heading className="text-left text-xl">{title}</Heading>
                </View>
                <MutedText className="text-xs mb-5 ml-11">{description}</MutedText>

                {children}
            </ScrollView>

            {/* Fixed Save Bar */}
            <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border/30 px-5 py-3 pb-8">
                <View className="flex-row items-center justify-between">
                    <MutedText className="text-xs">
                        {isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </MutedText>
                    <TouchableOpacity
                        className={`px-5 py-2.5 rounded-lg ${isDirty && !isSaving ? "bg-primary" : "bg-primary/40"}`}
                        activeOpacity={0.8}
                        onPress={onSave}
                        disabled={!isDirty || isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="hsl(0 0% 98%)" />
                        ) : (
                            <Label className="text-xs text-primary-foreground font-semibold">
                                Save {title}
                            </Label>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

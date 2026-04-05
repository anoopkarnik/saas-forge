import React from "react";
import { View, TextInput, TextInputProps } from "react-native";
import { Label, MutedText } from "@/components/common";

type CmsFormFieldProps = {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    multiline?: boolean;
    numberOfLines?: number;
};

export default function CmsFormField({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    numberOfLines = 1,
}: CmsFormFieldProps) {
    return (
        <View className="mb-4">
            <Label className="text-xs mb-1.5">{label}</Label>
            <TextInput
                className={`w-full rounded-lg bg-sidebar/50 px-3 text-sm text-foreground border border-border/30 ${
                    multiline ? "py-2.5 min-h-[80px]" : "h-10"
                }`}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="hsl(240 3.8% 46.1%)"
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlignVertical={multiline ? "top" : "center"}
            />
        </View>
    );
}

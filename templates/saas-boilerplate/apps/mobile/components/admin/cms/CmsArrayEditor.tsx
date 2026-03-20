import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Label, MutedText } from "@/components/common";

type CmsArrayEditorProps<T> = {
    title: string;
    items: T[];
    onAdd: () => void;
    onRemove: (index: number) => void;
    addLabel: string;
    emptyMessage: string;
    renderItem: (item: T, index: number) => React.ReactNode;
};

export default function CmsArrayEditor<T>({
    title,
    items,
    onAdd,
    onRemove,
    addLabel,
    emptyMessage,
    renderItem,
}: CmsArrayEditorProps<T>) {
    return (
        <View className="mt-2">
            <View className="flex-row items-center justify-between mb-3">
                <Label className="text-sm font-semibold">{title}</Label>
                <TouchableOpacity
                    className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20"
                    activeOpacity={0.7}
                    onPress={onAdd}
                >
                    <Label className="text-xs text-primary font-medium">+ {addLabel}</Label>
                </TouchableOpacity>
            </View>

            {items.length === 0 ? (
                <View className="p-4 rounded-xl bg-muted/30 border border-border/20 items-center">
                    <MutedText className="text-xs">{emptyMessage}</MutedText>
                </View>
            ) : (
                <View className="gap-3">
                    {items.map((item, index) => (
                        <View
                            key={index}
                            className="p-4 rounded-xl bg-card border border-border/30"
                        >
                            <View className="flex-row items-center justify-between mb-3">
                                <MutedText className="text-xs font-medium">
                                    #{index + 1}
                                </MutedText>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => onRemove(index)}
                                >
                                    <MutedText className="text-xs text-destructive font-medium">
                                        Remove
                                    </MutedText>
                                </TouchableOpacity>
                            </View>
                            {renderItem(item, index)}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

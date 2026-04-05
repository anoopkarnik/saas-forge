import React from "react";
import { View, Text, Image, Linking, TouchableOpacity } from "react-native";

function renderRichText(richText: any[] = []) {
    return richText.map((t, idx) => {
        const plain = t.plain_text ?? "";
        const a = t.annotations ?? {};
        let style: any = {};

        if (a.bold) style.fontWeight = "bold";
        if (a.italic) style.fontStyle = "italic";
        if (a.strikethrough) style.textDecorationLine = "line-through";
        if (a.underline) style.textDecorationLine = "underline";
        if (a.code) {
            style.fontFamily = "monospace";
            style.backgroundColor = "rgba(100,100,100,0.2)";
        }
        if (t.href) {
            style.color = "#4c1d95"; // Primary color
            style.textDecorationLine = "underline";
        }

        const component = (
            <Text key={idx} style={style} onPress={t.href ? () => Linking.openURL(t.href) : undefined}>
                {plain}
            </Text>
        );

        return component;
    });
}

function NativeBlock({ block }: { block: any }) {
    const type = block.type;

    switch (type) {
        case "paragraph":
            return <Text className="my-2 leading-6 text-foreground/90">{renderRichText(block.paragraph?.rich_text)}</Text>;

        case "heading_1":
            return <Text className="mt-8 mb-3 text-3xl font-bold text-foreground">{renderRichText(block.heading_1?.rich_text)}</Text>;

        case "heading_2":
            return <Text className="mt-6 mb-2 text-2xl font-semibold text-foreground border-b border-border/40 pb-1">{renderRichText(block.heading_2?.rich_text)}</Text>;

        case "heading_3":
            return <Text className="mt-4 mb-1 text-xl font-medium text-foreground">{renderRichText(block.heading_3?.rich_text)}</Text>;

        case "bulleted_list_item":
            return (
                <View className="flex-row items-start my-1 pl-2 pr-2">
                    <Text className="mr-2 text-foreground/90">•</Text>
                    <View className="flex-1">
                        <Text className="leading-6 text-foreground/90">{renderRichText(block.bulleted_list_item?.rich_text)}</Text>
                        {block.children?.length ? <NativeBlocks blocks={block.children} /> : null}
                    </View>
                </View>
            );

        case "numbered_list_item":
            return (
                <View className="flex-row items-start my-1 pl-2 pr-2">
                    <Text className="mr-2 text-foreground/90">-</Text>
                    <View className="flex-1">
                        <Text className="leading-6 text-foreground/90">{renderRichText(block.numbered_list_item?.rich_text)}</Text>
                        {block.children?.length ? <NativeBlocks blocks={block.children} /> : null}
                    </View>
                </View>
            );

        case "to_do":
            return (
                <View className="flex-row items-start my-2">
                    <View className={`w-5 h-5 mr-3 mt-0.5 border rounded-sm items-center justify-center ${block.to_do?.checked ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {block.to_do?.checked && <Text className="text-primary-foreground text-xs">✓</Text>}
                    </View>
                    <View className="flex-1">
                        <Text className={`leading-6 ${block.to_do?.checked ? 'line-through text-muted-foreground' : 'text-foreground/90'}`}>
                            {renderRichText(block.to_do?.rich_text)}
                        </Text>
                        {block.children?.length ? <NativeBlocks blocks={block.children} /> : null}
                    </View>
                </View>
            );

        case "quote":
            return (
                <View className="my-4 border-l-4 border-primary/50 pl-4 py-2 bg-muted/10 rounded-r-lg">
                    <Text className="italic text-muted-foreground leading-6">
                        {renderRichText(block.quote?.rich_text)}
                    </Text>
                    {block.children?.length ? <NativeBlocks blocks={block.children} /> : null}
                </View>
            );

        case "divider":
            return <View className="my-6 border-b border-border/60" />;

        case "callout":
            return (
                <View className="my-4 rounded-lg border border-border/50 bg-muted/30 p-4 flex-row items-start shadow-sm">
                    {block.callout.icon?.emoji && <Text className="text-xl mr-3">{block.callout.icon.emoji}</Text>}
                    <View className="flex-1">
                        <Text className="font-medium text-foreground/90 leading-6">{renderRichText(block.callout?.rich_text)}</Text>
                        {block.children?.length ? <View className="mt-2"><NativeBlocks blocks={block.children} /></View> : null}
                    </View>
                </View>
            );

        case "code":
            return (
                <View className="my-4 rounded-xl bg-sidebar p-4 shadow-sm relative">
                    <Text className="font-mono text-sm leading-5 text-foreground/90">
                        {(block.code?.rich_text ?? []).map((t: any) => t.plain_text).join("")}
                    </Text>
                    {block.code?.language && (
                        <View className="absolute right-3 bottom-2 bg-background/50 px-2 py-1 rounded">
                            <Text className="text-xs text-muted-foreground font-mono">{block.code.language}</Text>
                        </View>
                    )}
                </View>
            );

        case "image": {
            const img = block.image;
            const url = img?.type === "external" ? img.external?.url : img?.file?.url;
            const caption = img?.caption?.length ? img.caption.map((c: any) => c.plain_text).join("") : null;

            return url ? (
                <View className="my-5 items-center">
                    <Image source={{ uri: url }} className="w-full h-48 rounded-xl bg-muted" resizeMode="cover" />
                    {caption && <Text className="mt-2 text-center text-xs text-muted-foreground italic">{caption}</Text>}
                </View>
            ) : null;
        }

        case "bookmark": {
            const url = block.bookmark?.url;
            return url ? (
                <TouchableOpacity onPress={() => Linking.openURL(url)} activeOpacity={0.7} className="my-3 flex-row items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    <View className="p-2 bg-primary/10 rounded-md">
                        <Text className="text-primary text-xs">🔗</Text>
                    </View>
                    <Text className="flex-1 text-sm font-medium text-foreground/80 underline" numberOfLines={1}>{url}</Text>
                </TouchableOpacity>
            ) : null;
        }

        default:
            return (
                <View className="my-2 rounded border border-dashed border-border/50 p-2">
                    <Text className="text-xs text-muted-foreground/50">Unsupported block: {type}</Text>
                </View>
            );
    }
}

export function NativeBlocks({ blocks }: { blocks: any[] }) {
    if (!blocks || !Array.isArray(blocks)) return null;
    return (
        <View className="flex-1">
            {blocks.map((b, i) => <NativeBlock key={b.id || `block-${i}`} block={b} />)}
        </View>
    );
}

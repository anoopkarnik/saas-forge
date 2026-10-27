import React from "react";
import { View, Text } from "react-native";

// Minimal markdown renderer for docs and blog posts: headings, lists, code blocks and paragraphs.
export default function NativeMarkdown({ content }: { content: string }) {
    const lines = content.split("\n");
    let inCodeBlock = false;

    return (
        <View>
            {lines.map((line, index) => {
                const trimmed = line.trim();

                if (trimmed.startsWith("```")) {
                    inCodeBlock = !inCodeBlock;
                    return null;
                }

                if (inCodeBlock) {
                    return (
                        <View key={`code-${index}`} className="my-1 rounded-lg bg-sidebar px-3 py-2">
                            <Text className="font-mono text-sm text-foreground/90">{line || " "}</Text>
                        </View>
                    );
                }

                if (!trimmed) {
                    return <View key={`space-${index}`} className="h-3" />;
                }

                if (trimmed.startsWith("# ")) {
                    return <Text key={`h1-${index}`} className="mb-3 mt-8 text-3xl font-bold text-foreground">{trimmed.slice(2)}</Text>;
                }

                if (trimmed.startsWith("## ")) {
                    return <Text key={`h2-${index}`} className="mb-2 mt-6 border-b border-border/40 pb-1 text-2xl font-semibold text-foreground">{trimmed.slice(3)}</Text>;
                }

                if (trimmed.startsWith("### ")) {
                    return <Text key={`h3-${index}`} className="mb-1 mt-4 text-xl font-medium text-foreground">{trimmed.slice(4)}</Text>;
                }

                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    return (
                        <View key={`li-${index}`} className="my-1 flex-row items-start pl-2 pr-2">
                            <Text className="mr-2 text-foreground/90">•</Text>
                            <Text className="flex-1 leading-6 text-foreground/90">{trimmed.slice(2)}</Text>
                        </View>
                    );
                }

                return <Text key={`p-${index}`} className="my-2 leading-6 text-foreground/90">{line}</Text>;
            })}
        </View>
    );
}

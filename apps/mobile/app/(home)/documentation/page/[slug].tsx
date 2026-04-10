import React, { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Alert, Text } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Heading, MutedText } from "@/components/common";
import { NativeBlocks } from "@/components/documentation/NativeBlocks";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

type DocItem = {
    id: string;
    Name: string;
    Type: string;
    slug: string;
    "Last edited time": string;
};

function NativeMarkdown({ content }: { content: string }) {
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

export default function DocumentationPage() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const [blocks, setBlocks] = useState<any[] | string>([]);
    const [docItem, setDocItem] = useState<DocItem | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            try {
                // Fetch info to get the metadata
                const infoRes = await fetch(`${baseURL}/api/trpc/documentation.getDocumentationInfoFromNotion`);
                if (infoRes.ok) {
                    const infoJson = await infoRes.json();
                    let allDocs = [];
                    if (infoJson?.result?.data?.json) {
                        allDocs = infoJson.result.data.json.docs;
                    } else if (infoJson?.result?.data?.docs) {
                        allDocs = infoJson.result.data.docs;
                    }

                    if (allDocs) {
                        const found = allDocs.find((d: DocItem) => d.slug === slug);
                        if (found) setDocItem(found);
                    }
                }

                // Fetch the blocks
                const input = encodeURIComponent(JSON.stringify({ slug }));
                const blockRes = await fetch(`${baseURL}/api/trpc/documentation.queryDocumentationBySlug?input=${input}`);
                if (!blockRes.ok) throw new Error("Failed to fetch page blocks");
                const blockJson = await blockRes.json();

                if (blockJson?.result?.data?.json) {
                    setBlocks(blockJson.result.data.json);
                } else {
                    setBlocks(blockJson?.result?.data || []);
                }
            } catch (err) {
                Alert.alert("Error", "Could not load this page.");
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, [slug]);

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Stack.Screen options={{ title: docItem?.Name || "Loading...", headerShown: true }} />

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : ((typeof blocks === "string" && !blocks.trim()) || (Array.isArray(blocks) && !blocks.length)) ? (
                <View className="flex-1 items-center justify-center mt-10">
                    <MutedText>No documentation content found.</MutedText>
                </View>
            ) : (
                <View className="mb-20">
                    <View className="mb-8 border-b border-border/40 pb-6">
                        <View className="flex-row items-center gap-2 mb-2">
                            <MutedText className="text-sm">Docs</MutedText>
                            <MutedText className="text-sm">/</MutedText>
                            <Text className="text-sm font-medium text-foreground">{docItem?.Type || "Page"}</Text>
                        </View>
                        <Heading className="text-left text-3xl font-bold mb-3">{docItem?.Name || "Documentation"}</Heading>
                        <MutedText className="text-xs">
                            Last updated: {docItem ? new Date(docItem["Last edited time"]).toLocaleString() : ""}
                        </MutedText>
                    </View>

                    {typeof blocks === "string" ? <NativeMarkdown content={blocks} /> : <NativeBlocks blocks={blocks} />}
                </View>
            )}
        </ScrollView>
    );
}

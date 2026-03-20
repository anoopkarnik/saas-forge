import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Heading, Subtitle, MutedText, Label } from "@/components/common";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

type DocItem = {
    id: string;
    Name: string;
    Type: string;
    order: number;
    slug: string;
    "Last edited time": string;
};

type DocsData = {
    title: string;
    docs: DocItem[];
};

export default function DocumentationTypesList() {
    const [data, setData] = useState<DocsData | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchDocs() {
            try {
                const res = await fetch(`${baseURL}/api/trpc/documentation.getDocumentationInfoFromNotion`);
                if (!res.ok) throw new Error("Failed to fetch docs");
                const json = await res.json();
                if (json?.result?.data?.json) {
                    setData(json.result.data.json);
                } else {
                    setData(json?.result?.data || null);
                }
            } catch (err) {
                Alert.alert("Error", "Could not load documentation");
            } finally {
                setLoading(false);
            }
        }
        fetchDocs();
    }, []);

    // Extract unique types with count and minimum order
    const typesMap = data?.docs?.reduce(
        (acc: Record<string, { count: number; minOrder: number }>, doc) => {
            if (!acc[doc.Type]) {
                acc[doc.Type] = { count: 0, minOrder: doc.order };
            }
            acc[doc.Type].count += 1;
            acc[doc.Type].minOrder = Math.min(acc[doc.Type].minOrder, doc.order);
            return acc;
        },
        {},
    );
    const uniqueTypes = typesMap
        ? Object.keys(typesMap).sort((a, b) => typesMap[a].minOrder - typesMap[b].minOrder)
        : [];

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Stack.Screen options={{ headerShown: false }} />
            <Heading className="text-left text-2xl mb-1">Documentation</Heading>
            <Subtitle className="text-left mb-6">Select a category to view guides</Subtitle>

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : uniqueTypes.length > 0 ? (
                <View className="gap-3">
                    {uniqueTypes.map((type) => (
                        <TouchableOpacity
                            key={type}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/documentation/type/${encodeURIComponent(type)}`)}
                            className="flex-row items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                        >
                            <View className="w-12 h-12 rounded-xl bg-indigo-500/15 items-center justify-center">
                                <MutedText className="text-2xl">📚</MutedText>
                            </View>
                            <View className="flex-1">
                                <Label className="text-base">{type}</Label>
                                <MutedText className="text-xs mt-0.5">
                                    {typesMap![type].count} pages available
                                </MutedText>
                            </View>
                            <MutedText className="text-lg">›</MutedText>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View className="mt-10 items-center justify-center">
                    <MutedText>No documentation categories found.</MutedText>
                </View>
            )}
        </ScrollView>
    );
}

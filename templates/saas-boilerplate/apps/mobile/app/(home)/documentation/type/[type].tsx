import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
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

export default function DocumentationTypePagesList() {
    const { type } = useLocalSearchParams<{ type: string }>();
    const [docs, setDocs] = useState<DocItem[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchDocs() {
            try {
                const res = await fetch(`${baseURL}/api/trpc/documentation.getDocumentationInfoFromNotion`);
                if (!res.ok) throw new Error("Failed to fetch docs");
                const json = await res.json();
                let allDocs = [];
                if (json?.result?.data?.json) {
                    allDocs = json.result.data.json.docs;
                } else if (json?.result?.data?.docs) {
                    allDocs = json.result.data.docs;
                }

                if (allDocs) {
                    setDocs(
                        allDocs
                            .filter((d: DocItem) => d.Type === type)
                            .sort((a: DocItem, b: DocItem) => a.order - b.order),
                    );
                }
            } catch (err) {
                Alert.alert("Error", "Could not load pages");
            } finally {
                setLoading(false);
            }
        }
        fetchDocs();
    }, [type]);

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Stack.Screen options={{ title: type || "Documentation", headerShown: true }} />
            <Heading className="text-left text-2xl mb-1">{type}</Heading>
            <Subtitle className="text-left mb-6">Select a page to read</Subtitle>

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : docs.length > 0 ? (
                <View className="gap-3">
                    {docs.map((doc) => (
                        <TouchableOpacity
                            key={doc.id}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/documentation/page/${doc.slug}`)}
                            className="flex-row items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                        >
                            <View className="w-12 h-12 rounded-xl bg-indigo-500/15 items-center justify-center">
                                <MutedText className="text-2xl">📄</MutedText>
                            </View>
                            <View className="flex-1">
                                <Label className="text-base">{doc.Name}</Label>
                                <MutedText className="text-xs mt-0.5" numberOfLines={1}>
                                    Updated {new Date(doc["Last edited time"]).toLocaleDateString()}
                                </MutedText>
                            </View>
                            <MutedText className="text-lg">›</MutedText>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View className="mt-10 items-center justify-center">
                    <MutedText>No pages found for this category.</MutedText>
                </View>
            )}
        </ScrollView>
    );
}

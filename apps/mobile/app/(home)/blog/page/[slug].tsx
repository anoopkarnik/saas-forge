import React, { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator, Text } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Heading, MutedText } from "@/components/common";
import NativeMarkdown from "@/components/NativeMarkdown";
import { fetchBlogPost, type BlogPost } from "@/lib/blog-api";

export default function BlogPostScreen() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const [post, setPost] = useState<BlogPost | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlogPost(slug)
            .then(setPost)
            .catch(() => setPost(null))
            .finally(() => setLoading(false));
    }, [slug]);

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Stack.Screen options={{ title: post?.title || "Blog", headerShown: true }} />

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : !post ? (
                <View className="flex-1 items-center justify-center mt-10">
                    <MutedText>This post could not be found.</MutedText>
                </View>
            ) : (
                <View className="mb-20">
                    <View className="mb-8 border-b border-border/40 pb-6">
                        <Heading className="text-left text-3xl font-bold mb-3">{post.title}</Heading>
                        <MutedText className="text-xs">
                            By {post.authorName} · {new Date(post.publishedAt).toLocaleDateString()} · {post.readingMinutes} min read
                        </MutedText>
                    </View>

                    {post.summary ? (
                        <View className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
                            <Text className="mb-1 text-xs font-semibold uppercase text-primary">TL;DR</Text>
                            <Text className="leading-6 text-foreground">{post.summary}</Text>
                        </View>
                    ) : null}

                    <NativeMarkdown content={post.content} />

                    {post.tags.length > 0 ? (
                        <View className="mt-8 flex-row flex-wrap gap-2">
                            {post.tags.map((tag) => (
                                <View key={tag} className="rounded-full border border-border/40 px-3 py-1">
                                    <MutedText className="text-xs">{tag}</MutedText>
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            )}
        </ScrollView>
    );
}

import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Heading, Subtitle, MutedText, Label } from "@/components/common";
import { fetchBlogIndex, type BlogPostSummary } from "@/lib/blog-api";

export default function BlogList() {
    const [posts, setPosts] = useState<BlogPostSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchBlogIndex()
            .then((index) => setPosts(index.posts ?? []))
            .catch(() => Alert.alert("Error", "Could not load the blog"))
            .finally(() => setLoading(false));
    }, []);

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Stack.Screen options={{ headerShown: false }} />
            <Heading className="text-left text-2xl mb-1">Blog</Heading>
            <Subtitle className="text-left mb-6">Product updates, guides and lessons learned</Subtitle>

            {loading ? (
                <ActivityIndicator size="large" className="mt-10" />
            ) : posts.length > 0 ? (
                <View className="gap-3">
                    {posts.map((post) => (
                        <TouchableOpacity
                            key={post.slug}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/blog/page/${encodeURIComponent(post.slug)}`)}
                            className="p-4 rounded-xl bg-card border border-border/30"
                        >
                            <Label className="text-base">{post.title}</Label>
                            <MutedText className="text-sm mt-1">{post.excerpt}</MutedText>
                            <MutedText className="text-xs mt-2">
                                {post.authorName} · {new Date(post.publishedAt).toLocaleDateString()} · {post.readingMinutes} min read
                            </MutedText>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View className="mt-10 items-center justify-center">
                    <MutedText>No posts yet.</MutedText>
                </View>
            )}
        </ScrollView>
    );
}

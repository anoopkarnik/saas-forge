import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    Switch,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Button, Heading, Input, Label, MutedText, Subtitle } from "@/components/common";
import {
    createAdminPost,
    deleteAdminPost,
    fetchAdminPostById,
    fetchAdminPosts,
    updateAdminPost,
    type AdminBlogPost,
} from "@/lib/blog-api";

type Props = {
    onBack: () => void;
};

type ScreenState = "list" | "new" | "edit";

type PostDraft = {
    title: string;
    slug: string;
    excerpt: string;
    summary: string;
    content: string;
    coverImage: string;
    authorName: string;
    authorAvatar: string;
    tags: string;
    published: boolean;
};

const EMPTY_DRAFT: PostDraft = {
    title: "",
    slug: "",
    excerpt: "",
    summary: "",
    content: "",
    coverImage: "",
    authorName: "",
    authorAvatar: "",
    tags: "",
    published: false,
};

export default function BlogManagement({ onBack }: Props) {
    const [screen, setScreen] = useState<ScreenState>("list");
    const [posts, setPosts] = useState<AdminBlogPost[]>([]);
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [draft, setDraft] = useState<PostDraft>(EMPTY_DRAFT);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingPost, setLoadingPost] = useState(false);
    const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(null);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === "web") {
            window.alert(`${title}: ${message}`);
        } else {
            const { Alert: NativeAlert } = require("react-native");
            NativeAlert.alert(title, message);
        }
    };

    const loadPosts = useCallback(async () => {
        try {
            const data = await fetchAdminPosts();
            setPosts(data);
            setUnsupportedMessage(null);
        } catch (error: any) {
            if (error.message?.includes("only available for postgres CMS")) {
                setUnsupportedMessage(error.message);
                setPosts([]);
            } else {
                showAlert("Error", error.message || "Failed to load blog posts");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadPosts();
    };

    const openCreateForm = () => {
        setDraft(EMPTY_DRAFT);
        setSelectedPostId(null);
        setScreen("new");
    };

    const openEditForm = async (postId: string) => {
        setLoadingPost(true);
        try {
            const post = await fetchAdminPostById(postId);
            setSelectedPostId(post.id);
            setDraft({
                title: post.title,
                slug: post.slug,
                excerpt: post.excerpt,
                summary: post.summary ?? "",
                content: post.content,
                coverImage: post.coverImage ?? "",
                authorName: post.authorName,
                authorAvatar: post.authorAvatar ?? "",
                tags: post.tags.join(", "),
                published: post.status === "published",
            });
            setScreen("edit");
        } catch (error: any) {
            showAlert("Error", error.message || "Failed to load this blog post");
        } finally {
            setLoadingPost(false);
        }
    };

    const handleSave = async () => {
        const payload = {
            title: draft.title.trim(),
            slug: draft.slug.trim(),
            excerpt: draft.excerpt.trim(),
            summary: draft.summary.trim() || undefined,
            content: draft.content,
            coverImage: draft.coverImage.trim(),
            authorName: draft.authorName.trim(),
            authorAvatar: draft.authorAvatar.trim(),
            tags: [...new Set(draft.tags.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))],
            status: draft.published ? ("published" as const) : ("draft" as const),
        };

        if (!payload.title || !payload.slug || !payload.excerpt || !payload.authorName || !payload.content.trim()) {
            showAlert("Missing fields", "Please fill in title, slug, excerpt, author, and content before saving.");
            return;
        }

        setSaving(true);
        try {
            if (screen === "new") {
                await createAdminPost(payload);
                showAlert("Success", "Blog post created.");
            } else if (selectedPostId) {
                await updateAdminPost(selectedPostId, payload);
                showAlert("Success", "Blog post updated.");
            }

            await loadPosts();
            setScreen("list");
            setSelectedPostId(null);
            setDraft(EMPTY_DRAFT);
        } catch (error: any) {
            showAlert("Error", error.message || "Failed to save blog post");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPostId) return;

        const runDelete = async () => {
            setSaving(true);
            try {
                await deleteAdminPost(selectedPostId);
                showAlert("Success", "Blog post deleted.");
                await loadPosts();
                setScreen("list");
                setSelectedPostId(null);
                setDraft(EMPTY_DRAFT);
            } catch (error: any) {
                showAlert("Error", error.message || "Failed to delete blog post");
            } finally {
                setSaving(false);
            }
        };

        if (Platform.OS === "web") {
            if (window.confirm("Delete this blog post? This action cannot be undone.")) {
                await runDelete();
            }
            return;
        }

        const { Alert: NativeAlert } = require("react-native");
        NativeAlert.alert("Delete blog post", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => void runDelete() },
        ]);
    };

    const updateDraft = (field: keyof PostDraft, value: string | boolean) => {
        setDraft((current) => ({
            ...current,
            [field]: value,
        }));
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
                <MutedText className="mt-3 text-xs">Loading blog posts...</MutedText>
            </View>
        );
    }

    if (unsupportedMessage) {
        return (
            <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
                <View className="mb-1 flex-row items-center gap-3">
                    <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                        <MutedText className="text-2xl">{"‹"}</MutedText>
                    </TouchableOpacity>
                    <Heading className="text-left text-2xl">Blog Management</Heading>
                </View>
                <Subtitle className="mb-6 text-left">Editing is unavailable in the current CMS mode.</Subtitle>

                <View className="rounded-xl border border-border/40 bg-card p-4">
                    <Label className="mb-2 text-base">Editing unavailable</Label>
                    <MutedText>{unsupportedMessage}</MutedText>
                </View>
            </ScrollView>
        );
    }

    if (screen === "new" || screen === "edit") {
        const field = (key: keyof PostDraft, label: string, autoCapitalize: "none" | "sentences" = "sentences") => (
            <View className="gap-2">
                <Label>{label}</Label>
                <Input
                    value={draft[key] as string}
                    onChangeText={(value) => updateDraft(key, value)}
                    autoCapitalize={autoCapitalize}
                />
            </View>
        );

        return (
            <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
                <View className="mb-1 flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => setScreen("list")} activeOpacity={0.7}>
                        <MutedText className="text-2xl">{"‹"}</MutedText>
                    </TouchableOpacity>
                    <Heading className="text-left text-2xl">
                        {screen === "new" ? "New Blog Post" : "Edit Blog Post"}
                    </Heading>
                </View>
                <Subtitle className="mb-6 text-left">Drafts stay hidden until you publish them.</Subtitle>

                {loadingPost ? (
                    <View className="mt-10 items-center">
                        <ActivityIndicator size="large" />
                    </View>
                ) : (
                    <View className="gap-4">
                        {field("title", "Title")}
                        {field("slug", "Slug (lowercase-with-hyphens)", "none")}
                        {field("authorName", "Author")}
                        {field("excerpt", "Excerpt")}
                        {field("summary", "TL;DR")}
                        {field("tags", "Tags (comma-separated)", "none")}
                        {field("coverImage", "Cover image URL", "none")}
                        {field("authorAvatar", "Author avatar URL", "none")}

                        <View className="gap-2">
                            <Label>Content</Label>
                            <TextInput
                                multiline
                                textAlignVertical="top"
                                className="min-h-[320px] rounded-md bg-sidebar/50 px-3 py-3 text-sm text-foreground"
                                placeholder="Write markdown content here..."
                                placeholderTextColor="hsl(240 3.8% 46.1%)"
                                value={draft.content}
                                onChangeText={(value) => updateDraft("content", value)}
                            />
                        </View>

                        <View className="flex-row items-center justify-between rounded-xl border border-border/30 bg-card p-4">
                            <Label>{draft.published ? "Published" : "Draft"}</Label>
                            <Switch value={draft.published} onValueChange={(value) => updateDraft("published", value)} />
                        </View>

                        <View className="mt-2 flex-row gap-3">
                            <Button
                                label={saving ? "Saving..." : "Save"}
                                loading={saving}
                                onPress={handleSave}
                                className="flex-1"
                            />
                            {screen === "edit" ? (
                                <Button
                                    label="Delete"
                                    variant="outline"
                                    onPress={handleDelete}
                                    className="flex-1"
                                    disabled={saving}
                                />
                            ) : null}
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="p-5 pb-24"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="hsl(142, 81%, 71%)" />
            }
        >
            <View className="mb-1 flex-row items-center gap-3">
                <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                    <MutedText className="text-2xl">{"‹"}</MutedText>
                </TouchableOpacity>
                <Heading className="text-left text-2xl">Blog Management</Heading>
            </View>
            <Subtitle className="mb-6 text-left">Write, publish, and manage blog posts.</Subtitle>

            <Button label="Create Blog Post" onPress={openCreateForm} className="mb-5" />

            <MutedText className="mb-3 text-xs font-medium uppercase tracking-wider">Posts</MutedText>
            <View className="gap-2">
                {posts.length ? (
                    posts.map((post) => (
                        <TouchableOpacity
                            key={post.id}
                            className="flex-row items-center gap-3 rounded-xl border border-border/30 bg-card p-4"
                            activeOpacity={0.7}
                            onPress={() => openEditForm(post.id)}
                        >
                            <MutedText className="text-xl">{"📰"}</MutedText>
                            <View className="flex-1">
                                <Label className="text-sm">{post.title}</Label>
                                <MutedText className="mt-0.5 text-xs">
                                    {post.status === "published" ? "Published" : "Draft"} · {post.slug}
                                </MutedText>
                            </View>
                            <MutedText className="text-lg">{"›"}</MutedText>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View className="rounded-xl border border-dashed border-border/40 p-5">
                        <MutedText>No blog posts yet. Create one to get started.</MutedText>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

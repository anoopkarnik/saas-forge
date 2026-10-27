"use client";

import React, { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { getCmsProvider } from "@/lib/cms-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { Loader2, Newspaper, Plus, RefreshCw, Trash2, Save, ExternalLink } from "lucide-react";
// scaffold:begin ai
import { AIFillPromptDialog } from "@workspace/ui/components/admin/AIFillPromptDialog";
// scaffold:end ai

type BlogFormState = {
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
    publishedAt: string;
    seoTitle: string;
    seoDescription: string;
    canonicalUrl: string;
};

const EMPTY_FORM: BlogFormState = {
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
    publishedAt: "",
    seoTitle: "",
    seoDescription: "",
    canonicalUrl: "",
};

const toSlug = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const parseTags = (value: string) =>
    [...new Set(value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

export default function BlogAdminPage() {
    const { isPending, isAdmin } = useAdminGuard();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const cmsProvider = getCmsProvider();
    const isPostgresCms = cmsProvider === "postgres";

    const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
    const [form, setForm] = useState<BlogFormState>(EMPTY_FORM);

    const postsQuery = useQuery({
        ...trpc.blog.listAdminPosts.queryOptions(undefined, {
            enabled: isAdmin && isPostgresCms,
        }),
        retry: false,
    });

    const selectedPostQuery = useQuery({
        ...trpc.blog.getAdminPostById.queryOptions(
            { id: typeof selectedId === "string" ? selectedId : "" },
            {
                enabled: isAdmin && isPostgresCms && typeof selectedId === "string" && selectedId !== "new",
            },
        ),
        retry: false,
    });

    useEffect(() => {
        if (!postsQuery.data || selectedId !== null) return;
        const firstPost = postsQuery.data[0];
        setSelectedId(firstPost ? firstPost.id : "new");
    }, [postsQuery.data, selectedId]);

    useEffect(() => {
        if (selectedId === "new") {
            setForm(EMPTY_FORM);
            return;
        }

        const post = selectedPostQuery.data;
        if (!post) return;

        setForm({
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
            publishedAt: post.publishedAt ? post.publishedAt.slice(0, 10) : "",
            seoTitle: post.seoTitle ?? "",
            seoDescription: post.seoDescription ?? "",
            canonicalUrl: post.canonicalUrl ?? "",
        });
    }, [selectedId, selectedPostQuery.data]);

    const refreshAdminQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries(trpc.blog.listAdminPosts.queryFilter()),
            queryClient.invalidateQueries(trpc.blog.getBlogIndex.queryFilter()),
        ]);
    };

    const createPostMutation = useMutation(
        trpc.blog.createPost.mutationOptions({
            onSuccess: async (createdPost) => {
                toast.success("Blog post created");
                setSelectedId(createdPost.id);
                await refreshAdminQueries();
            },
            onError: (error) => {
                toast.error(error.message || "Failed to create blog post");
            },
        }),
    );

    const updatePostMutation = useMutation(
        trpc.blog.updatePost.mutationOptions({
            onSuccess: async (updatedPost) => {
                toast.success("Blog post updated");
                await Promise.all([
                    refreshAdminQueries(),
                    queryClient.invalidateQueries(trpc.blog.getAdminPostById.queryFilter({ id: updatedPost.id })),
                ]);
            },
            onError: (error) => {
                toast.error(error.message || "Failed to update blog post");
            },
        }),
    );

    const deletePostMutation = useMutation(
        trpc.blog.deletePost.mutationOptions({
            onSuccess: async () => {
                toast.success("Blog post deleted");
                setSelectedId(null);
                setForm(EMPTY_FORM);
                await refreshAdminQueries();
            },
            onError: (error) => {
                toast.error(error.message || "Failed to delete blog post");
            },
        }),
    );

    // scaffold:begin ai
    const fillPostWithAiMutation = useMutation(
        trpc.ai.generateAdminDraft.mutationOptions({
            onSuccess: (draft) => {
                if (draft.kind !== "blog") return;

                setForm((current) => ({
                    ...current,
                    title: draft.values.title,
                    slug: toSlug(draft.values.slug),
                    excerpt: draft.values.excerpt,
                    summary: draft.values.summary ?? current.summary,
                    content: draft.values.content,
                    tags: draft.values.tags.join(", "),
                }));
                toast.success("Blog post form filled");
            },
            onError: (error) => {
                toast.error("Could not fill blog post", {
                    description: error.message,
                });
            },
        }),
    );
    // scaffold:end ai

    const isSaving = createPostMutation.isPending || updatePostMutation.isPending;
    const activePost = postsQuery.data?.find((post) => post.id === selectedId) ?? null;

    const handleFieldChange = (field: keyof BlogFormState, value: string | boolean) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleNewPost = () => {
        setSelectedId("new");
        setForm(EMPTY_FORM);
    };

    const handleSave = () => {
        const payload = {
            title: form.title.trim(),
            slug: form.slug.trim(),
            excerpt: form.excerpt.trim(),
            summary: form.summary.trim() || undefined,
            content: form.content,
            coverImage: form.coverImage.trim(),
            authorName: form.authorName.trim(),
            authorAvatar: form.authorAvatar.trim(),
            tags: parseTags(form.tags),
            status: form.published ? ("published" as const) : ("draft" as const),
            publishedAt: form.publishedAt ? new Date(`${form.publishedAt}T00:00:00.000Z`).toISOString() : undefined,
            seoTitle: form.seoTitle.trim() || undefined,
            seoDescription: form.seoDescription.trim() || undefined,
            canonicalUrl: form.canonicalUrl.trim(),
        };

        if (!payload.title || !payload.slug || !payload.excerpt || !payload.authorName || !payload.content.trim()) {
            toast.error("Please fill in title, slug, excerpt, author, and content.");
            return;
        }

        if (selectedId === "new") {
            createPostMutation.mutate(payload);
            return;
        }

        if (typeof selectedId === "string") {
            updatePostMutation.mutate({
                id: selectedId,
                ...payload,
            });
        }
    };

    const handleDelete = () => {
        if (typeof selectedId !== "string" || !activePost) return;
        if (!confirm(`Delete "${activePost.title}"? This action cannot be undone.`)) return;
        deletePostMutation.mutate({ id: selectedId });
    };

    // scaffold:begin ai
    const handleAiFill = (instruction: string) => {
        fillPostWithAiMutation.mutate({
            kind: "blog",
            current: {
                title: form.title,
                slug: form.slug,
                excerpt: form.excerpt,
                summary: form.summary,
                content: form.content,
                tags: parseTags(form.tags),
            },
            instruction,
        });
    };
    // scaffold:end ai

    if (isPending || (isPostgresCms && postsQuery.isLoading)) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    const textField = (field: keyof BlogFormState, label: string, hint?: string, maxLength?: number) => (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <Input
                value={form[field] as string}
                maxLength={maxLength}
                onChange={(event) => handleFieldChange(field, event.target.value)}
            />
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    );

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 md:px-8">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                    <div className="rounded-xl bg-primary/10 p-3">
                        <Newspaper className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="page-title">Blog Management</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Write, publish, and manage public blog posts.
                        </p>
                    </div>
                </div>

                {isPostgresCms ? (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => postsQuery.refetch()} disabled={postsQuery.isFetching}>
                            <RefreshCw className={`h-4 w-4 ${postsQuery.isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button onClick={handleNewPost}>
                            <Plus className="h-4 w-4" />
                            New Post
                        </Button>
                    </div>
                ) : null}
            </div>

            {!isPostgresCms ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Editing Unavailable</CardTitle>
                        <CardDescription>
                            Blog editing is only available for postgres CMS right now. Your current CMS provider is{" "}
                            <span className="font-medium text-foreground">{cmsProvider}</span>.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <Card className="min-w-0 h-fit">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Posts</CardTitle>
                            <CardDescription>
                                {postsQuery.data?.length ?? 0} post{postsQuery.data?.length === 1 ? "" : "s"} in this project
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {postsQuery.data?.length ? (
                                postsQuery.data.map((post) => (
                                    <button
                                        key={post.id}
                                        type="button"
                                        onClick={() => setSelectedId(post.id)}
                                        className={`w-full rounded-lg border p-4 text-left transition ${selectedId === post.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                                            }`}
                                    >
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <div className="truncate font-medium">{post.title}</div>
                                            <Badge variant={post.status === "published" ? "default" : "secondary"}>
                                                {post.status === "published" ? "Published" : "Draft"}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                            <div>Slug: {post.slug}</div>
                                            <div>
                                                {post.publishedAt
                                                    ? `Published ${new Date(post.publishedAt).toLocaleDateString()}`
                                                    : `Updated ${new Date(post.updatedAt).toLocaleDateString()}`}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No blog posts yet. Create your first one to get started.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <CardTitle>{selectedId === "new" ? "Create Blog Post" : "Edit Blog Post"}</CardTitle>
                                    <CardDescription>
                                        Drafts stay hidden from the blog, sitemap, RSS feed and llms.txt until published.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {activePost?.status === "published" ? (
                                        <Button variant="outline" asChild>
                                            <a href={`/landing/blog/${activePost.slug}`} target="_blank" rel="noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                                View
                                            </a>
                                        </Button>
                                    ) : null}
                                    {typeof selectedId === "string" && selectedId !== "new" ? (
                                        <Button
                                            variant="destructive"
                                            onClick={handleDelete}
                                            disabled={deletePostMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {selectedPostQuery.isLoading && typeof selectedId === "string" && selectedId !== "new" ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Title</label>
                                            <Input
                                                value={form.title}
                                                onChange={(event) => {
                                                    const title = event.target.value;
                                                    setForm((current) => ({
                                                        ...current,
                                                        title,
                                                        slug: selectedId === "new" && current.slug === toSlug(current.title) ? toSlug(title) : current.slug,
                                                    }));
                                                }}
                                            />
                                        </div>
                                        {textField("slug", "Slug", "Lowercase letters, numbers and hyphens.")}
                                        {textField("authorName", "Author")}
                                        {textField("authorAvatar", "Author avatar URL")}
                                        {textField("tags", "Tags", "Comma-separated, up to 10.")}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Publish date</label>
                                            <Input
                                                type="date"
                                                value={form.publishedAt}
                                                onChange={(event) => handleFieldChange("publishedAt", event.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Left empty, it is set when you first publish.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Excerpt</label>
                                        <Textarea
                                            rows={2}
                                            maxLength={300}
                                            value={form.excerpt}
                                            onChange={(event) => handleFieldChange("excerpt", event.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">Shown on the blog index and used as the page description.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">TL;DR</label>
                                        <Textarea
                                            rows={3}
                                            maxLength={600}
                                            value={form.summary}
                                            onChange={(event) => handleFieldChange("summary", event.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            A short, direct answer shown first. Search engines and AI assistants often quote it.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Content</label>
                                        <Textarea
                                            rows={20}
                                            className="font-mono text-sm"
                                            value={form.content}
                                            onChange={(event) => handleFieldChange("content", event.target.value)}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {textField("coverImage", "Cover image URL", "Used for social previews (1200×630 works best).")}
                                        {textField("canonicalUrl", "Canonical URL", "Only when the post was first published elsewhere.")}
                                        {textField("seoTitle", "SEO title", "Optional, up to 70 characters.", 70)}
                                        {textField("seoDescription", "SEO description", "Optional, up to 160 characters.", 160)}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <label className="flex items-center gap-3 text-sm font-medium">
                                            <Switch
                                                checked={form.published}
                                                onCheckedChange={(checked) => handleFieldChange("published", checked)}
                                            />
                                            {form.published ? "Published" : "Draft"}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {/* scaffold:begin ai */}
                                            <AIFillPromptDialog
                                                isPending={fillPostWithAiMutation.isPending}
                                                onFill={handleAiFill}
                                            />
                                            {/* scaffold:end ai */}
                                            <Button onClick={handleSave} disabled={isSaving}>
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

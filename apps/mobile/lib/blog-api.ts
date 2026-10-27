import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export type BlogPostSummary = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    summary: string | null;
    coverImage: string | null;
    authorName: string;
    authorAvatar: string | null;
    tags: string[];
    publishedAt: string;
    updatedAt: string;
    readingMinutes: number;
};

export type BlogPost = BlogPostSummary & { content: string };

export type BlogIndex = { title: string; posts: BlogPostSummary[] };

export type AdminBlogPost = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    summary: string | null;
    content: string;
    coverImage: string | null;
    authorName: string;
    authorAvatar: string | null;
    tags: string[];
    status: "draft" | "published";
    publishedAt: string | null;
    updatedAt: string;
};

export type BlogPostEditorInput = {
    title: string;
    slug: string;
    excerpt: string;
    summary?: string;
    content: string;
    coverImage: string;
    authorName: string;
    authorAvatar: string;
    tags: string[];
    status: "draft" | "published";
};

async function authenticatedFetch(url: string, options?: RequestInit) {
    if (Platform.OS === "web") {
        return fetch(url, { ...options, credentials: "include" });
    }

    return authClient.$fetch(url, options);
}

async function readTrpcBody<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => null);

    if (!res.ok || body?.error) {
        const message =
            body?.error?.json?.message ??
            body?.error?.message ??
            "Request failed";
        throw new Error(message);
    }

    return body?.result?.data?.json ?? body?.result?.data ?? body;
}

export async function fetchBlogIndex(): Promise<BlogIndex> {
    const res = await fetch(`${baseURL}/api/trpc/blog.getBlogIndex`);
    return readTrpcBody<BlogIndex>(res);
}

export async function fetchBlogPost(slug: string): Promise<BlogPost> {
    const input = encodeURIComponent(JSON.stringify({ slug }));
    const res = await fetch(`${baseURL}/api/trpc/blog.getBlogPostBySlug?input=${input}`);
    return readTrpcBody<BlogPost>(res);
}

export async function fetchAdminPosts(): Promise<AdminBlogPost[]> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/blog.listAdminPosts`);
    return readTrpcBody<AdminBlogPost[]>(res);
}

export async function fetchAdminPostById(id: string): Promise<AdminBlogPost> {
    const input = encodeURIComponent(JSON.stringify({ id }));
    const res = await authenticatedFetch(`${baseURL}/api/trpc/blog.getAdminPostById?input=${input}`);
    return readTrpcBody<AdminBlogPost>(res);
}

export async function createAdminPost(input: BlogPostEditorInput): Promise<AdminBlogPost> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/blog.createPost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    return readTrpcBody<AdminBlogPost>(res);
}

export async function updateAdminPost(id: string, input: BlogPostEditorInput): Promise<AdminBlogPost> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/blog.updatePost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...input }),
    });

    return readTrpcBody<AdminBlogPost>(res);
}

export async function deleteAdminPost(id: string): Promise<{ success: boolean }> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/blog.deletePost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });

    return readTrpcBody<{ success: boolean }>(res);
}

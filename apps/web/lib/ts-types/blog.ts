export type BlogPostStatus = "draft" | "published";

export interface BlogPostSummary {
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
}

export interface BlogPost extends BlogPostSummary {
    content: string;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
}

export interface BlogIndexProps {
    title: string;
    logo: string;
    darkLogo: string;
    /** Published posts only, newest first. */
    posts: BlogPostSummary[];
}

export interface AdminBlogPost {
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
    status: BlogPostStatus;
    publishedAt: string | null;
    updatedAt: string;
    seoTitle: string | null;
    seoDescription: string | null;
    canonicalUrl: string | null;
}

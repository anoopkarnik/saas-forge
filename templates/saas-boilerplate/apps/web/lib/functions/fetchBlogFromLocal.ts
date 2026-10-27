import fs from "fs/promises";
import path from "path";
import { BlogIndexProps, BlogPost, BlogPostSummary } from "@/lib/ts-types/blog";
import { readingMinutes } from "@/lib/blog/reading-time";
import { blogPostData, landingPageData, type BlogPostSeed } from "@workspace/database/constants";

const readContent = async (post: BlogPostSeed): Promise<string | null> => {
    const filePath = path.join(process.cwd(), "../../packages/database/src/blog", post.filePath);
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch {
        console.error(`[blog] Could not read MDX file: ${filePath}`);
        return null;
    }
};

const toSummary = (post: BlogPostSeed, content: string): BlogPostSummary => ({
    id: post.slug,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    summary: post.summary ?? null,
    coverImage: post.coverImage ?? null,
    authorName: post.authorName,
    authorAvatar: post.authorAvatar ?? null,
    tags: post.tags,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    readingMinutes: readingMinutes(content),
});

const publishedPosts = () =>
    blogPostData
        .filter((post) => post.status === "published")
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

export async function fetchBlogIndexFromLocal(): Promise<BlogIndexProps> {
    const posts = await Promise.all(
        publishedPosts().map(async (post) => toSummary(post, (await readContent(post)) ?? "")),
    );

    return {
        title: process.env.NEXT_PUBLIC_SAAS_NAME || landingPageData.navbarSection.title || "",
        logo: landingPageData.navbarSection.logo || "",
        darkLogo: landingPageData.navbarSection.darkLogo || "",
        posts,
    };
}

export async function fetchBlogPostFromLocal(slug: string): Promise<BlogPost | null> {
    const post = publishedPosts().find((item) => item.slug === slug);
    if (!post) return null;

    const content = await readContent(post);
    if (content === null) return null;

    return {
        ...toSummary(post, content),
        content,
        seoTitle: post.seoTitle ?? null,
        seoDescription: post.seoDescription ?? null,
        canonicalUrl: post.canonicalUrl ?? null,
    };
}

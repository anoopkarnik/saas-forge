import { BlogIndexProps, BlogPost, BlogPostSummary } from "@/lib/ts-types/blog";
import { readingMinutes } from "@/lib/blog/reading-time";
import prisma from "@workspace/database/client";

type BlogPostRow = NonNullable<Awaited<ReturnType<typeof prisma.blogPost.findUnique>>>;

const toSummary = (row: BlogPostRow): BlogPostSummary => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    summary: row.summary,
    coverImage: row.coverImage,
    authorName: row.authorName,
    authorAvatar: row.authorAvatar,
    tags: row.tags,
    publishedAt: (row.publishedAt ?? row.updatedAt).toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    readingMinutes: readingMinutes(row.content),
});

export async function fetchBlogIndexFromPostgres(): Promise<BlogIndexProps> {
    const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";

    const landingPageData = await prisma.landingPage.findUnique({
        where: { title: saasName },
        include: {
            blogPosts: {
                where: { status: "published" },
                orderBy: { publishedAt: "desc" },
            },
        },
    });

    if (!landingPageData) {
        throw new Error(`Landing Page config not found in Postgres for name: ${saasName}`);
    }

    return {
        title: landingPageData.title,
        logo: landingPageData.logo || "",
        darkLogo: landingPageData.darkLogo || "",
        posts: landingPageData.blogPosts.map(toSummary),
    };
}

export async function fetchBlogPostFromPostgres(slug: string): Promise<BlogPost | null> {
    const row = await prisma.blogPost.findUnique({ where: { slug } });
    if (!row || row.status !== "published") return null;

    return {
        ...toSummary(row),
        content: row.content,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        canonicalUrl: row.canonicalUrl,
    };
}

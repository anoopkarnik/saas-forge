export type BlogPostSeed = {
  slug: string;
  title: string;
  excerpt: string;
  summary?: string;
  authorName: string;
  authorAvatar?: string;
  coverImage?: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string;
  updatedAt: string;
  /** Relative to packages/database/src/blog. */
  filePath: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
};

// Neutral posts every install starts with; replace them with your own.
export const sampleBlogPosts: BlogPostSeed[] = [
  {
    slug: "welcome-to-the-blog",
    title: "Welcome to the blog",
    excerpt: "What this blog is for, what you will find here and how to follow along.",
    summary:
      "This blog shares product updates, guides and lessons learned. New posts appear on the blog page, in the RSS feed and in the sitemap as soon as they are published.",
    authorName: "The Team",
    tags: ["announcements"],
    status: "published",
    publishedAt: "2026-10-27T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z",
    filePath: "samples/welcome.mdx",
  },
  {
    slug: "writing-your-first-post",
    title: "Writing your first post",
    excerpt: "How posts are written, drafted, published and made easy for search engines and AI assistants to find.",
    summary:
      "Write posts as MDX files in the repo or in the admin Blog editor. Fill in the excerpt and TL;DR, keep drafts unpublished until they are ready, and the page metadata, structured data, sitemap, RSS feed and llms.txt are handled for you.",
    authorName: "The Team",
    tags: ["guides", "seo"],
    status: "published",
    publishedAt: "2026-10-27T01:00:00.000Z",
    updatedAt: "2026-10-27T01:00:00.000Z",
    filePath: "samples/writing-posts.mdx",
  },
];

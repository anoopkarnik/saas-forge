import { sampleBlogPosts, type BlogPostSeed } from "./blog-samples";

export type { BlogPostSeed } from "./blog-samples";

// Your posts: add MDX files under packages/database/src/blog and list them here.
export const blogPostData: BlogPostSeed[] = [...sampleBlogPosts];

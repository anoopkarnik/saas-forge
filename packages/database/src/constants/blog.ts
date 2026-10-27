import { sampleBlogPosts, type BlogPostSeed } from "./blog-samples";

export type { BlogPostSeed } from "./blog-samples";

// SaaS Forge's own posts are appended here with
// `filePath: "saas-forge/<file>.mdx"`. That folder is root-only, and the
// starter overrides this file with the sample posts alone.
export const blogPostData: BlogPostSeed[] = [...sampleBlogPosts];

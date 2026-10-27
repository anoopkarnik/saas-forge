import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/database/constants", () => ({
  landingPageData: { navbarSection: { title: "Acme", logo: "/logo.png", darkLogo: "/dark.png" } },
  blogPostData: [
    {
      slug: "older",
      title: "Older",
      excerpt: "Older post",
      authorName: "Ann",
      tags: [],
      status: "published",
      publishedAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      filePath: "samples/welcome.mdx",
    },
    {
      slug: "newer",
      title: "Newer",
      excerpt: "Newer post",
      authorName: "Ann",
      tags: ["news"],
      status: "published",
      publishedAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
      filePath: "samples/writing-posts.mdx",
    },
    {
      slug: "secret",
      title: "Secret",
      excerpt: "Draft",
      authorName: "Ann",
      tags: [],
      status: "draft",
      publishedAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      filePath: "samples/welcome.mdx",
    },
    {
      slug: "gone",
      title: "Gone",
      excerpt: "Missing file",
      authorName: "Ann",
      tags: [],
      status: "published",
      publishedAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      filePath: "samples/does-not-exist.mdx",
    },
  ],
}));

const { fetchBlogIndexFromLocal, fetchBlogPostFromLocal } = await import("../functions/fetchBlogFromLocal");

describe("fetchBlogFromLocal", () => {
  it("fetchBlogIndexFromLocal hides drafts", async () => {
    const index = await fetchBlogIndexFromLocal();
    expect(index.posts.map((post) => post.slug)).not.toContain("secret");
  });

  it("index is sorted newest first", async () => {
    const index = await fetchBlogIndexFromLocal();
    expect(index.posts.map((post) => post.slug).slice(0, 2)).toEqual(["newer", "gone"]);
  });

  it("fetchBlogPostFromLocal returns null for a draft", async () => {
    expect(await fetchBlogPostFromLocal("secret")).toBeNull();
  });

  it("fetchBlogPostFromLocal returns null for missing file", async () => {
    expect(await fetchBlogPostFromLocal("gone")).toBeNull();
  });

  it("fetchBlogPostFromLocal returns content and reading time for a published post", async () => {
    const post = await fetchBlogPostFromLocal("newer");
    expect(post?.content).toContain("## Two ways to write a post");
    expect(post?.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(post?.summary).toBeNull();
  });
});

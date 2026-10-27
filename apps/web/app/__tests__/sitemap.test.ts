import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchDocumentation = vi.fn();
vi.mock("@/lib/functions/fetchDocumentation", () => ({
  fetchDocumentation: (...args: unknown[]) => mockFetchDocumentation(...args),
}));

const mockGetCachedBlogIndex = vi.fn();
vi.mock("@/lib/blog/cache", () => ({
  getCachedBlogIndex: (...args: unknown[]) => mockGetCachedBlogIndex(...args),
}));

import sitemap from "../sitemap";

const docs = {
  title: "Acme", logo: "", darkLogo: "",
  docs: [{ id: "d1", Name: "Overview", Type: "Guide", order: 1, slug: "overview", "Last edited time": "2026-03-04T00:00:00.000Z", "Created time": "2026-03-01T00:00:00.000Z" }],
};

const blog = {
  title: "Acme", logo: "", darkLogo: "",
  posts: [{ slug: "hello-world", updatedAt: "2026-09-09T00:00:00.000Z" }],
};

const find = (entries: Awaited<ReturnType<typeof sitemap>>, suffix: string) =>
  entries.find((entry) => entry.url.endsWith(suffix));

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_URL", "https://acme.test");
  });

  it("uses each post's updatedAt and each doc's last edited time", async () => {
    mockFetchDocumentation.mockResolvedValue(docs);
    mockGetCachedBlogIndex.mockResolvedValue(blog);

    const entries = await sitemap();

    expect(find(entries, "/landing/blog/hello-world")?.lastModified).toEqual(new Date("2026-09-09T00:00:00.000Z"));
    expect(find(entries, "/landing/doc/overview")?.lastModified).toEqual(new Date("2026-03-04T00:00:00.000Z"));
    expect(find(entries, "/landing/blog")).toBeDefined();
  });

  it("still returns static routes when the blog fetch throws", async () => {
    mockFetchDocumentation.mockResolvedValue(docs);
    mockGetCachedBlogIndex.mockRejectedValue(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const entries = await sitemap();

    expect(find(entries, "/landing")).toBeDefined();
    expect(find(entries, "/landing/doc/overview")).toBeDefined();
    expect(entries.some((entry) => entry.url.includes("/landing/blog/"))).toBe(false);
  });
});

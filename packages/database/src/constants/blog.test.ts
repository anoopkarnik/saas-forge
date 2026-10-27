import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { blogPostData } from "./blog";
import { sampleBlogPosts } from "./blog-samples";

const blogDir = path.join(__dirname, "../blog");

describe("blog registry", () => {
  it("every registry entry has a readable MDX file", () => {
    for (const post of blogPostData) {
      expect(fs.existsSync(path.join(blogDir, post.filePath)), post.filePath).toBe(true);
    }
  });

  it("slugs are unique and URL-safe", () => {
    const slugs = blogPostData.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("sample posts never point into saas-forge/", () => {
    expect(sampleBlogPosts.every((post) => !post.filePath.startsWith("saas-forge/"))).toBe(true);
  });

  it("dates parse", () => {
    for (const post of blogPostData) {
      expect(Number.isNaN(Date.parse(post.publishedAt))).toBe(false);
      expect(Number.isNaN(Date.parse(post.updatedAt))).toBe(false);
    }
  });
});

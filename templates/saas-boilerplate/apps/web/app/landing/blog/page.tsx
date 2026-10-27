import type { Metadata } from "next";
import type { ReactElement } from "react";
import BlogIndexPage from "@/blocks/landing/BlogIndexPage";
import JsonLd from "@/components/seo/JsonLd";
import { getCachedBlogIndex } from "@/lib/blog/cache";
import { blogIndexJsonLd } from "@/lib/blog/jsonld";
import { BLOG_RSS_PATH, getJsonLdSite } from "@/lib/blog/seo";
import { getCanonicalUrl } from "@/lib/seo";
import { siteMetadata } from "@/lib/site-config/metadata";

interface Props {
  searchParams: Promise<{ tag?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const base = await siteMetadata({
    title: "Blog",
    description: "Product updates, guides and lessons learned.",
    pathname: "/landing/blog",
  });
  return {
    ...base,
    alternates: { ...base.alternates, types: { "application/rss+xml": getCanonicalUrl(BLOG_RSS_PATH) } },
  };
}

const BlogPage = async ({ searchParams }: Props): Promise<ReactElement> => {
  const { tag } = await searchParams;
  const index = await getCachedBlogIndex();
  const site = await getJsonLdSite(index.logo);

  return (
    <>
      <JsonLd data={blogIndexJsonLd(index.posts, site)} />
      <BlogIndexPage posts={index.posts} tag={tag} />
    </>
  );
};

export default BlogPage;

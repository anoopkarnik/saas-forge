import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import BlogPostPage from "@/blocks/landing/BlogPostPage";
import JsonLd from "@/components/seo/JsonLd";
import { getCachedBlogIndex } from "@/lib/blog/cache";
import { blogPostingJsonLd, blogPostUrl, breadcrumbJsonLd } from "@/lib/blog/jsonld";
import { blogPostMetadata, getJsonLdSite } from "@/lib/blog/seo";
import { fetchBlogPost } from "@/lib/functions/fetchBlog";
import { siteMetadata } from "@/lib/site-config/metadata";
import type { BlogPostSummary } from "@/lib/ts-types/blog";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (post) return blogPostMetadata(post);

  return siteMetadata({ title: "Blog", pathname: `/landing/blog/${slug}` });
}

// Posts sharing a tag first, then the newest others.
const pickRelated = (slug: string, tags: string[], posts: BlogPostSummary[]) => {
  const others = posts.filter((post) => post.slug !== slug);
  const sharing = others.filter((post) => post.tags.some((tag) => tags.includes(tag)));
  return [...sharing, ...others.filter((post) => !sharing.includes(post))].slice(0, 2);
};

const BlogPostRoute = async ({ params }: Props): Promise<ReactElement> => {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) notFound();

  const index = await getCachedBlogIndex();
  const site = await getJsonLdSite(index.logo);

  return (
    <>
      <JsonLd data={blogPostingJsonLd(post, site)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: `${site.siteUrl}/landing` },
          { name: "Blog", url: `${site.siteUrl}/landing/blog` },
          { name: post.title, url: blogPostUrl(site.siteUrl, post.slug) },
        ])}
      />
      <BlogPostPage post={post} related={pickRelated(post.slug, post.tags, index.posts)} />
    </>
  );
};

export default BlogPostRoute;

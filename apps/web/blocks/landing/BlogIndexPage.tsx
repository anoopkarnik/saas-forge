import Link from "next/link";
import type { ReactElement } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Rss } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { formatDate } from "@workspace/i18n/format";
import type { Locale } from "@workspace/i18n/config";
import type { BlogPostSummary } from "@/lib/ts-types/blog";
import { BLOG_RSS_PATH } from "@/lib/blog/seo";

interface Props {
  posts: BlogPostSummary[];
  tag?: string;
}

const BlogIndexPage = async ({ posts, tag }: Props): Promise<ReactElement> => {
  const t = await getTranslations("landing.blog");
  const locale = (await getLocale()) as Locale;
  const visible = tag ? posts.filter((post) => post.tags.includes(tag)) : posts;
  const tags = [...new Set(posts.flatMap((post) => post.tags))].sort();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
      <header className="mb-10 border-b border-border/40 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          {tag ? t("taggedWith", { tag }) : t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("description")}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Link href="/landing/blog">
            <Badge variant={tag ? "outline" : "default"}>{t("allPosts")}</Badge>
          </Link>
          {tags.map((item) => (
            <Link key={item} href={`/landing/blog?tag=${encodeURIComponent(item)}`}>
              <Badge variant={item === tag ? "default" : "outline"}>{item}</Badge>
            </Link>
          ))}
          <a href={BLOG_RSS_PATH} className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <Rss size={14} />
            {t("rss")}
          </a>
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {visible.map((post) => (
            <li key={post.slug} className="group rounded-2xl border bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md">
              <Link href={`/landing/blog/${post.slug}`} className="flex h-full flex-col">
                {post.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element -- covers are arbitrary CMS URLs
                  <img src={post.coverImage} alt="" className="aspect-[1200/630] w-full object-cover" loading="lazy" />
                )}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h2 className="text-xl font-semibold tracking-tight group-hover:text-primary">{post.title}</h2>
                  <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{post.authorName}</span>
                    <span>·</span>
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                    <span>·</span>
                    <span>{t("minRead", { minutes: post.readingMinutes })}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default BlogIndexPage;

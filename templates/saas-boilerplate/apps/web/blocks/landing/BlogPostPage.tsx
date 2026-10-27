import Link from "next/link";
import type { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getLocale, getTranslations } from "next-intl/server";
import { BookIcon } from "lucide-react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { formatDate } from "@workspace/i18n/format";
import type { Locale } from "@workspace/i18n/config";
import type { BlogPost, BlogPostSummary } from "@/lib/ts-types/blog";

interface Props {
  post: BlogPost;
  related: BlogPostSummary[];
}

const BlogPostPage = async ({ post, related }: Props): Promise<ReactElement> => {
  const t = await getTranslations("landing.blog");
  const locale = (await getLocale()) as Locale;
  const wasUpdated = post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10);

  return (
    <article className="w-full max-w-3xl mx-auto px-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/landing" className="hover:text-foreground">{t("home")}</Link>
        <span>/</span>
        <Link href="/landing/blog" className="hover:text-foreground">{t("breadcrumb")}</Link>
      </nav>

      <header className="mb-10 border-b border-border/40 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">{post.title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {post.authorAvatar && (
            // eslint-disable-next-line @next/next/no-img-element -- avatars are arbitrary CMS URLs
            <img src={post.authorAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <span className="text-foreground font-medium">{t("by", { author: post.authorName })}</span>
          <span>·</span>
          <span>
            {t("published")} <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
          </span>
          {wasUpdated && (
            <>
              <span>·</span>
              <span>
                {t("updated")} <time dateTime={post.updatedAt}>{formatDate(post.updatedAt, locale)}</time>
              </span>
            </>
          )}
          <span>·</span>
          <span>{t("minRead", { minutes: post.readingMinutes })}</span>
        </div>
      </header>

      {post.coverImage && (
        // eslint-disable-next-line @next/next/no-img-element -- covers are arbitrary CMS URLs
        <img src={post.coverImage} alt="" className="mb-10 w-full rounded-2xl object-cover shadow-lg" />
      )}

      {post.summary && (
        <aside className="mb-10 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{t("tldr")}</p>
          <p className="text-lg leading-relaxed">{post.summary}</p>
        </aside>
      )}

      <div className="prose prose-zinc dark:prose-invert max-w-none prose-pre:overflow-x-auto prose-table:block prose-table:overflow-x-auto [overflow-wrap:anywhere] prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      <footer className="mt-12 flex flex-col gap-8 border-t border-border/40 pt-8">
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/landing/blog?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="outline">{tag}</Badge>
              </Link>
            ))}
          </div>
        )}
        <Link href="/landing/doc" className="flex items-center gap-2 text-primary hover:underline">
          <BookIcon size={16} />
          {t("readDocs")}
        </Link>
        {related.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.slug} className="rounded-xl border p-4 hover:bg-muted/50">
                <Link href={`/landing/blog/${item.slug}`} className="flex flex-col gap-1">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-sm text-muted-foreground line-clamp-2">{item.excerpt}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </footer>
    </article>
  );
};

export default BlogPostPage;

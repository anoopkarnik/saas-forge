import { useSuspenseQuery } from '@tanstack/react-query'
import { ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTRPC } from '../../lib/trpc'

interface Props {
  slug: string;
}

const BlogPostPage = ({ slug }: Props): ReactElement => {
  const trpc = useTRPC() as any;
  const { data } = useSuspenseQuery(trpc.blog.getBlogPostBySlug.queryOptions({ slug }))
  const post = data as any;

  return (
    <article className="container max-w-3xl mx-auto px-6 py-12">
      <header className="mb-10 border-b border-border/40 pb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{post.title}</h1>
        <p className="text-sm text-muted-foreground">
          By {post.authorName} · {new Date(post.publishedAt).toLocaleDateString()} · {post.readingMinutes} min read
        </p>
      </header>

      {post.summary ? (
        <aside className="mb-10 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">TL;DR</p>
          <p className="text-lg leading-relaxed">{post.summary}</p>
        </aside>
      ) : null}

      <div className="prose prose-zinc dark:prose-invert prose-lg max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-lg">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content as string}</ReactMarkdown>
      </div>
    </article>
  )
};

export default BlogPostPage;

import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ReactElement } from 'react'
import { useTRPC } from '../../lib/trpc'

const BlogIndex = (): ReactElement => {
  const trpc = useTRPC() as any;
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(trpc.blog.getBlogIndex.queryOptions())
  const posts = (data as any).posts as any[];

  return (
    <div className="container max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold tracking-tight mb-2">Blog</h1>
      <p className="text-muted-foreground mb-10">Product updates, guides and lessons learned.</p>
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <button
              key={post.slug}
              type="button"
              onClick={() => navigate(`/blog/${post.slug}`)}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-6 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <h2 className="text-xl font-semibold tracking-tight">{post.title}</h2>
              <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
              <p className="text-sm text-muted-foreground">
                {post.authorName} · {new Date(post.publishedAt).toLocaleDateString()} · {post.readingMinutes} min read
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
};

export default BlogIndex;

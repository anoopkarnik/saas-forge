import { fetchBlogPost } from "@/lib/functions/fetchBlog";
import { clearBlogCache, getCachedBlogIndex } from "@/lib/blog/cache";
import { AdminBlogPost, BlogPostStatus } from "@/lib/ts-types/blog";
import { createTRPCRouter, baseProcedure, adminProcedure, guestReadableAdminProcedure } from "@/trpc/init";
import { getCmsProvider } from "@/lib/cms-provider";
import prisma from "@workspace/database/client";
// scaffold:begin audit_log
import { audit, userActor } from "@/lib/audit/audit";
// scaffold:end audit_log
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const optionalUrl = z.union([z.string().trim().url(), z.literal("")]).optional();

export const blogPostEditorSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
  excerpt: z.string().trim().min(1, "Excerpt is required").max(300),
  summary: z.string().trim().max(600).optional(),
  content: z.string().min(1, "Content is required"),
  coverImage: optionalUrl,
  authorName: z.string().trim().min(1, "Author is required"),
  authorAvatar: optionalUrl,
  tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string().datetime().nullable().optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
  canonicalUrl: optionalUrl,
});

type BlogPostEditorInput = z.infer<typeof blogPostEditorSchema>;
type BlogPostRow = NonNullable<Awaited<ReturnType<typeof prisma.blogPost.findUnique>>>;

const ensurePostgresBlogEditing = () => {
  if (getCmsProvider() !== "postgres") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Blog editing is only available for postgres CMS right now.",
    });
  }
};

const getLandingPageOrThrow = async () => {
  const saasName = process.env.NEXT_PUBLIC_SAAS_NAME || "";
  const landingPage = await prisma.landingPage.findUnique({
    where: { title: saasName },
  });

  if (!landingPage) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Landing Page config not found in Postgres for name: ${saasName}`,
    });
  }

  return landingPage;
};

const toAdminPost = (row: BlogPostRow): AdminBlogPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt,
  summary: row.summary,
  content: row.content,
  coverImage: row.coverImage,
  authorName: row.authorName,
  authorAvatar: row.authorAvatar,
  tags: row.tags,
  status: row.status as BlogPostStatus,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  updatedAt: row.updatedAt.toISOString(),
  seoTitle: row.seoTitle,
  seoDescription: row.seoDescription,
  canonicalUrl: row.canonicalUrl,
});

/**
 * A given date wins, then the existing one; publishing without either stamps now.
 * Editors only pick a day, so the same day as before keeps the original time.
 */
const resolvePublishedAt = (input: BlogPostEditorInput, existing: Date | null): Date | null => {
  if (input.publishedAt) {
    const given = new Date(input.publishedAt);
    const sameDay = existing?.toISOString().slice(0, 10) === given.toISOString().slice(0, 10);
    return sameDay ? existing : given;
  }
  if (existing) return existing;
  return input.status === "published" ? new Date() : null;
};

const toRowData = (input: BlogPostEditorInput, existingPublishedAt: Date | null) => ({
  title: input.title,
  slug: input.slug,
  excerpt: input.excerpt,
  summary: input.summary || null,
  content: input.content,
  coverImage: input.coverImage || null,
  authorName: input.authorName,
  authorAvatar: input.authorAvatar || null,
  tags: input.tags,
  status: input.status,
  publishedAt: resolvePublishedAt(input, existingPublishedAt),
  seoTitle: input.seoTitle || null,
  seoDescription: input.seoDescription || null,
  canonicalUrl: input.canonicalUrl || null,
});

// Demo guests may browse the admin read-only, but drafts are not public.
const visibleTo = (role: string | null | undefined) => (role === "admin" ? {} : { status: "published" });

const slugConflict = (slug: string) =>
  new TRPCError({
    code: "CONFLICT",
    message: `A blog post with slug "${slug}" already exists.`,
  });

export const blogRouter = createTRPCRouter({
  getBlogIndex: baseProcedure.query(async () => getCachedBlogIndex()),
  getBlogPostBySlug: baseProcedure
    .input(z.object({ slug: z.string().min(1, "Slug is required") }))
    .query(async ({ input }) => {
      const post = await fetchBlogPost(input.slug);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Blog post not found" });
      }
      return post;
    }),
  listAdminPosts: guestReadableAdminProcedure.query(async ({ ctx }) => {
    ensurePostgresBlogEditing();

    const landingPage = await getLandingPageOrThrow();
    const posts = await prisma.blogPost.findMany({
      where: { landingPageId: landingPage.id, ...visibleTo(ctx.session.user.role) },
      orderBy: [{ updatedAt: "desc" }],
    });

    return posts.map(toAdminPost);
  }),
  getAdminPostById: guestReadableAdminProcedure
    .input(z.object({ id: z.string().min(1, "Post id is required") }))
    .query(async ({ ctx, input }) => {
      ensurePostgresBlogEditing();

      const landingPage = await getLandingPageOrThrow();
      const post = await prisma.blogPost.findFirst({
        where: { id: input.id, landingPageId: landingPage.id, ...visibleTo(ctx.session.user.role) },
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Blog post not found" });
      }

      return toAdminPost(post);
    }),
  createPost: adminProcedure
    .input(blogPostEditorSchema)
    .mutation(async ({ ctx, input }) => {
      ensurePostgresBlogEditing();

      const landingPage = await getLandingPageOrThrow();
      if (await prisma.blogPost.findUnique({ where: { slug: input.slug } })) {
        throw slugConflict(input.slug);
      }

      const post = await prisma.blogPost.create({
        data: { landingPageId: landingPage.id, ...toRowData(input, null) },
      });

      await clearBlogCache();
      // scaffold:begin audit_log
      await audit(prisma, "blog.created", {
        actor: userActor(ctx.session.user.id),
        targetId: post.id,
        metadata: { title: post.title },
        headers: ctx.headers,
      });
      // scaffold:end audit_log

      return toAdminPost(post);
    }),
  updatePost: adminProcedure
    .input(blogPostEditorSchema.extend({ id: z.string().min(1, "Post id is required") }))
    .mutation(async ({ ctx, input }) => {
      ensurePostgresBlogEditing();

      const landingPage = await getLandingPageOrThrow();
      const existing = await prisma.blogPost.findFirst({
        where: { id: input.id, landingPageId: landingPage.id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Blog post not found" });
      }

      const conflicting = await prisma.blogPost.findUnique({ where: { slug: input.slug } });
      if (conflicting && conflicting.id !== input.id) {
        throw slugConflict(input.slug);
      }

      const post = await prisma.blogPost.update({
        where: { id: input.id },
        data: toRowData(input, existing.publishedAt),
      });

      await clearBlogCache();
      // scaffold:begin audit_log
      await audit(prisma, "blog.updated", {
        actor: userActor(ctx.session.user.id),
        targetId: post.id,
        metadata: { title: post.title },
        headers: ctx.headers,
      });
      // scaffold:end audit_log

      return toAdminPost(post);
    }),
  deletePost: adminProcedure
    .input(z.object({ id: z.string().min(1, "Post id is required") }))
    .mutation(async ({ ctx, input }) => {
      ensurePostgresBlogEditing();

      const landingPage = await getLandingPageOrThrow();
      const deleted = await prisma.blogPost.deleteMany({
        where: { id: input.id, landingPageId: landingPage.id },
      });

      if (deleted.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Blog post not found" });
      }

      await clearBlogCache();
      // scaffold:begin audit_log
      await audit(prisma, "blog.deleted", { actor: userActor(ctx.session.user.id), targetId: input.id, metadata: {}, headers: ctx.headers });
      // scaffold:end audit_log

      return { success: true };
    }),
});

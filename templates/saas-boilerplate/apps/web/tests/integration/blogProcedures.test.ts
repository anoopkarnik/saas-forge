import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { blogRouter } from "../../trpc/routers/blogProcedures.js";

const mockFetchBlogIndex = vi.fn();
const mockFetchBlogPost = vi.fn();
vi.mock("@/lib/functions/fetchBlog", () => ({
  fetchBlogIndex: (...args: any[]) => mockFetchBlogIndex(...args),
  fetchBlogPost: (...args: any[]) => mockFetchBlogPost(...args),
}));

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
vi.mock("@/server/redis", () => ({
  redis: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
  },
}));

const mockLandingPageFindUnique = vi.fn();
const mockBlogFindMany = vi.fn();
const mockBlogFindFirst = vi.fn();
const mockBlogFindUnique = vi.fn();
const mockBlogCreate = vi.fn();
const mockBlogUpdate = vi.fn();
const mockBlogDeleteMany = vi.fn();

vi.mock("@workspace/database/client", () => ({
  default: {
    landingPage: {
      findUnique: (...args: any[]) => mockLandingPageFindUnique(...args),
    },
    blogPost: {
      findMany: (...args: any[]) => mockBlogFindMany(...args),
      findFirst: (...args: any[]) => mockBlogFindFirst(...args),
      findUnique: (...args: any[]) => mockBlogFindUnique(...args),
      create: (...args: any[]) => mockBlogCreate(...args),
      update: (...args: any[]) => mockBlogUpdate(...args),
      deleteMany: (...args: any[]) => mockBlogDeleteMany(...args),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// scaffold:begin audit_log
vi.mock("@/lib/audit/audit", () => ({ audit: vi.fn(async () => undefined), userActor: (userId: string) => ({ type: "user", userId }) }));
// scaffold:end audit_log
vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const createCallerContext = (session: any = null) => ({
  session,
  headers: new Headers(),
});

const adminSession = { user: { id: "admin_1", role: "admin" } };
const userSession = { user: { id: "user_1", role: "user" } };
const guestSession = { user: { id: "guest_1", role: "guest" } };

const BLOG_KEY = "acme-blog:v1";

const mockIndex = { title: "Acme", logo: "/logo.png", darkLogo: "/dark.png", posts: [] };
const mockLandingPage = { id: "landing_1", title: "Acme" };

const mockRow = {
  id: "post_1",
  slug: "hello-world",
  title: "Hello world",
  excerpt: "An excerpt",
  summary: null,
  content: "# Hello",
  coverImage: null,
  authorName: "Ann",
  authorAvatar: null,
  tags: ["news"],
  status: "published",
  publishedAt: new Date("2026-10-01T00:00:00.000Z"),
  updatedAt: new Date("2026-10-02T00:00:00.000Z"),
  seoTitle: null,
  seoDescription: null,
  canonicalUrl: null,
};

const validInput = {
  title: "Hello world",
  slug: "hello-world",
  excerpt: "An excerpt",
  content: "# Hello",
  authorName: "Ann",
  tags: ["news"],
  status: "published" as const,
};

describe("Blog Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "Acme");
    vi.stubEnv("NEXT_PUBLIC_CMS", "postgres");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test.com");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test_token");
    mockLandingPageFindUnique.mockResolvedValue(mockLandingPage);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getBlogIndex", () => {
    it("returns cached index when Redis has it", async () => {
      mockRedisGet.mockResolvedValue(mockIndex);

      const result = await blogRouter.createCaller(createCallerContext()).getBlogIndex();

      expect(result).toEqual(mockIndex);
      expect(mockRedisGet).toHaveBeenCalledWith(BLOG_KEY);
      expect(mockFetchBlogIndex).not.toHaveBeenCalled();
    });

    it("fetches and caches when cold", async () => {
      mockRedisGet.mockResolvedValue(null);
      mockFetchBlogIndex.mockResolvedValue(mockIndex);

      const result = await blogRouter.createCaller(createCallerContext()).getBlogIndex();

      expect(result).toEqual(mockIndex);
      expect(mockRedisSet).toHaveBeenCalledWith(BLOG_KEY, mockIndex, { ex: 3600 });
    });
  });

  describe("getBlogPostBySlug", () => {
    it("throws NOT_FOUND for a draft", async () => {
      mockFetchBlogPost.mockResolvedValue(null);

      await expect(
        blogRouter.createCaller(createCallerContext()).getBlogPostBySlug({ slug: "secret-draft" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("admin procedures", () => {
    it("listAdminPosts rejects non-admins", async () => {
      await expect(
        blogRouter.createCaller(createCallerContext(userSession)).listAdminPosts(),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("listAdminPosts includes drafts", async () => {
      mockBlogFindMany.mockResolvedValue([mockRow, { ...mockRow, id: "post_2", slug: "draft", status: "draft", publishedAt: null }]);

      const result = await blogRouter.createCaller(createCallerContext(adminSession)).listAdminPosts();

      expect(result.map((post) => post.status)).toEqual(["published", "draft"]);
      expect(result[1]!.publishedAt).toBeNull();
      expect(mockBlogFindMany.mock.calls[0]![0].where).toEqual({ landingPageId: "landing_1" });
    });

    it("createPost rejects malformed slugs", async () => {
      const caller = blogRouter.createCaller(createCallerContext(adminSession));
      for (const slug of ["My Post", "a/b", "Caps"]) {
        await expect(caller.createPost({ ...validInput, slug })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      }
      expect(mockBlogCreate).not.toHaveBeenCalled();
    });

    it("createPost rejects duplicate slug", async () => {
      mockBlogFindUnique.mockResolvedValue(mockRow);

      await expect(
        blogRouter.createCaller(createCallerContext(adminSession)).createPost(validInput),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });

    it("sets publishedAt on first publish", async () => {
      mockBlogFindUnique.mockResolvedValue(null);
      mockBlogCreate.mockResolvedValue(mockRow);

      await blogRouter.createCaller(createCallerContext(adminSession)).createPost(validInput);

      const data = mockBlogCreate.mock.calls[0]![0].data;
      expect(data.publishedAt).toBeInstanceOf(Date);
      expect(Math.abs(data.publishedAt.getTime() - Date.now())).toBeLessThan(5000);
      expect(data.coverImage).toBeNull();
    });

    it("leaves publishedAt empty for a new draft", async () => {
      mockBlogFindUnique.mockResolvedValue(null);
      mockBlogCreate.mockResolvedValue({ ...mockRow, status: "draft", publishedAt: null });

      await blogRouter.createCaller(createCallerContext(adminSession)).createPost({ ...validInput, status: "draft" });

      expect(mockBlogCreate.mock.calls[0]![0].data.publishedAt).toBeNull();
    });

    it("keeps publishedAt on later updates", async () => {
      mockBlogFindFirst.mockResolvedValue(mockRow);
      mockBlogFindUnique.mockResolvedValue(mockRow);
      mockBlogUpdate.mockResolvedValue(mockRow);

      await blogRouter.createCaller(createCallerContext(adminSession)).updatePost({ id: "post_1", ...validInput, title: "Edited" });

      const data = mockBlogUpdate.mock.calls[0]![0].data;
      expect(data.publishedAt).toEqual(mockRow.publishedAt);
    });

    it("keeps the publish time when the admin re-sends the same publish date", async () => {
      const publishedAt = new Date("2026-10-01T14:37:00.000Z");
      mockBlogFindFirst.mockResolvedValue({ ...mockRow, publishedAt });
      mockBlogFindUnique.mockResolvedValue(mockRow);
      mockBlogUpdate.mockResolvedValue(mockRow);

      // The admin date field only holds the day, so a plain save sends midnight UTC of that day.
      await blogRouter.createCaller(createCallerContext(adminSession)).updatePost({
        id: "post_1",
        ...validInput,
        publishedAt: "2026-10-01T00:00:00.000Z",
      });

      expect(mockBlogUpdate.mock.calls[0]![0].data.publishedAt).toEqual(publishedAt);
    });

    it("moves the publish date when the admin picks a different day", async () => {
      mockBlogFindFirst.mockResolvedValue({ ...mockRow, publishedAt: new Date("2026-10-01T14:37:00.000Z") });
      mockBlogFindUnique.mockResolvedValue(mockRow);
      mockBlogUpdate.mockResolvedValue(mockRow);

      await blogRouter.createCaller(createCallerContext(adminSession)).updatePost({
        id: "post_1",
        ...validInput,
        publishedAt: "2026-09-15T00:00:00.000Z",
      });

      expect(mockBlogUpdate.mock.calls[0]![0].data.publishedAt).toEqual(new Date("2026-09-15T00:00:00.000Z"));
    });

    it("guests only see published posts in the admin list", async () => {
      mockBlogFindMany.mockResolvedValue([mockRow]);

      await blogRouter.createCaller(createCallerContext(guestSession)).listAdminPosts();

      expect(mockBlogFindMany.mock.calls[0]![0].where).toEqual({ landingPageId: "landing_1", status: "published" });
    });

    it("guests cannot open a draft by id", async () => {
      mockBlogFindFirst.mockResolvedValue(null);

      await expect(
        blogRouter.createCaller(createCallerContext(guestSession)).getAdminPostById({ id: "post_2" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(mockBlogFindFirst.mock.calls[0]![0].where).toEqual({ id: "post_2", landingPageId: "landing_1", status: "published" });
    });

    it("updatePost clears the blog cache", async () => {
      mockBlogFindFirst.mockResolvedValue(mockRow);
      mockBlogFindUnique.mockResolvedValue(mockRow);
      mockBlogUpdate.mockResolvedValue({ ...mockRow, status: "draft" });

      await blogRouter.createCaller(createCallerContext(adminSession)).updatePost({ id: "post_1", ...validInput, status: "draft" });

      expect(mockRedisDel).toHaveBeenCalledWith(BLOG_KEY);
    });

    it("createPost and deletePost clear the blog cache", async () => {
      const caller = blogRouter.createCaller(createCallerContext(adminSession));
      mockBlogFindUnique.mockResolvedValue(null);
      mockBlogCreate.mockResolvedValue(mockRow);
      await caller.createPost(validInput);
      mockBlogDeleteMany.mockResolvedValue({ count: 1 });
      await caller.deletePost({ id: "post_1" });

      expect(mockRedisDel).toHaveBeenCalledTimes(2);
      expect(mockRedisDel).toHaveBeenCalledWith(BLOG_KEY);
    });

    it("deletePost returns NOT_FOUND when nothing was deleted", async () => {
      mockBlogDeleteMany.mockResolvedValue({ count: 0 });

      await expect(
        blogRouter.createCaller(createCallerContext(adminSession)).deletePost({ id: "missing" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("editing fails under constant CMS", async () => {
      vi.stubEnv("NEXT_PUBLIC_CMS", "constant");

      await expect(
        blogRouter.createCaller(createCallerContext(adminSession)).createPost(validInput),
      ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    });
  });
});

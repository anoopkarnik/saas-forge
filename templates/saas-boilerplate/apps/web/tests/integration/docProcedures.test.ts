import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { documentationRouter } from "../../trpc/routers/docProcedures.js";

const mockFetchDocumentation = vi.fn();
vi.mock("@/lib/functions/fetchDocumentationFromNotion", () => ({
  fetchDocumentation: (...args: any[]) => mockFetchDocumentation(...args),
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

const mockRetrieveBlocksTree = vi.fn();
vi.mock("@workspace/cms/notion/block/retrieveBlockChildren", () => ({
  retrieveBlocksTree: (...args: any[]) => mockRetrieveBlocksTree(...args),
}));

const mockLandingPageFindUnique = vi.fn();
const mockDocumentationFindMany = vi.fn();
const mockDocumentationFindFirst = vi.fn();
const mockDocumentationFindUnique = vi.fn();
const mockDocumentationCreate = vi.fn();
const mockDocumentationUpdate = vi.fn();
const mockDocumentationDeleteMany = vi.fn();

vi.mock("@workspace/database/client", () => ({
  default: {
    landingPage: {
      findUnique: (...args: any[]) => mockLandingPageFindUnique(...args),
    },
    documentation: {
      findMany: (...args: any[]) => mockDocumentationFindMany(...args),
      findFirst: (...args: any[]) => mockDocumentationFindFirst(...args),
      findUnique: (...args: any[]) => mockDocumentationFindUnique(...args),
      create: (...args: any[]) => mockDocumentationCreate(...args),
      update: (...args: any[]) => mockDocumentationUpdate(...args),
      deleteMany: (...args: any[]) => mockDocumentationDeleteMany(...args),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

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

const adminSession = {
  user: {
    id: "admin_1",
    role: "admin",
  },
};

const userSession = {
  user: {
    id: "user_1",
    role: "user",
  },
};

const mockDocumentation = {
  title: "Test Docs",
  logo: "/logo.png",
  darkLogo: "/dark-logo.png",
  docs: [
    { id: "doc_1", Name: "Getting Started", slug: "getting-started", order: 1 },
    { id: "doc_2", Name: "API Reference", slug: "api-reference", order: 2 },
  ],
};

const mockBlocks = [
  { id: "block_1", type: "paragraph", paragraph: { text: "Hello world" } },
  { id: "block_2", type: "heading_1", heading_1: { text: "Introduction" } },
];

const mockLandingPage = {
  id: "landing_1",
  title: "Acme Docs",
};

const mockDocRow = {
  id: "doc_1",
  title: "Getting Started",
  slug: "getting-started",
  type: "Guide",
  order: 1,
  content: "# Hello world",
  lastUpdated: new Date("2026-04-08T10:00:00.000Z"),
};

describe("Documentation Router Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOTION_API_TOKEN", "test_notion_token");
    vi.stubEnv("NEXT_PUBLIC_SAAS_NAME", "Acme Docs");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("getDocumentationInfoFromNotion", () => {
    it("should fetch data directly when Redis is not configured", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchDocumentation.mockResolvedValue(mockDocumentation);

      const caller = documentationRouter.createCaller(createCallerContext());
      const result = await caller.getDocumentationInfoFromNotion();

      expect(result).toEqual(mockDocumentation);
      expect(mockFetchDocumentation).toHaveBeenCalledTimes(1);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it("should return cached data when Redis cache hit", async () => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test.com");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test_token");

      mockRedisGet.mockResolvedValue(mockDocumentation);

      const caller = documentationRouter.createCaller(createCallerContext());
      const result = await caller.getDocumentationInfoFromNotion();

      expect(result).toEqual(mockDocumentation);
      expect(mockRedisGet).toHaveBeenCalledWith("acme docs-documentation:v1");
      expect(mockFetchDocumentation).not.toHaveBeenCalled();
    });

    it("should fetch and cache when Redis cache misses", async () => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test.com");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test_token");

      mockRedisGet.mockResolvedValue(null);
      mockFetchDocumentation.mockResolvedValue(mockDocumentation);
      mockRedisSet.mockResolvedValue("OK");

      const caller = documentationRouter.createCaller(createCallerContext());
      const result = await caller.getDocumentationInfoFromNotion();

      expect(result).toEqual(mockDocumentation);
      expect(mockRedisSet).toHaveBeenCalledWith(
        "acme docs-documentation:v1",
        mockDocumentation,
        { ex: 3600 },
      );
    });
  });

  describe("queryDocumentationBySlug", () => {
    it("should return blocks for a valid slug", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchDocumentation.mockResolvedValue(mockDocumentation);
      mockRetrieveBlocksTree.mockResolvedValue(mockBlocks);

      const caller = documentationRouter.createCaller(createCallerContext());
      const result = await caller.queryDocumentationBySlug({ slug: "getting-started" });

      expect(result).toEqual(mockBlocks);
      expect(mockRetrieveBlocksTree).toHaveBeenCalledWith({
        apiToken: "test_notion_token",
        block_id: "doc_1",
      });
    });

    it("should use cached documentation for slug resolution", async () => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test.com");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test_token");

      mockRedisGet.mockResolvedValue(mockDocumentation);
      mockRetrieveBlocksTree.mockResolvedValue(mockBlocks);

      const caller = documentationRouter.createCaller(createCallerContext());
      const result = await caller.queryDocumentationBySlug({ slug: "api-reference" });

      expect(result).toEqual(mockBlocks);
      expect(mockFetchDocumentation).not.toHaveBeenCalled();
      expect(mockRetrieveBlocksTree).toHaveBeenCalledWith({
        apiToken: "test_notion_token",
        block_id: "doc_2",
      });
    });

    it("should throw when slug is not found", async () => {
      mockFetchDocumentation.mockResolvedValue(mockDocumentation);

      const caller = documentationRouter.createCaller(createCallerContext());

      await expect(caller.queryDocumentationBySlug({ slug: "missing" })).rejects.toThrow(
        "Documentation not found",
      );
    });
  });

  describe("admin documentation procedures", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_CMS", "postgres");
      mockLandingPageFindUnique.mockResolvedValue(mockLandingPage);
    });

    it("lists documentation for the current landing page", async () => {
      mockDocumentationFindMany.mockResolvedValue([mockDocRow]);

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));
      const result = await caller.listAdminDocs();

      expect(mockDocumentationFindMany).toHaveBeenCalledWith({
        where: { landingPageId: "landing_1" },
        orderBy: [{ order: "asc" }, { title: "asc" }],
      });
      expect(result).toEqual([
        {
          id: "doc_1",
          title: "Getting Started",
          slug: "getting-started",
          type: "Guide",
          order: 1,
          content: "# Hello world",
          lastUpdated: "2026-04-08T10:00:00.000Z",
        },
      ]);
    });

    it("creates a documentation page and clears the cache", async () => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test.com");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test_token");
      mockDocumentationFindUnique.mockResolvedValue(null);
      mockDocumentationCreate.mockResolvedValue(mockDocRow);

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));
      const result = await caller.createDoc({
        title: "Getting Started",
        slug: "getting-started",
        type: "Guide",
        order: 1,
        content: "# Hello world",
      });

      expect(mockDocumentationCreate).toHaveBeenCalled();
      expect(mockRedisDel).toHaveBeenCalledWith("acme docs-documentation:v1");
      expect(result.title).toBe("Getting Started");
    });

    it("updates a documentation page", async () => {
      mockDocumentationFindFirst.mockResolvedValue(mockDocRow);
      mockDocumentationFindUnique.mockResolvedValue({ ...mockDocRow, id: "doc_1" });
      mockDocumentationUpdate.mockResolvedValue({
        ...mockDocRow,
        title: "Updated Doc",
        content: "Updated content",
      });

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));
      const result = await caller.updateDoc({
        id: "doc_1",
        title: "Updated Doc",
        slug: "getting-started",
        type: "Guide",
        order: 3,
        content: "Updated content",
      });

      expect(mockDocumentationUpdate).toHaveBeenCalledWith({
        where: { id: "doc_1" },
        data: expect.objectContaining({
          title: "Updated Doc",
          slug: "getting-started",
          type: "Guide",
          order: 3,
          content: "Updated content",
          lastUpdated: expect.any(Date),
        }),
      });
      expect(result.title).toBe("Updated Doc");
    });

    it("deletes a documentation page", async () => {
      mockDocumentationDeleteMany.mockResolvedValue({ count: 1 });

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));
      const result = await caller.deleteDoc({ id: "doc_1" });

      expect(mockDocumentationDeleteMany).toHaveBeenCalledWith({
        where: {
          id: "doc_1",
          landingPageId: "landing_1",
        },
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects non-admin users", async () => {
      const caller = documentationRouter.createCaller(createCallerContext(userSession));

      await expect(caller.listAdminDocs()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("rejects duplicate slugs on create", async () => {
      mockDocumentationFindUnique.mockResolvedValue(mockDocRow);

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));

      await expect(
        caller.createDoc({
          title: "Getting Started",
          slug: "getting-started",
          type: "Guide",
          order: 1,
          content: "# Hello world",
        }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
      });
    });

    it("rejects unsupported cms providers", async () => {
      vi.stubEnv("NEXT_PUBLIC_CMS", "notion");

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));

      await expect(caller.listAdminDocs()).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
      });
    });

    it("returns the selected document by id", async () => {
      mockDocumentationFindFirst.mockResolvedValue(mockDocRow);

      const caller = documentationRouter.createCaller(createCallerContext(adminSession));
      const result = await caller.getAdminDocById({ id: "doc_1" });

      expect(result.id).toBe("doc_1");
      expect(result.content).toBe("# Hello world");
    });
  });
});

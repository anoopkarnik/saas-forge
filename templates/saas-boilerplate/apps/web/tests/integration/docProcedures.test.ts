import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { documentationRouter } from '../../trpc/routers/docProcedures.js';

// Mock fetchDocumentation
const mockFetchDocumentation = vi.fn();
vi.mock('@/lib/functions/fetchDocumentationFromNotion', () => ({
  fetchDocumentation: (...args: any[]) => mockFetchDocumentation(...args),
}));

// Mock Redis
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
vi.mock('@/server/redis', () => ({
  redis: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
  },
}));

// Mock retrieveBlocksTree
const mockRetrieveBlocksTree = vi.fn();
vi.mock('@workspace/cms/notion/block/retrieveBlockChildren', () => ({
  retrieveBlocksTree: (...args: any[]) => mockRetrieveBlocksTree(...args),
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock Auth
vi.mock('@workspace/auth/better-auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockDocumentation = {
  title: 'Test Docs',
  logo: '/logo.png',
  darkLogo: '/dark-logo.png',
  docs: [
    { id: 'doc_1', Name: 'Getting Started', slug: 'getting-started', order: 1 },
    { id: 'doc_2', Name: 'API Reference', slug: 'api-reference', order: 2 },
  ],
};

const mockBlocks = [
  { id: 'block_1', type: 'paragraph', paragraph: { text: 'Hello world' } },
  { id: 'block_2', type: 'heading_1', heading_1: { text: 'Introduction' } },
];

describe('Documentation Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NOTION_API_TOKEN', 'test_notion_token');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getDocumentationInfoFromNotion', () => {
    it('should fetch data directly when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchDocumentation.mockResolvedValue(mockDocumentation);

      const caller = documentationRouter.createCaller({});
      const result = await caller.getDocumentationInfoFromNotion();

      expect(result).toEqual(mockDocumentation);
      expect(mockFetchDocumentation).toHaveBeenCalledTimes(1);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it('should return cached data when Redis cache hit', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(mockDocumentation);

      const caller = documentationRouter.createCaller({});
      const result = await caller.getDocumentationInfoFromNotion();

      expect(result).toEqual(mockDocumentation);
      expect(mockRedisGet).toHaveBeenCalledWith('documentation-page:notion:v1');
      expect(mockFetchDocumentation).not.toHaveBeenCalled();
    });

    it('should fetch from Notion and cache when Redis cache miss', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(null);
      mockFetchDocumentation.mockResolvedValue(mockDocumentation);
      mockRedisSet.mockResolvedValue('OK');

      const caller = documentationRouter.createCaller({});
      const result = await caller.getDocumentationInfoFromNotion();

      expect(result).toEqual(mockDocumentation);
      expect(mockRedisGet).toHaveBeenCalledWith('documentation-page:notion:v1');
      expect(mockFetchDocumentation).toHaveBeenCalledTimes(1);
      expect(mockRedisSet).toHaveBeenCalledWith(
        'documentation-page:notion:v1',
        mockDocumentation,
        { ex: 3600 }
      );
    });
  });

  describe('queryDocumentationBySlug', () => {
    it('should return blocks for a valid slug', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchDocumentation.mockResolvedValue(mockDocumentation);
      mockRetrieveBlocksTree.mockResolvedValue(mockBlocks);

      const caller = documentationRouter.createCaller({});
      const result = await caller.queryDocumentationBySlug({ slug: 'getting-started' });

      expect(result).toEqual(mockBlocks);
      expect(mockRetrieveBlocksTree).toHaveBeenCalledWith({
        apiToken: 'test_notion_token',
        block_id: 'doc_1',
      });
    });

    it('should use cached documentation for slug resolution', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(mockDocumentation);
      mockRetrieveBlocksTree.mockResolvedValue(mockBlocks);

      const caller = documentationRouter.createCaller({});
      const result = await caller.queryDocumentationBySlug({ slug: 'api-reference' });

      expect(result).toEqual(mockBlocks);
      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockFetchDocumentation).not.toHaveBeenCalled();
      expect(mockRetrieveBlocksTree).toHaveBeenCalledWith({
        apiToken: 'test_notion_token',
        block_id: 'doc_2',
      });
    });

    it('should throw an error when slug is not found', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchDocumentation.mockResolvedValue(mockDocumentation);

      const caller = documentationRouter.createCaller({});

      await expect(
        caller.queryDocumentationBySlug({ slug: 'nonexistent-slug' })
      ).rejects.toThrow('Documentation not found');
    });

    it('should fetch and cache documentation when Redis is configured but cache misses', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(null); // cache miss
      mockFetchDocumentation.mockResolvedValue(mockDocumentation);
      mockRedisSet.mockResolvedValue('OK');
      mockRetrieveBlocksTree.mockResolvedValue(mockBlocks);

      const caller = documentationRouter.createCaller({});
      const result = await caller.queryDocumentationBySlug({ slug: 'getting-started' });

      expect(result).toEqual(mockBlocks);
      expect(mockFetchDocumentation).toHaveBeenCalledTimes(1);
      // Verify it cached the fetched documentation
      expect(mockRedisSet).toHaveBeenCalledWith(
        'documentation-page:notion:v1',
        mockDocumentation,
        { ex: 3600 }
      );
    });

    it('should reject empty slug via zod validation', async () => {
      const caller = documentationRouter.createCaller({});

      await expect(
        caller.queryDocumentationBySlug({ slug: '' })
      ).rejects.toThrow();
    });
  });
});

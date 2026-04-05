import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { landingRouter } from '../../trpc/routers/landingProcedures.js';
import { auth } from '@workspace/auth/better-auth/auth';
import prisma from '@workspace/database/client';

// Mock fetchLandingPageData
const mockFetchLandingPageData = vi.fn();
vi.mock('@/lib/functions/fetchLandingPageData', () => ({
  fetchLandingPageData: (...args: any[]) => mockFetchLandingPageData(...args),
}));

// Mock Redis
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDel = vi.fn();
vi.mock('@/server/redis', () => ({
  redis: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
  },
}));

vi.mock('@workspace/cms/notion/page/updatePage', () => ({
  updateNotionPage: vi.fn(),
}));

vi.mock('@workspace/cms/notion/page/createPage', () => ({
  createNotionPage: vi.fn(),
}));

vi.mock('@workspace/cms/notion/page/trashPage', () => ({
  trashPage: vi.fn(),
}));

vi.mock('@workspace/cms/notion/database/queryDatabase', () => ({
  queryAllNotionDatabase: vi.fn(),
}));

vi.mock('@workspace/database/client', () => ({
  default: {
    landingPage: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    heroImage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    feature: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    testimonial: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    pricingPlan: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    fAQ: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock Auth (needed for tRPC init module resolution)
vi.mock('@workspace/auth/better-auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

const mockLandingPageData = {
  navbarSection: { title: 'Test SaaS', logo: '/logo.png' },
  heroSection: { tagline: 'Build fast', description: 'Ship faster' },
  featureSection: { heading: 'Features', features: [] },
  testimonialSection: { heading: 'Testimonials', testimonials: [] },
  pricingSection: { heading: 'Pricing', plans: [] },
  faqSection: { heading: 'FAQ', faqs: [] },
  footerSection: { title: 'Test SaaS', links: [] },
};

function createCallerContext(session: any = null) {
  return {
    session,
    headers: new Headers(),
  };
}

describe('Landing Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: 'session_1' },
      user: { id: 'user_1', role: 'admin', email: 'admin@test.com' },
    } as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getLandingInfoFromNotion', () => {
    it('should fetch data directly when Redis is not configured', async () => {
      // Ensure Redis env vars are NOT set, so the router skips cache
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchLandingPageData.mockResolvedValue(mockLandingPageData);

      const caller = landingRouter.createCaller(createCallerContext());
      const result = await caller.getLandingInfoFromNotion();

      expect(result).toEqual(mockLandingPageData);
      expect(mockFetchLandingPageData).toHaveBeenCalledTimes(1);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it('should return cached data when Redis cache hit', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(mockLandingPageData);

      const caller = landingRouter.createCaller(createCallerContext());
      const result = await caller.getLandingInfoFromNotion();

      expect(result).toEqual(mockLandingPageData);
      expect(mockRedisGet).toHaveBeenCalledWith('landing-page:notion:v3');
      expect(mockFetchLandingPageData).not.toHaveBeenCalled();
    });

    it('should fetch from Notion and cache when Redis cache miss', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(null);
      mockFetchLandingPageData.mockResolvedValue(mockLandingPageData);
      mockRedisSet.mockResolvedValue('OK');

      const caller = landingRouter.createCaller(createCallerContext());
      const result = await caller.getLandingInfoFromNotion();

      expect(result).toEqual(mockLandingPageData);
      expect(mockRedisGet).toHaveBeenCalledWith('landing-page:notion:v3');
      expect(mockFetchLandingPageData).toHaveBeenCalledTimes(1);
      expect(mockRedisSet).toHaveBeenCalledWith(
        'landing-page:notion:v3',
        mockLandingPageData,
        { ex: 3600 }
      );
    });

    it('should propagate errors from fetchLandingPageData', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchLandingPageData.mockRejectedValue(new Error('Notion API failed'));

      const caller = landingRouter.createCaller(createCallerContext());

      await expect(caller.getLandingInfoFromNotion()).rejects.toThrow('Notion API failed');
    });
  });

  describe('updateLandingInfo', () => {
    it('should reject anonymous callers', async () => {
      const caller = landingRouter.createCaller(createCallerContext());

      await expect(
        caller.updateLandingInfo({
          title: 'Updated SaaS',
        })
      ).rejects.toThrow('You must be logged in to access this resource.');

      expect(prisma.landingPage.findUnique).not.toHaveBeenCalled();
    });

    it('should reject authenticated non-admin callers', async () => {
      const caller = landingRouter.createCaller(
        createCallerContext({
          session: { id: 'session_2' },
          user: { id: 'user_2', role: 'user', email: 'user@test.com' },
        } as any),
      );

      await expect(
        caller.updateLandingInfo({
          title: 'Updated SaaS',
        })
      ).rejects.toThrow('Admin access is required to access this resource.');

      expect(prisma.landingPage.findUnique).not.toHaveBeenCalled();
    });

    it('should allow admin callers to update landing info', async () => {
      vi.stubEnv('NEXT_PUBLIC_CMS', 'postgres');
      vi.stubEnv('NEXT_PUBLIC_SAAS_NAME', 'Test SaaS');

      vi.mocked(prisma.landingPage.findUnique).mockResolvedValue(null as any);
      vi.mocked(prisma.landingPage.create).mockResolvedValue({
        id: 'landing_page_1',
      } as any);

      const caller = landingRouter.createCaller(
        createCallerContext({
          session: { id: 'session_1' },
          user: { id: 'user_1', role: 'admin', email: 'admin@test.com' },
        } as any),
      );
      const result = await caller.updateLandingInfo({
        title: 'Updated SaaS',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.landingPage.findUnique).toHaveBeenCalledWith({
        where: { title: 'Test SaaS' },
      });
      expect(prisma.landingPage.create).toHaveBeenCalledWith({
        data: { title: 'Updated SaaS' },
      });
    });

    it('should use NEXT_PUBLIC_CMS for server-side updates', async () => {
      vi.stubEnv('NEXT_PUBLIC_CMS', 'postgres');
      vi.stubEnv('NEXT_PUBLIC_SAAS_NAME', 'Test SaaS');

      vi.mocked(prisma.landingPage.findUnique).mockResolvedValue(null as any);
      vi.mocked(prisma.landingPage.create).mockResolvedValue({
        id: 'landing_page_1',
      } as any);

      const caller = landingRouter.createCaller(
        createCallerContext({
          session: { id: 'session_1' },
          user: { id: 'user_1', role: 'admin', email: 'admin@test.com' },
        } as any),
      );

      const result = await caller.updateLandingInfo({
        title: 'Updated SaaS',
      });

      expect(result).toEqual({ success: true });
      expect(prisma.landingPage.create).toHaveBeenCalledTimes(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { landingRouter } from '../../trpc/routers/landingProcedures.js';

// Mock fetchLandingPageData
const mockFetchLandingPageData = vi.fn();
vi.mock('@/lib/functions/fetchLandingPageDataFromNotion', () => ({
  fetchLandingPageData: (...args: any[]) => mockFetchLandingPageData(...args),
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

describe('Landing Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      const caller = landingRouter.createCaller({});
      const result = await caller.getLandingInfoFromNotion();

      expect(result).toEqual(mockLandingPageData);
      expect(mockFetchLandingPageData).toHaveBeenCalledTimes(1);
      expect(mockRedisGet).not.toHaveBeenCalled();
    });

    it('should return cached data when Redis cache hit', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(mockLandingPageData);

      const caller = landingRouter.createCaller({});
      const result = await caller.getLandingInfoFromNotion();

      expect(result).toEqual(mockLandingPageData);
      expect(mockRedisGet).toHaveBeenCalledWith('landing-page:notion:v1');
      expect(mockFetchLandingPageData).not.toHaveBeenCalled();
    });

    it('should fetch from Notion and cache when Redis cache miss', async () => {
      vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.test.com');
      vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test_token');

      mockRedisGet.mockResolvedValue(null);
      mockFetchLandingPageData.mockResolvedValue(mockLandingPageData);
      mockRedisSet.mockResolvedValue('OK');

      const caller = landingRouter.createCaller({});
      const result = await caller.getLandingInfoFromNotion();

      expect(result).toEqual(mockLandingPageData);
      expect(mockRedisGet).toHaveBeenCalledWith('landing-page:notion:v1');
      expect(mockFetchLandingPageData).toHaveBeenCalledTimes(1);
      expect(mockRedisSet).toHaveBeenCalledWith(
        'landing-page:notion:v1',
        mockLandingPageData,
        { ex: 3600 }
      );
    });

    it('should propagate errors from fetchLandingPageData', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      mockFetchLandingPageData.mockRejectedValue(new Error('Notion API failed'));

      const caller = landingRouter.createCaller({});

      await expect(caller.getLandingInfoFromNotion()).rejects.toThrow('Notion API failed');
    });
  });
});

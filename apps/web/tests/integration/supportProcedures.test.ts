import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supportRouter } from '../../trpc/routers/supportProcedures.js';
import { sendSupportEmail } from '@workspace/email/resend/index';
import { ratelimit, chatRateLimit } from '@/server/ratelimit';
import { auth } from '@workspace/auth/better-auth/auth';

// Mock dependencies
vi.mock('@workspace/email/resend/index', () => ({
  sendSupportEmail: vi.fn(),
}));

vi.mock('@/server/ratelimit', () => ({
  ratelimit: {
    limit: vi.fn(),
  },
  chatRateLimit: {
    limit: vi.fn(),
  },
}));

vi.mock('@workspace/auth/better-auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'x-forwarded-for') return '127.0.0.1';
      return null;
    }),
  })),
}));

describe('Support Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful rate limits
    vi.mocked(ratelimit.limit).mockResolvedValue({ success: true } as any);
    vi.mocked(chatRateLimit.limit).mockResolvedValue({ success: true } as any);
    
    // Default session mock (unauthenticated)
    vi.mocked(auth.api.getSession).mockResolvedValue(null as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('sendSupportMessage', () => {
    it('should successfully send an email when rate limit allows', async () => {
      vi.mocked(sendSupportEmail).mockResolvedValue({ id: 'mock-id' } as any);

      const caller = supportRouter.createCaller({});
      
      const result = await caller.sendSupportMessage({
        subject: 'Test Subject',
        email: 'test@example.com',
        message: 'This is a test message',
      });

      expect(result).toEqual({ success: true });
      expect(sendSupportEmail).toHaveBeenCalledWith(
        'Test Subject from test@example.com for undefined', // NEXT_PUBLIC_SAAS_NAME is undefined in test
        'This is a test message'
      );
    });

    it('should throw an error when rate limit is exceeded', async () => {
      vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as any);

      const caller = supportRouter.createCaller({});
      
      await expect(
        caller.sendSupportMessage({
          subject: 'Test Subject',
          email: 'test@example.com',
          message: 'This is a test message',
        })
      ).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should throw an error when sendSupportEmail returns null', async () => {
      vi.mocked(sendSupportEmail).mockResolvedValue(null as any);

      const caller = supportRouter.createCaller({});
      
      await expect(
        caller.sendSupportMessage({
          subject: 'Test',
          email: 'test@example.com',
          message: 'Test message',
        })
      ).rejects.toThrow('Failed to send support message');
    });
  });

  describe('subscribeToNewsletter', () => {
    it('should successfully subscribe when rate limit allows', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      
      vi.stubEnv('N8N_SUBSCRIBE_NEWSLETTER_WEBHOOK_URL', 'http://mock-webhook.com');

      const caller = supportRouter.createCaller({});
      
      const result = await caller.subscribeToNewsletter({
        email: 'test@example.com',
      });

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith('http://mock-webhook.com', expect.any(Object));
    });

    it('should throw an error when rate limit is exceeded', async () => {
      vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as any);

      const caller = supportRouter.createCaller({});
      
      await expect(
        caller.subscribeToNewsletter({
          email: 'test@example.com',
        })
      ).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should throw when N8N_SUBSCRIBE_NEWSLETTER_WEBHOOK_URL is missing', async () => {
      delete process.env.N8N_SUBSCRIBE_NEWSLETTER_WEBHOOK_URL;

      const caller = supportRouter.createCaller({});

      await expect(
        caller.subscribeToNewsletter({ email: 'test@example.com' })
      ).rejects.toThrow('Server misconfigured');
    });

    it('should throw when n8n returns an error response', async () => {
      vi.stubEnv('N8N_SUBSCRIBE_NEWSLETTER_WEBHOOK_URL', 'http://mock-webhook.com');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Bad request' }),
      });

      const caller = supportRouter.createCaller({});

      await expect(
        caller.subscribeToNewsletter({ email: 'test@example.com' })
      ).rejects.toThrow('Failed to send support message');
    });
  });

  describe('chatWithSaaSAssistant', () => {
    it('should successfully get a chat reply when rate limit allows', async () => {
      // Mock fetch for n8n response format as described in the code
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ output: 'Hello from assistant!' }]),
      });
      
      vi.stubEnv('N8N_SAAS_ASSISTANT_WEBHOOK_URL', 'http://mock-webhook.com');

      const caller = supportRouter.createCaller({});
      
      const result = await caller.chatWithSaaSAssistant({
        message: 'Hello!',
      });

      expect(result).toEqual({ reply: 'Hello from assistant!' });
      expect(fetch).toHaveBeenCalledWith('http://mock-webhook.com', expect.any(Object));
    });

    it('should throw an error when chat rate limit is exceeded', async () => {
      vi.mocked(chatRateLimit.limit).mockResolvedValue({ success: false } as any);

      const caller = supportRouter.createCaller({});
      
      await expect(
        caller.chatWithSaaSAssistant({
          message: 'Hello!',
        })
      ).rejects.toThrow('You are sending messages too quickly. Please slow down.');
    });

    it('should throw when N8N_SAAS_ASSISTANT_WEBHOOK_URL is missing', async () => {
      delete process.env.N8N_SAAS_ASSISTANT_WEBHOOK_URL;

      const caller = supportRouter.createCaller({});

      await expect(
        caller.chatWithSaaSAssistant({ message: 'Hello!' })
      ).rejects.toThrow('Server misconfigured');
    });

    it('should throw when n8n chat returns an error response', async () => {
      vi.stubEnv('N8N_SAAS_ASSISTANT_WEBHOOK_URL', 'http://mock-webhook.com');

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const caller = supportRouter.createCaller({});

      await expect(
        caller.chatWithSaaSAssistant({ message: 'Hello!' })
      ).rejects.toThrow('Failed to reach assistant');
    });

    it('should return fallback reply when n8n returns unexpected format', async () => {
      vi.stubEnv('N8N_SAAS_ASSISTANT_WEBHOOK_URL', 'http://mock-webhook.com');

      // n8n returns OK but no output field
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ someOther: 'data' }),
      });

      const caller = supportRouter.createCaller({});

      const result = await caller.chatWithSaaSAssistant({ message: 'Hello!' });
      expect(result).toEqual({ reply: "Sorry, I didn't get a response from the assistant." });
    });
  });
});

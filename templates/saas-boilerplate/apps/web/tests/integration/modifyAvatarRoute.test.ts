import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@workspace/auth/better-auth/auth';
import { ratelimit } from '@/server/ratelimit';

// Mock Auth
vi.mock('@workspace/auth/better-auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock ratelimit
vi.mock('@/server/ratelimit', () => ({
  ratelimit: {
    limit: vi.fn(),
  },
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => new Headers()),
}));

// Mock @vercel/blob
const mockPut = vi.fn();
vi.mock('@vercel/blob', () => ({
  put: (...args: any[]) => mockPut(...args),
}));

// Mock @aws-sdk/client-s3
const mockS3Send = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: mockS3Send,
  })),
  PutObjectCommand: vi.fn().mockImplementation((params: any) => params),
}));

describe('ModifyAvatar Route Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: 'session_1' },
      user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
    } as any);

    vi.mocked(ratelimit.limit).mockResolvedValue({ success: true } as any);
  });

  describe('POST handler', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      const formData = new FormData();
      formData.append('file', new File(['test'], 'avatar.png', { type: 'image/png' }));

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as any);

      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      const formData = new FormData();
      formData.append('file', new File(['test'], 'avatar.png', { type: 'image/png' }));

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should return 400 when no file is provided', async () => {
      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      const formData = new FormData();

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should return 400 when file is not an image', async () => {
      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      const formData = new FormData();
      formData.append('file', new File(['test'], 'document.pdf', { type: 'application/pdf' }));

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid file type. Only images are allowed.');
    });

    it('should return 400 when file exceeds 5MB', async () => {
      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      // Create a file slightly over 5MB
      const largeContent = new Uint8Array(5 * 1024 * 1024 + 1);
      const formData = new FormData();
      formData.append('file', new File([largeContent], 'large.png', { type: 'image/png' }));

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('File size exceeds 5MB limit.');
    });

    it('should upload to Vercel Blob by default', async () => {
      mockPut.mockResolvedValue({
        url: 'https://blob.vercel.com/avatar.png',
        downloadUrl: 'https://blob.vercel.com/avatar.png',
      });

      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      const formData = new FormData();
      formData.append('file', new File(['test-image-data'], 'avatar.png', { type: 'image/png' }));

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('https://blob.vercel.com/avatar.png');
      expect(mockPut).toHaveBeenCalledWith(
        'avatar.png',
        expect.any(File),
        expect.objectContaining({
          access: 'public',
          addRandomSuffix: true,
        })
      );
    });

    it('should upload to Cloudflare R2 when configured', async () => {
      vi.stubEnv('NEXT_PUBLIC_IMAGE_STORAGE', 'cloudflare_r2');
      vi.stubEnv('R2_ACCOUNT_ID', 'test_account');
      vi.stubEnv('R2_ACCESS_KEY_ID', 'test_key');
      vi.stubEnv('R2_SECRET_ACCESS_KEY', 'test_secret');
      vi.stubEnv('R2_BUCKET_NAME', 'test-bucket');
      vi.stubEnv('NEXT_PUBLIC_R2_PUBLIC_URL', 'https://r2.test.com');
      vi.stubEnv('NEXT_PUBLIC_SAAS_NAME', 'TestSaaS');

      mockS3Send.mockResolvedValue({});

      // Re-import to pick up new env vars
      vi.resetModules();
      // Re-mock after reset
      vi.doMock('@workspace/auth/better-auth/auth', () => ({
        auth: {
          api: {
            getSession: vi.fn().mockResolvedValue({
              session: { id: 'session_1' },
              user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
            }),
          },
        },
      }));
      vi.doMock('@/server/ratelimit', () => ({
        ratelimit: {
          limit: vi.fn().mockResolvedValue({ success: true }),
        },
      }));
      vi.doMock('next/headers', () => ({
        headers: vi.fn(() => new Headers()),
      }));
      vi.doMock('@vercel/blob', () => ({
        put: vi.fn(),
      }));
      const mockS3SendAfterReset = vi.fn().mockResolvedValue({});
      vi.doMock('@aws-sdk/client-s3', () => {
        return {
          S3Client: class MockS3Client {
            send = mockS3SendAfterReset;
          },
          PutObjectCommand: class MockPutObjectCommand {
            constructor(public params: any) {}
          },
        };
      });

      const { POST } = await import('../../app/api/settings/modifyAvatar/route.js');

      const formData = new FormData();
      formData.append('file', new File(['test-image-data'], 'avatar.png', { type: 'image/png' }));

      const request = new Request('http://localhost:3000/api/settings/modifyAvatar', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toContain('https://r2.test.com/');
      expect(data.url).toContain('testsaas/profile-images/');

      vi.unstubAllEnvs();
    });
  });
});

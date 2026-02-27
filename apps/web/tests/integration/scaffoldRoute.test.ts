import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock DB
const mockUserUpdate = vi.fn();
vi.mock('@workspace/database/client', () => ({
  default: {
    user: {
      update: (...args: any[]) => mockUserUpdate(...args),
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

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock archiver - each call creates a fresh callback set to avoid cross-test leakage
const mockDirectory = vi.fn();
const mockAppend = vi.fn();
const mockFinalize = vi.fn();
const mockAbort = vi.fn();

vi.mock('archiver', () => ({
  default: vi.fn(() => {
    const callbacks: Record<string, Function[]> = {};
    const instance = {
      directory: (...args: any[]) => { mockDirectory(...args); return instance; },
      append: (...args: any[]) => { mockAppend(...args); return instance; },
      finalize: () => {
        mockFinalize();
        // Fire end synchronously (no data in mock - we only test that archive methods were called)
        setTimeout(() => {
          callbacks['end']?.forEach(cb => cb());
        }, 5);
        return Promise.resolve();
      },
      on: (event: string, cb: any) => {
        if (!callbacks[event]) callbacks[event] = [];
        callbacks[event].push(cb);
        return instance;
      },
      abort: (...args: any[]) => { mockAbort(...args); return instance; },
    };
    return instance;
  }),
}));

// Mock fs
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn();
vi.mock('fs', () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
}));

describe('Scaffold Route Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user with enough credits
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: 'session_1' },
      user: { id: 'user_1', email: 'test@test.com', name: 'Test User', creditsTotal: 100, creditsUsed: 0 },
    } as any);

    vi.mocked(ratelimit.limit).mockResolvedValue({ success: true } as any);

    // Default: scaffold root exists, .env.example exists
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('DATABASE_URL=\nNEXT_PUBLIC_URL=\n');

    mockUserUpdate.mockResolvedValue({});
  });

  describe('POST handler', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const { POST } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-project', envVars: {} }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(ratelimit.limit).mockResolvedValue({ success: false } as any);

      const { POST } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-project', envVars: {} }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
    });

    it('should return 403 when user has insufficient credits', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: { id: 'session_1' },
        user: { id: 'user_1', creditsTotal: 10, creditsUsed: 5 },
      } as any);

      const { POST } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-project', envVars: {} }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not enough credits');
    });

    it('should return 500 when scaffold root is not found', async () => {
      // First call: pnpm-workspace.yaml check returns true, second+ calls for scaffold root return false
      mockExistsSync
        .mockReturnValueOnce(true) // pnpm-workspace.yaml
        .mockReturnValue(false); // scaffoldRoot not found

      const { POST } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'my-project', envVars: {} }),
      });

      const response = await POST(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Scaffold root not found');
    });

    it('should successfully generate and stream a zip file', async () => {
      const { POST } = await import('../../app/api/scaffold/route.js');

      const envVars = {
        DATABASE_URL: 'postgresql://localhost:5432/mydb',
        NEXT_PUBLIC_URL: 'http://localhost:3000',
      };

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Test Project!', envVars }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Content-Disposition')).toContain('.zip');

      // Verify archive methods were called
      expect(mockDirectory).toHaveBeenCalled();
      expect(mockAppend).toHaveBeenCalled(); // .env files
      expect(mockFinalize).toHaveBeenCalled();

      // Verify credits were deducted
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'user_1' },
        data: { creditsUsed: 20 }, // 0 + CREDITS_COST (20)
      });
    });

    it('should sanitize project name with special characters', async () => {
      const { POST } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '---My @#$ Project!!!---', envVars: {} }),
      });

      const response = await POST(request as any);

      expect(response.status).toBe(200);
      // The sanitized name appears in the Content-Disposition header
      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('My-Project');
      expect(disposition).not.toContain('@');
      expect(disposition).not.toContain('#');
    });

    it('should generate .env content by merging with .env.example', async () => {
      mockReadFileSync.mockReturnValue(
        '# Database\nDATABASE_URL=\n\n# App\nNEXT_PUBLIC_URL=\nSOME_OTHER_VAR=default\n'
      );

      const { POST } = await import('../../app/api/scaffold/route.js');

      const envVars = {
        DATABASE_URL: 'postgres://prod:5432/db',
        NEXT_PUBLIC_URL: 'https://myapp.com',
      };

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', envVars }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      // Verify append was called with .env content
      expect(mockAppend).toHaveBeenCalled();
    });

    it('should generate .env from vars when no .env.example exists', async () => {
      // existsSync: true for workspace markers, true for scaffold root, false for .env.example
      mockExistsSync
        .mockReturnValueOnce(true) // pnpm-workspace.yaml
        .mockReturnValueOnce(true) // scaffoldRoot
        .mockReturnValueOnce(false); // .env.example does not exist

      const { POST } = await import('../../app/api/scaffold/route.js');

      const envVars = {
        DATABASE_URL: 'postgres://localhost/db',
        NEXT_PUBLIC_URL: 'http://localhost:3000',
      };

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', envVars }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);
    });

    it('should add DATABASE_URL .env in packages/database/', async () => {
      const { POST } = await import('../../app/api/scaffold/route.js');

      const envVars = {
        DATABASE_URL: 'postgresql://localhost:5432/mydb',
      };

      const request = new Request('http://localhost:3000/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test', envVars }),
      });

      const response = await POST(request as any);
      expect(response.status).toBe(200);

      // Verify database .env was appended
      const appendCalls = mockAppend.mock.calls;
      const dbEnvCall = appendCalls.find(
        (call: any[]) => typeof call[1] === 'object' && call[1].name?.includes('packages/database/.env')
      );
      expect(dbEnvCall).toBeTruthy();
      expect(dbEnvCall![0]).toContain('postgresql://localhost:5432/mydb');
    });
  });

  describe('GET handler', () => {
    it('should return 403 when user has insufficient credits', async () => {
      vi.mocked(auth.api.getSession).mockResolvedValue({
        session: { id: 'session_1' },
        user: { id: 'user_1', creditsTotal: 10, creditsUsed: 5 },
      } as any);

      const { GET } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold?name=test');

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Not enough credits');
    });

    it('should return 500 when scaffold root is not found', async () => {
      mockExistsSync
        .mockReturnValueOnce(true) // pnpm-workspace.yaml
        .mockReturnValue(false); // scaffoldRoot

      const { GET } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold?name=test');

      const response = await GET(request as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Scaffold root not found');
    });

    it('should successfully generate and stream a zip file via GET', async () => {
      const { GET } = await import('../../app/api/scaffold/route.js');

      const request = new Request('http://localhost:3000/api/scaffold?name=my-project');

      const response = await GET(request as any);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/zip');
      expect(response.headers.get('Content-Disposition')).toContain('my-project.zip');

      // Verify credits were deducted
      expect(mockUserUpdate).toHaveBeenCalled();
    });
  });
});

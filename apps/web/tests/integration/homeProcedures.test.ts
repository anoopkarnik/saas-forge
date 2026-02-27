import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { homeRouter } from '../../trpc/routers/homeProcedures.js';
import { auth } from '@workspace/auth/better-auth/auth';

// Mock Auth
vi.mock('@workspace/auth/better-auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      setPassword: vi.fn(),
    },
  },
}));

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

describe('Home Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated session
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: 'session_1' },
      user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
    } as any);
  });

  describe('setPassword', () => {
    it('should successfully set a password when valid input is provided', async () => {
      vi.mocked(auth.api.setPassword).mockResolvedValue({ status: true } as any);

      const caller = homeRouter.createCaller({
        session: { user: { id: 'user_1', email: 'test@test.com', name: 'Test User' } } as any,
        headers: new Headers(),
      });

      const result = await caller.setPassword({
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      });

      expect(result).toEqual({ success: true });
      expect(auth.api.setPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { newPassword: 'newpassword123' },
        })
      );
    });

    it('should reject when passwords do not match', async () => {
      const caller = homeRouter.createCaller({
        session: { user: { id: 'user_1', email: 'test@test.com', name: 'Test User' } } as any,
        headers: new Headers(),
      });

      // AddPasswordSchema validation should reject mismatched passwords
      await expect(
        caller.setPassword({
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword',
        })
      ).rejects.toThrow();
    });

    it('should reject passwords shorter than 8 characters', async () => {
      const caller = homeRouter.createCaller({
        session: { user: { id: 'user_1', email: 'test@test.com', name: 'Test User' } } as any,
        headers: new Headers(),
      });

      await expect(
        caller.setPassword({
          newPassword: 'short',
          confirmPassword: 'short',
        })
      ).rejects.toThrow();
    });

    it('should propagate errors from auth.api.setPassword', async () => {
      vi.mocked(auth.api.setPassword).mockRejectedValue(new Error('Failed to set password'));

      const caller = homeRouter.createCaller({
        session: { user: { id: 'user_1', email: 'test@test.com', name: 'Test User' } } as any,
        headers: new Headers(),
      });

      await expect(
        caller.setPassword({
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        })
      ).rejects.toThrow('Failed to set password');
    });

    it('should require authentication (protectedProcedure)', async () => {
      // When no session exists, protectedProcedure should reject
      vi.mocked(auth.api.getSession).mockResolvedValue(null as any);

      const caller = homeRouter.createCaller({
        session: null as any,
        headers: new Headers(),
      });

      await expect(
        caller.setPassword({
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123',
        })
      ).rejects.toThrow();
    });
  });
});

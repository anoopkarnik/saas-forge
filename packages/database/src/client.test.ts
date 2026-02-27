import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Database client setup', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should initialize Prisma Client only once in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    // First import
    const dbModule1 = await import('./client.js');
    const prisma1 = dbModule1.default;
    
    // Simulate hot-reload or subsequent import
    const dbModule2 = await import('./client.js');
    const prisma2 = dbModule2.default;

    // Both should point to the exact same global client instance
    expect(prisma1).toBe(prisma2);
    // Should be assigned to the global object
    expect(globalThis.prismaGlobal).toBe(prisma1);
  });

  it('should not assign Prisma Client to global in production mode', async () => {
    process.env.NODE_ENV = 'production';
    globalThis.prismaGlobal = undefined;

    const dbModule = await import('./client.js');
    const prisma = dbModule.default;

    // It should exist but not be on the global object
    expect(prisma).toBeDefined();
    expect(globalThis.prismaGlobal).toBeUndefined();
  });
});

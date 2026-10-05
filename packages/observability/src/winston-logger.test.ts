import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as winston from 'winston';

describe('winston-logger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleWarnSpy: any;

  beforeEach(() => {
    vi.resetModules();
    originalEnv = { ...process.env };
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should initialize Logtail when tokens are provided', async () => {
    process.env.BETTERSTACK_TELEMETRY_SOURCE_TOKEN = 'fake-token';
    process.env.BETTERSTACK_TELEMETRY_INGESTING_HOST = 'fake-host';

    const { logger } = await import('./winston-logger.js');

    expect(logger).toBeDefined();
    // Verify it's a Winston logger instance
    expect(logger).toHaveProperty('level', 'info');
    
    // There should be two transports: Console and LogtailTransport
    expect(logger.transports.length).toBe(2);
    
    // Logtail is initialized, so no warning is printed
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('should not initialize Logtail and warn in development mode if tokens are missing', async () => {
    delete process.env.BETTERSTACK_TELEMETRY_SOURCE_TOKEN;
    delete process.env.BETTERSTACK_TELEMETRY_INGESTING_HOST;
    vi.stubEnv('NODE_ENV', 'development');

    const { logger } = await import('./winston-logger.js');

    expect(logger).toBeDefined();
    
    // There should only be one transport: Console
    expect(logger.transports.length).toBe(1);
    
    // Warning should be printed
    expect(consoleWarnSpy).toHaveBeenCalledWith('BetterStack logging disabled (missing env variables)');
  });

  it('should not warn in production mode if tokens are missing', async () => {
    delete process.env.BETTERSTACK_TELEMETRY_SOURCE_TOKEN;
    delete process.env.BETTERSTACK_TELEMETRY_INGESTING_HOST;
    vi.stubEnv('NODE_ENV', 'production');

    const { logger } = await import('./winston-logger.js');

    expect(logger).toBeDefined();
    
    // There should only be one transport: Console
    expect(logger.transports.length).toBe(1);
    
    // Warning should NOT be printed
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    // Trigger a log to hit the formatter
    logger.info('Test message');
  });
});

describe('redactFormat', () => {
  it('redacts secret-looking metadata and envVars payloads but keeps counts', async () => {
    const { redactFormat } = await import('./winston-logger.js');
    const info = redactFormat().transform({
      level: 'info',
      message: 'scaffold download',
      envVars: { DATABASE_URL: 'postgresql://canary' },
      body: { STRIPE_SECRET_KEY: 'sk_canary', name: 'demo', nested: { accessToken: 't_canary' } },
      promptTokens: 120,
      apiKey: 'canary',
    } as any) as any;

    expect(JSON.stringify(info)).not.toContain('canary');
    expect(info.envVars).toBe('[redacted]');
    expect(info.body.name).toBe('demo');
    expect(info.promptTokens).toBe(120);
    expect(info.message).toBe('scaffold download');
  });
});

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

import { describe, it, expect, vi, beforeEach } from 'vitest';

// No env mocking needed - DODO_PAYMENTS_WEBHOOK_KEY is not set by default
// so the route's `if (process.env.DODO_PAYMENTS_WEBHOOK_KEY)` block won't execute

describe('Dodo Webhook Route - Unconfigured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 503 when payment gateway is not configured', async () => {
    const { POST } = await import('../../app/api/payments/dodo/webhook/route.js');

    const request = new Request('http://localhost:3000/api/payments/dodo/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Payment gateway is not configured');
  });
});

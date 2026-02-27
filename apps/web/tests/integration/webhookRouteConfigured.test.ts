// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set env BEFORE any imports so the route's if-block triggers
process.env.DODO_PAYMENTS_WEBHOOK_KEY = 'test_webhook_key';

// Mock DB
const mockUserUpdate = vi.fn();
const mockTransactionCreate = vi.fn();
const mockTransactionFindFirst = vi.fn();
vi.mock('@workspace/database/client', () => ({
  default: {
    user: {
      update: (...args: any[]) => mockUserUpdate(...args),
    },
    transaction: {
      create: (...args: any[]) => mockTransactionCreate(...args),
      findFirst: (...args: any[]) => mockTransactionFindFirst(...args),
    },
    $transaction: async (callback: any) => {
      // Create a mock transaction client that just passes calls to the main mocks
      const mockTx = {
        user: { update: (...args: any[]) => mockUserUpdate(...args) },
        transaction: {
          create: (...args: any[]) => mockTransactionCreate(...args),
          findFirst: (...args: any[]) => mockTransactionFindFirst(...args),
        }
      };
      return callback(mockTx);
    }
  },
}));

// Mock next/cache
const mockRevalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

// Capture webhook config by intercepting the Webhooks factory
let capturedWebhookConfig: any = null;
const mockWebhookHandler = vi.fn().mockResolvedValue(
  new Response(JSON.stringify({ received: true }), { status: 200 })
);
vi.mock('@dodopayments/nextjs', () => ({
  Webhooks: vi.fn((config: any) => {
    capturedWebhookConfig = config;
    return (...args: any[]) => mockWebhookHandler(...args);
  }),
}));

describe('Dodo Webhook Route - Configured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserUpdate.mockResolvedValue({});
    mockTransactionCreate.mockResolvedValue({});
  });

  it('should invoke the webhook handler when configured', async () => {
    const { POST } = await import('../../app/api/payments/dodo/webhook/route.js');

    const request = new Request('http://localhost:3000/api/payments/dodo/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment.succeeded' }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(200);
    expect(mockWebhookHandler).toHaveBeenCalled();
  });

  it('should handle onPaymentSucceeded with valid payload', async () => {
    // Route import triggers the Webhooks() call which captures the config
    await import('../../app/api/payments/dodo/webhook/route.js');

    expect(capturedWebhookConfig).toBeTruthy();
    expect(capturedWebhookConfig.onPaymentSucceeded).toBeTypeOf('function');

    const payload = {
      data: {
        payment_id: 'pay_123',
        metadata: { credits: '100', userId: 'user_1' },
        settlement_currency: 'USD',
        total_amount: 1000,
      },
    };

    await capturedWebhookConfig.onPaymentSucceeded(payload);

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { creditsTotal: { increment: 100 } },
    });

    expect(mockTransactionCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        eventId: 'pay_123',
        checkoutSessionId: 'pay_123',
        receiptUrl: 'undefined/invoices/payments/pay_123',
        description: 'Credit Purchase',
        amount: 1000,
        currency: 'USD',
      },
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('should throw error for invalid payload in onPaymentSucceeded', async () => {
    await import('../../app/api/payments/dodo/webhook/route.js');

    expect(capturedWebhookConfig?.onPaymentSucceeded).toBeTypeOf('function');

    const invalidPayload = {
      data: {
        payment_id: 'pay_123',
        metadata: {},
        settlement_currency: 'USD',
        total_amount: 500,
      },
    };

    await expect(
      capturedWebhookConfig.onPaymentSucceeded(invalidPayload)
    ).rejects.toThrow('Invalid payload');
  });
});

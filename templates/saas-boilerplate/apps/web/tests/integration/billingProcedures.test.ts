import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { billingRouter } from '../../trpc/routers/billingProcedures.js';
import { z } from "zod";
import db from '@workspace/database/client';
import { auth } from '@workspace/auth/better-auth/auth';

// Mock DB
vi.mock('@workspace/database/client', () => ({
  default: {
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

// scaffold:begin payment_gateway.dodo
// Mock DodoPayments
const mockCreateCustomer = vi.fn();
const mockCreateCheckoutSession = vi.fn();

vi.mock('dodopayments', () => {
  return {
    default: class MockDodoPayments {
      customers = {
        create: mockCreateCustomer,
      };
      checkoutSessions = {
        create: mockCreateCheckoutSession,
      };
    },
  };
});
// scaffold:end payment_gateway.dodo

// scaffold:begin payment_gateway.stripe
// Mock Stripe
const mockStripeCreateCustomer = vi.fn();
const mockStripeCreateSession = vi.fn();

vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = { create: mockStripeCreateCustomer };
    checkout = { sessions: { create: mockStripeCreateSession } };
  },
}));
// scaffold:end payment_gateway.stripe

// Mock Auth
vi.mock('@workspace/auth/better-auth/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock Next.js headers since protectedProcedure relies on it
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

function createCallerContext(session: any) {
  return {
    session,
    headers: new Headers(),
  };
}

describe('Billing Router Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // scaffold:begin payment_gateway.dodo
    vi.stubEnv('DODO_PAYMENTS_API_KEY', 'test_key');
    vi.stubEnv('DODO_CREDITS_PRODUCT_ID', 'prod_123');
    // scaffold:end payment_gateway.dodo
    vi.stubEnv('NEXT_PUBLIC_URL', 'http://localhost:3000');

    // Default authenticated session
    vi.mocked(auth.api.getSession).mockResolvedValue({
      session: { id: 'session_1' },
      user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
    } as any);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // scaffold:begin payment_gateway.dodo
  describe('createNewCustomer', () => {
    it('should throw an error if Dodo configuration is missing', async () => {
      // Unset API key to trigger error
      vi.unstubAllEnvs();

      const caller = billingRouter.createCaller(
        createCallerContext({
          user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
        } as any),
      );

      await expect(
        caller.createNewCustomer({
          email: 'test@test.com',
          name: 'Test User',
        })
      ).rejects.toThrow('Dodo payment gateway is not configured');
    });

    it('should successfully create a new customer', async () => {
      mockCreateCustomer.mockResolvedValue({ customer_id: 'cust_123', email: 'test@test.com' });

      // createNewCustomer is a protected procedure, we pass session in ctx
      const caller = billingRouter.createCaller(
        createCallerContext({
          user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
        } as any),
      );

      const result = await caller.createNewCustomer({
        email: 'test@test.com',
        name: 'Test User',
      });

      expect(result).toEqual({ customer_id: 'cust_123', email: 'test@test.com' });
      expect(mockCreateCustomer).toHaveBeenCalledWith({
        email: 'test@test.com',
        name: 'Test User',
      });
    });
  });

  // scaffold:end payment_gateway.dodo

  // scaffold:begin payment_gateway.stripe
  describe('with Stripe', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PUBLIC_PAYMENT_GATEWAY', 'stripe');
      vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    });

    const caller = () =>
      billingRouter.createCaller(
        createCallerContext({ user: { id: 'user_1', email: 'test@test.com', name: 'Test User' } } as any),
      );

    it('creates the customer in Stripe', async () => {
      mockStripeCreateCustomer.mockResolvedValue({ id: 'cus_123' });
      expect(await caller().createNewCustomer({ email: 'test@test.com', name: 'Test User' })).toEqual({ id: 'cus_123' });
      expect(mockStripeCreateCustomer).toHaveBeenCalledWith({ email: 'test@test.com', name: 'Test User' });
    });

    it('opens a Stripe checkout for the credits', async () => {
      mockStripeCreateSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay_123' });
      expect(await caller().createCheckoutSession({ credits: 100 })).toEqual({
        checkoutUrl: 'https://checkout.stripe.com/c/pay_123',
      });
      expect(mockStripeCreateSession).toHaveBeenCalledWith(
        expect.objectContaining({ client_reference_id: 'user_1', metadata: { userId: 'user_1', credits: '100' } }),
      );
    });
  });
  // scaffold:end payment_gateway.stripe

  describe('createCheckoutSession', () => {
    // scaffold:begin payment_gateway.dodo
    it('should successfully create a checkout session for valid credits', async () => {
      mockCreateCheckoutSession.mockResolvedValue({ checkout_url: 'https://checkout.dodo.com/session_123' });

      const caller = billingRouter.createCaller(
        createCallerContext({
          user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
        } as any),
      );

      const result = await caller.createCheckoutSession({
        credits: 100, // Valid multiple of 50
      });

      expect(result).toEqual({ checkoutUrl: 'https://checkout.dodo.com/session_123' });
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
        product_cart: [{ product_id: 'prod_123', quantity: 2 }],
        return_url: 'http://localhost:3000?payment=success',
        customer: { email: 'test@test.com', name: 'Test User' },
        metadata: { userId: 'user_1', credits: '100' },
      });
    });
    // scaffold:end payment_gateway.dodo

    it('should throw an error if credits are not a multiple of 50', async () => {
      const caller = billingRouter.createCaller(
        createCallerContext({
          user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
        } as any),
      );

      await expect(
        caller.createCheckoutSession({
          credits: 75,
        })
      ).rejects.toThrow('Credits must be a multiple of 50');
    });
  });

  describe('getTransactions', () => {
    it('should return a list of transactions for the user', async () => {
      const mockTransactions = [
        { id: 'tx_1', amount: 50, date: new Date() },
      ];
      vi.mocked(db.transaction.findMany).mockResolvedValue(mockTransactions as any);

      const caller = billingRouter.createCaller(
        createCallerContext({
          user: { id: 'user_1', email: 'test@test.com', name: 'Test User' },
        } as any),
      );

      const result = await caller.getTransactions();

      expect(result).toEqual(mockTransactions);
      expect(db.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
        orderBy: { date: 'desc' },
      });
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { BillingService } from '../src/billing/billing-service';

// Mock Stripe SDK before importing BillingService
vi.mock('stripe', () => {
  const mockCheckoutSessions = {
    create: vi.fn().mockResolvedValue({
      id: 'cs_test_mock_' + Math.random().toString(36).slice(2),
      url: 'https://checkout.stripe.com/pay/cs_test_mock',
      customer: 'cus_test_mock_' + Math.random().toString(36).slice(2),
    }),
  };

  const mockWebhooks = {
    constructEvent: vi.fn((body: string, signature: string, secret: string) => { // allow-secret
      const payload = JSON.parse(body);
      return payload;
    }),
  };

  return {
    default: class MockStripe {
      checkout = { sessions: mockCheckoutSessions };
      webhooks = mockWebhooks;
      constructor(apiKey: string, config?: any) {} // allow-secret
    },
  };
});

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BillingService({
      stripeSecretKey: 'sk_test_mock', // allow-secret
      stripePriceIds: {
        FREE: { monthly: 'free', yearly: 'free' },
        PRO: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
        ENTERPRISE: { monthly: 'price_ent_monthly', yearly: 'price_ent_yearly' },
      },
      webhookSecret: 'whsec_test', // allow-secret
    });
  });

  describe('getPriceId()', () => {
    it('returns correct price ID for tier and interval', () => {
      const priceId = service.getPriceId('PRO', 'monthly');
      expect(priceId).toBe('price_pro_monthly');
      
      const yearlyId = service.getPriceId('PRO', 'yearly');
      expect(yearlyId).toBe('price_pro_yearly');
    });

    it('returns ENTERPRISE price IDs', () => {
      expect(service.getPriceId('ENTERPRISE', 'monthly')).toBe('price_ent_monthly');
      expect(service.getPriceId('ENTERPRISE', 'yearly')).toBe('price_ent_yearly');
    });

    it('returns FREE price IDs', () => {
      expect(service.getPriceId('FREE', 'monthly')).toBe('free');
      expect(service.getPriceId('FREE', 'yearly')).toBe('free');
    });

    it('throws for invalid tier', () => {
      expect(() => service.getPriceId('INVALID' as any, 'monthly')).toThrow();
    });
  });

  describe('getPlanDetails()', () => {
    it('returns FREE plan details', () => {
      const plan = service.getPlanDetails('FREE');
      expect(plan.tier).toBe('FREE');
      expect(plan.name).toBe('Free Tier');
      expect(plan.features.hunter_job_searches.limit).toBe(5);
    });

    it('returns PRO plan details', () => {
      const plan = service.getPlanDetails('PRO');
      expect(plan.tier).toBe('PRO');
      expect(plan.name).toBe('Professional');
      expect(plan.features.hunter_job_searches.limit).toBe(-1); // Unlimited
    });

    it('returns ENTERPRISE plan details', () => {
      const plan = service.getPlanDetails('ENTERPRISE');
      expect(plan.tier).toBe('ENTERPRISE');
      expect(plan.features.masks_limit.limit).toBe(-1); // Unlimited
    });
  });

  describe('createCheckoutSession()', () => {
    it('creates session with mock parameters', async () => {
      const session = await service.createCheckoutSession({
        profileId: 'user-1',
        priceId: 'price_pro_monthly',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        email: 'test@example.com',
      });

      expect(session.sessionId).toMatch(/^cs_test_/);
      expect(session.url).toContain('stripe.com');
      expect(session.stripeCustomerId).toMatch(/^cus_test_/);
    });

    it('creates session without optional email', async () => {
      const session = await service.createCheckoutSession({
        profileId: 'user-2',
        priceId: 'price_pro_yearly',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
      });

      expect(session.sessionId).toBeDefined();
      expect(session.url).toBeDefined();
    });

    it('throws error for missing profileId', async () => {
      await expect(
        service.createCheckoutSession({
          profileId: '',
          priceId: 'price_pro_monthly',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        })
      ).rejects.toThrow();
    });

    it('throws error for missing priceId', async () => {
      await expect(
        service.createCheckoutSession({
          profileId: 'user-1',
          priceId: '',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        })
      ).rejects.toThrow();
    });

    it('throws error for missing URLs', async () => {
      await expect(
        service.createCheckoutSession({
          profileId: 'user-1',
          priceId: 'price_pro_monthly',
          successUrl: '',
          cancelUrl: 'http://localhost:3000/cancel',
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('validates correct JSON body', () => {
      const body = JSON.stringify({ id: 'evt_123', type: 'customer.subscription.created' });
      const verification = service.verifyWebhookSignature(body, 'any_sig');
      
      expect(verification.valid).toBe(true);
      expect(verification.payload?.id).toBe('evt_123');
    });

    it('throws error for malformed JSON', () => {
      expect(() => {
        service.verifyWebhookSignature('{ invalid json }', 'any_sig');
      }).toThrow();
    });
  });

  describe('handleWebhookEvent()', () => {
    it('processes customer.subscription.created', async () => {
      const payload = {
        id: 'evt_1',
        type: 'customer.subscription.created',
        data: {
          object: { id: 'sub_1', customer: 'cus_1', status: 'active' }
        }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
    });

    it('processes invoice.payment_succeeded', async () => {
      const payload = {
        id: 'evt_2',
        type: 'invoice.payment_succeeded',
        data: {
          object: { id: 'in_1', customer: 'cus_1', amount_paid: 1000 }
        }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
    });

    it('processes customer.subscription.updated', async () => {
      const payload = {
        id: 'evt_3',
        type: 'customer.subscription.updated',
        data: {
          object: { id: 'sub_1', customer: 'cus_1', status: 'canceled' }
        }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
    });

    it('processes customer.subscription.deleted', async () => {
      const payload = {
        id: 'evt_4',
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_1', customer: 'cus_1' }
        }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
    });

    it('processes invoice.payment_failed', async () => {
      const payload = {
        id: 'evt_5',
        type: 'invoice.payment_failed',
        data: {
          object: { id: 'in_1', customer: 'cus_1', amount_due: 1000 }
        }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
    });

    it('handles unhandled event types gracefully', async () => {
      const payload = {
        id: 'evt_unknown',
        type: 'unknown.event',
        data: { object: {} }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
    });

    it('returns processed status', async () => {
      const payload = {
        id: 'evt_specific',
        type: 'customer.subscription.created',
        data: { object: { id: 'sub_1', customer: 'cus_1' } }
      };
      
      const result = await service.handleWebhookEvent(payload);
      expect(result.processed).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});

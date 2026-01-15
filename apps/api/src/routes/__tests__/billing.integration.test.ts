import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { buildTestApp } from '../../../test/app-builder';
import { InMemorySubscriptionRepo } from '../../repositories/subscriptions';

describe('Billing Integration Tests', () => {
  let app: FastifyInstance;
  let testProfileId: string;
  let subRepo: InMemorySubscriptionRepo;

  beforeAll(async () => {
    subRepo = new InMemorySubscriptionRepo();
    app = await buildTestApp({ subscriptionRepo: subRepo });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    // Create test profile
    const response = await app.inject({
      method: 'POST',
      url: '/profiles',
      payload: { 
        id,
        identityId: crypto.randomUUID(),
        displayName: 'Test User', 
        slug: 'test-billing-user-' + Math.random().toString(36).substr(2, 5),
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
    });
    const body = response.json();
    if (!body.ok) {
      console.error('Profile creation failed:', body.errors);
    }
    testProfileId = body.data.id;

    // Create FREE subscription for the user
    await subRepo.create(testProfileId, 'cus_test_' + testProfileId.slice(0, 8));
  });

  describe('GET /billing/plans', () => {
    it('returns all subscription plans', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/billing/plans',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.plans).toHaveLength(3);
      
      const freePlan = body.data.plans.find((p: any) => p.tier === 'FREE');
      expect(freePlan).toBeDefined();
      expect(freePlan.features.hunter_job_searches.limit).toBe(5);
    });
  });

  describe('POST /billing/checkout/:profileId', () => {
    it('creates checkout session for PRO tier', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/billing/checkout/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: {
          tier: 'PRO',
          billingInterval: 'monthly',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.sessionId).toMatch(/^cs_test_/);
      expect(body.data.url).toContain('stripe.com');
    });

    it('creates checkout session for ENTERPRISE tier with yearly billing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/billing/checkout/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: {
          tier: 'ENTERPRISE',
          billingInterval: 'yearly',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
          email: 'test@enterprise.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.sessionId).toBeDefined();
    });

    it('rejects checkout for FREE tier', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/billing/checkout/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: {
          tier: 'FREE',
          billingInterval: 'monthly',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('invalid_tier');
    });

    it('rejects checkout with missing required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/billing/checkout/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: {
          tier: 'PRO',
          // Missing billingInterval, successUrl, cancelUrl
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('rejects checkout with invalid billing interval', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/billing/checkout/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: {
          tier: 'PRO',
          billingInterval: 'invalid',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /billing/subscription/:profileId', () => {
    it('returns subscription details', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/billing/subscription/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.ok).toBe(true);
      expect(body.data.tier).toBe('FREE');
      expect(body.data.plan.features).toBeDefined();
    });

    it('returns 404 for non-existent subscription', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'GET',
        url: `/billing/subscription/${randomUuid}`,
        headers: { 'x-mock-user-id': randomUuid },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.ok).toBe(false);
    });

    it('returns upgraded subscription details', async () => {
      // Upgrade to PRO
      await subRepo.update(testProfileId, { 
        tier: 'PRO',
        stripeSubscriptionId: 'sub_pro_123',
        status: 'active',
      });

      const response = await app.inject({
        method: 'GET',
        url: `/billing/subscription/${testProfileId}`,
        headers: { 'x-mock-user-id': testProfileId },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.tier).toBe('PRO');
      expect(body.data.stripeSubscriptionId).toBe('sub_pro_123');
    });
  });

  describe('POST /billing/subscription/:profileId/cancel', () => {
    it('cancels subscription immediately', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/billing/subscription/${testProfileId}/cancel`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: { atPeriodEnd: false },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().message).toContain('canceled immediately');
    });

    it('schedules cancellation at period end', async () => {
      // Set up subscription with period end date
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await subRepo.update(testProfileId, {
        tier: 'PRO',
        currentPeriodEnd: periodEnd,
      });

      const response = await app.inject({
        method: 'POST',
        url: `/billing/subscription/${testProfileId}/cancel`,
        headers: { 'x-mock-user-id': testProfileId },
        payload: { atPeriodEnd: true },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toContain('end of the billing period');

      // Verify database updated
      const updated = await subRepo.getByProfileId(testProfileId);
      expect(updated?.cancelAtPeriodEnd).toBe(true);
    });

    it('returns 404 for non-existent subscription', async () => {
      const randomUuid = '00000000-0000-0000-0000-000000000000';
      const response = await app.inject({
        method: 'POST',
        url: `/billing/subscription/${randomUuid}/cancel`,
        headers: { 'x-mock-user-id': randomUuid },
        payload: { atPeriodEnd: false },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /webhooks/stripe', () => {
    it('rejects webhook without signature', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        payload: { type: 'customer.subscription.created' },
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('missing_signature');
    });

    it('accepts valid webhook event (mocked)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        headers: { 'stripe-signature': 'test_sig' },
        payload: { 
          id: 'evt_test',
          type: 'customer.subscription.created',
          data: { object: { id: 'sub_test', customer: 'cus_test' } }
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().ok).toBe(true);
    });

    it('is idempotent (duplicate events are safe)', async () => {
      const eventPayload = {
        id: 'evt_duplicate_test',
        type: 'invoice.payment_succeeded',
        data: { object: { id: 'in_123', customer: 'cus_test' } },
      };

      // First call
      const response1 = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        headers: { 'stripe-signature': 'test_sig' },
        payload: eventPayload,
      });
      expect(response1.statusCode).toBe(200);

      // Second call (should be safe)
      const response2 = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        headers: { 'stripe-signature': 'test_sig' },
        payload: eventPayload,
      });
      expect(response2.statusCode).toBe(200);
    });

    it('processes customer.subscription.updated event', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        headers: { 'stripe-signature': 'test_sig' },
        payload: {
          id: 'evt_updated',
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: 'sub_test',
              customer: 'cus_test',
              status: 'active',
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('processes customer.subscription.deleted event', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        headers: { 'stripe-signature': 'test_sig' },
        payload: {
          id: 'evt_deleted',
          type: 'customer.subscription.deleted',
          data: {
            object: {
              id: 'sub_test',
              customer: 'cus_test',
            },
          },
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('handles unknown event types gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/billing/webhooks/stripe',
        headers: { 'stripe-signature': 'test_sig' },
        payload: {
          id: 'evt_unknown',
          type: 'unknown.event.type',
          data: { object: {} },
        },
      });

      // Should still return 200 (Stripe expects this)
      expect(response.statusCode).toBe(200);
    });
  });
});

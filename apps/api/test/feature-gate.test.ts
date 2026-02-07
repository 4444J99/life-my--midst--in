/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './app-builder';
import { createFeatureGateMiddleware } from '../src/middleware/feature-gate';
import { InMemorySubscriptionRepo } from '../src/repositories/subscriptions';
import { InMemoryRateLimitStore } from '../src/repositories/rate-limits';
import { LicensingService } from '@in-midst-my-life/core';

describe('feature-gate middleware', () => {
  let app: FastifyInstance;
  let subscriptionRepo: InMemorySubscriptionRepo;
  let rateLimitStore: InMemoryRateLimitStore;
  let licensingService: LicensingService;

  const profileId = '00000000-0000-0000-0000-000000000001';

  beforeEach(async () => {
    subscriptionRepo = new InMemorySubscriptionRepo();
    rateLimitStore = new InMemoryRateLimitStore();

    licensingService = new LicensingService(async (pid) => {
      const sub = await subscriptionRepo.getByProfileId(pid);
      return sub?.tier ?? 'FREE';
    }, rateLimitStore);

    app = await buildTestApp({ subscriptionRepo, rateLimitStore });

    // Register a test-only route gated by feature middleware
    app.get(
      '/test/gated/:id',
      { preHandler: [createFeatureGateMiddleware(licensingService, 'hunter_job_searches')] },
      (request) => ({
        ok: true,
        message: 'feature allowed',
        remaining: request.featureGate?.remaining,
      }),
    );
  });

  it('allows requests when quota is available (FREE tier, limit 5)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/test/gated/${profileId}`,
      headers: {
        'x-mock-user-id': profileId,
        'x-mock-roles': 'user',
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toBe('feature allowed');
    expect(body.remaining).toBe(4); // 5 - 1 consumed
  });

  it('rejects when quota is exhausted with 403', async () => {
    // Exhaust the quota (FREE tier has limit 5 for hunter_job_searches)
    for (let i = 0; i < 5; i++) {
      await rateLimitStore.increment(profileId, 'hunter_job_searches', 1);
    }

    const res = await app.inject({
      method: 'GET',
      url: `/test/gated/${profileId}`,
      headers: {
        'x-mock-user-id': profileId,
        'x-mock-roles': 'user',
      },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('quota_exceeded');
    expect(body.feature).toBe('hunter_job_searches');
    expect(body.upgradeAvailable).toBe(true);
  });

  it('rejects unauthenticated requests with 401', async () => {
    // Register a route with a preHandler that clears request.user before the gate runs,
    // since buildTestApp's onRequest hook always sets a default user.
    app.get(
      '/test/gated-noauth/:id',
      {
        preHandler: [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (request, _reply, done) => {
            request.user = undefined as unknown as typeof request.user;
            done();
          },
          createFeatureGateMiddleware(licensingService, 'hunter_job_searches'),
        ],
      },
      () => ({ ok: true }),
    );

    const res = await app.inject({
      method: 'GET',
      url: `/test/gated-noauth/${profileId}`,
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unauthorized');
  });

  it('returns 400 when no profile ID is available', async () => {
    // Route without :id param, and user has no profileId
    app.get(
      '/test/gated-noid',
      {
        preHandler: [
          (request, _reply, done) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            request.user = { ...request.user!, profileId: undefined as any };
            done();
          },
          createFeatureGateMiddleware(licensingService, 'hunter_job_searches'),
        ],
      },
      () => ({ ok: true }),
    );

    const res = await app.inject({
      method: 'GET',
      url: '/test/gated-noid',
      headers: {
        'x-mock-user-id': profileId,
        'x-mock-roles': 'user',
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('invalid_request');
  });
});

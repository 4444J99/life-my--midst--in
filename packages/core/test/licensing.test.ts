import { describe, it, expect, beforeEach } from 'vitest';
import { LicensingService, InMemoryRateLimitStore } from '../src/licensing/licensing-service';
import type { SubscriptionTier } from '@in-midst-my-life/schema';

describe('LicensingService', () => {
  let service: LicensingService;
  let rateLimitStore: InMemoryRateLimitStore;
  let tier: SubscriptionTier = 'FREE';

  beforeEach(() => {
    rateLimitStore = new InMemoryRateLimitStore();
    const getCurrentTier = async () => tier;
    service = new LicensingService(getCurrentTier, rateLimitStore);
    tier = 'FREE'; // Reset to default
  });

  describe('canUse()', () => {
    it('returns true when quota not exceeded', async () => {
      const allowed = await service.canUse('user-1', 'hunter_job_searches');
      expect(allowed).toBe(true);
    });

    it('returns false when quota exceeded', async () => {
      // Exhaust quota (5 for FREE tier)
      for (let i = 0; i < 5; i++) {
        await service.checkAndConsume('user-1', 'hunter_job_searches');
      }

      const allowed = await service.canUse('user-1', 'hunter_job_searches');
      expect(allowed).toBe(false);
    });

    it('returns true for unlimited features in PRO tier', async () => {
      tier = 'PRO';
      const allowed = await service.canUse('user-1', 'hunter_job_searches');
      expect(allowed).toBe(true);
      
      // Even after many uses
      for (let i = 0; i < 100; i++) {
        await service.checkAndConsume('user-1', 'hunter_job_searches');
      }
      
      const stillAllowed = await service.canUse('user-1', 'hunter_job_searches');
      expect(stillAllowed).toBe(true);
    });
    
    it('returns false for features not in tier', async () => {
      // hunter_auto_apply is 0 in FREE tier
      const allowed = await service.canUse('user-1', 'hunter_auto_apply');
      expect(allowed).toBe(false);
    });
  });

  describe('checkAndConsume()', () => {
    it('returns [true, remaining] when allowed', async () => {
      const [allowed, remaining] = await service.checkAndConsume('user-1', 'hunter_job_searches');
      expect(allowed).toBe(true);
      expect(remaining).toBe(4); // 5 - 1 = 4
    });

    it('decrements quota correctly', async () => {
      await service.checkAndConsume('user-1', 'hunter_job_searches');
      await service.checkAndConsume('user-1', 'hunter_job_searches');

      const [allowed, remaining] = await service.checkAndConsume('user-1', 'hunter_job_searches');
      expect(remaining).toBe(2); // 5 - 3 = 2
    });

    it('returns [false, 0] when quota exceeded', async () => {
      // Exhaust quota
      for (let i = 0; i < 5; i++) {
        await service.checkAndConsume('user-1', 'hunter_job_searches');
      }

      const [allowed, remaining] = await service.checkAndConsume('user-1', 'hunter_job_searches');
      expect(allowed).toBe(false);
      expect(remaining).toBe(0);
    });

    it('handles multiple units consumption', async () => {
      const [allowed, remaining] = await service.checkAndConsume('user-1', 'hunter_job_searches', 3);
      expect(allowed).toBe(true);
      expect(remaining).toBe(2); // 5 - 3 = 2
    });

    it('rejects consumption exceeding remaining quota', async () => {
      const [allowed1, remaining1] = await service.checkAndConsume('user-1', 'hunter_job_searches', 4);
      expect(allowed1).toBe(true);
      expect(remaining1).toBe(1);

      // Try to consume 2 more (only 1 remaining)
      const [allowed2, remaining2] = await service.checkAndConsume('user-1', 'hunter_job_searches', 2);
      expect(allowed2).toBe(false);
      expect(remaining2).toBe(1); // Unchanged
    });

    it('isolates usage between different users', async () => {
      await service.checkAndConsume('user-1', 'hunter_job_searches');
      await service.checkAndConsume('user-1', 'hunter_job_searches');

      const [allowed, remaining] = await service.checkAndConsume('user-2', 'hunter_job_searches');
      expect(allowed).toBe(true);
      expect(remaining).toBe(4); // user-2 starts fresh
    });

    it('isolates usage between different features', async () => {
      await service.checkAndConsume('user-1', 'hunter_job_searches');
      await service.checkAndConsume('user-1', 'hunter_job_searches');

      const [allowed, remaining] = await service.checkAndConsume('user-1', 'resume_tailoring');
      expect(allowed).toBe(true);
      expect(remaining).toBe(9); // resume_tailoring has limit 10
    });
  });

  describe('getEntitlements()', () => {
    it('returns tier and features', async () => {
      const entitlements = await service.getEntitlements('user-1');

      expect(entitlements.tier).toBe('FREE');
      expect(entitlements.features.hunter_job_searches.value).toBe(5);
    });

    it('shows accurate usage counts', async () => {
      await service.checkAndConsume('user-1', 'hunter_job_searches');
      await service.checkAndConsume('user-1', 'hunter_job_searches');

      const entitlements = await service.getEntitlements('user-1');
      expect(entitlements.features.hunter_job_searches.used).toBe(2);
    });

    it('includes all features in entitlements', async () => {
      const entitlements = await service.getEntitlements('user-1');

      expect(entitlements.features.hunter_job_searches).toBeDefined();
      expect(entitlements.features.hunter_auto_apply).toBeDefined();
      expect(entitlements.features.masks_limit).toBeDefined();
      expect(entitlements.features.resume_tailoring).toBeDefined();
      expect(entitlements.features.narrative_generation).toBeDefined();
    });

    it('shows remaining quota correctly', async () => {
      await service.checkAndConsume('user-1', 'hunter_job_searches', 3);

      const entitlements = await service.getEntitlements('user-1');
      expect(entitlements.features.hunter_job_searches.used).toBe(3);
      expect(entitlements.features.hunter_job_searches.value).toBe(5);
      // remaining = value - used = 5 - 3 = 2
    });
  });

  describe('resetAllCounters()', () => {
    it('resets all usage to zero for features with resetPeriod != "never"', async () => {
      // Use some quota
      await service.checkAndConsume('user-1', 'hunter_job_searches'); // monthly
      await service.checkAndConsume('user-1', 'masks_limit'); // never

      // Reset
      await service.resetAllCounters('user-1');

      // Verify reset
      const entitlements = await service.getEntitlements('user-1');
      expect(entitlements.features.hunter_job_searches.used).toBe(0);
      expect(entitlements.features.masks_limit.used).toBe(1); // Should NOT reset "never"
    });

    it('resets multiple monthly features', async () => {
      await service.checkAndConsume('user-1', 'hunter_job_searches', 3);
      await service.checkAndConsume('user-1', 'resume_tailoring', 5);
      await service.checkAndConsume('user-1', 'narrative_generation', 2);

      await service.resetAllCounters('user-1');

      const entitlements = await service.getEntitlements('user-1');
      expect(entitlements.features.hunter_job_searches.used).toBe(0);
      expect(entitlements.features.resume_tailoring.used).toBe(0);
      expect(entitlements.features.narrative_generation.used).toBe(0);
    });

    it('allows full quota usage after reset', async () => {
      // Exhaust quota
      for (let i = 0; i < 5; i++) {
        await service.checkAndConsume('user-1', 'hunter_job_searches');
      }

      // Verify exhausted
      const [allowed1] = await service.checkAndConsume('user-1', 'hunter_job_searches');
      expect(allowed1).toBe(false);

      // Reset
      await service.resetAllCounters('user-1');

      // Should be able to use again
      const [allowed2, remaining] = await service.checkAndConsume('user-1', 'hunter_job_searches');
      expect(allowed2).toBe(true);
      expect(remaining).toBe(4);
    });
  });

  describe('InMemoryRateLimitStore', () => {
    it('tracks usage per user and feature', async () => {
      await rateLimitStore.increment('user-1', 'hunter_job_searches', 3);
      await rateLimitStore.increment('user-2', 'hunter_job_searches', 2);

      const usage1 = await rateLimitStore.getUsage('user-1', 'hunter_job_searches');
      const usage2 = await rateLimitStore.getUsage('user-2', 'hunter_job_searches');

      expect(usage1).toBe(3);
      expect(usage2).toBe(2);
    });

    it('resets usage for a feature', async () => {
      await rateLimitStore.increment('user-1', 'hunter_job_searches', 5);
      await rateLimitStore.reset('user-1', 'hunter_job_searches');

      const usage = await rateLimitStore.getUsage('user-1', 'hunter_job_searches');
      expect(usage).toBe(0);
    });

    it('returns 0 for unused features', async () => {
      const usage = await rateLimitStore.getUsage('new-user', 'hunter_job_searches');
      expect(usage).toBe(0);
    });
  });
});

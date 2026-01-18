import { buildServer } from '../src/index';
import { createProfileRepo } from '../src/repositories/profiles';
import { createMaskRepo } from '../src/repositories/masks';
import { createCvRepos } from '../src/repositories/cv';
import { createBackupRepo } from '../src/repositories/backups';
import { createJobRepo } from '../src/repositories/jobs';
import { InMemorySubscriptionRepo } from '../src/repositories/subscriptions';
import { InMemoryRateLimitStore } from '../src/repositories/rate-limits';
import { BillingService, LicensingService, type RateLimitStore } from '@in-midst-my-life/core';
import { getPermissionsForRole, UserRole } from '../src/services/auth';
import type { ProfileRepo } from '../src/repositories/profiles';
import type { JobRepo } from '../src/repositories/jobs';
import type { SubscriptionRepo } from '../src/repositories/subscriptions';

export interface TestAppOptions {
  profileRepo?: ProfileRepo;
  jobRepo?: JobRepo;
  subscriptionRepo?: SubscriptionRepo;
  rateLimitStore?: RateLimitStore;
}

export async function buildTestApp(deps: TestAppOptions = {}) {
  const profileRepo = deps.profileRepo ?? createProfileRepo({ kind: 'memory' });
  const jobRepo = deps.jobRepo ?? createJobRepo({ kind: 'memory' });
  const maskRepoSet = createMaskRepo({ kind: 'memory' });
  const cvRepos = createCvRepos({ kind: 'memory' });
  const backupRepo = createBackupRepo({ kind: 'memory' });
  const subscriptionRepo = deps.subscriptionRepo ?? new InMemorySubscriptionRepo();
  const rateLimitStore = deps.rateLimitStore ?? new InMemoryRateLimitStore();

  const licensingService = new LicensingService(
    async (profileId) => {
      const sub = await subscriptionRepo.getByProfileId(profileId);
      return sub?.tier ?? 'FREE';
    },
    rateLimitStore
  );

  const billingService = new BillingService({
    stripeSecretKey: 'sk_test_mock',
    stripePriceIds: {
      FREE: { monthly: 'free', yearly: 'free' },
      PRO: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
      ENTERPRISE: { monthly: 'price_ent_monthly', yearly: 'price_ent_yearly' },
    },
    webhookSecret: 'whsec_test',
  });

  const app = buildServer({
    profileRepo,
    jobRepo,
    maskRepo: maskRepoSet.masks,
    epochRepo: maskRepoSet.epochs,
    stageRepo: maskRepoSet.stages,
    cvRepos,
    backupRepo,
    subscriptionRepo,
    rateLimitStore,
    licensingService,
    billingService,
  });

  // Mock authentication for testing
  app.addHook('onRequest', async (request) => {
    // If we have a special header, use it to mock the user
    const mockUserId = request.headers['x-mock-user-id'] as string;
    if (mockUserId) {
      const roles = (request.headers['x-mock-roles'] as string || 'user').split(',') as UserRole[];
      const permissions = roles.flatMap(role => getPermissionsForRole(role));
      
      (request as any).user = {
        sub: mockUserId,
        profileId: mockUserId,
        email: 'test@example.com',
        roles,
        permissions,
      };
    } else {
      // Default mock user for tests that don't care about specific IDs
      const roles = ['user', 'admin'] as UserRole[];
      const permissions = roles.flatMap(role => getPermissionsForRole(role));
      
      (request as any).user = {
        sub: '00000000-0000-0000-0000-000000000001',
        profileId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        roles,
        permissions,
      };
    }
  });

  return app;
}

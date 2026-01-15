/**
 * LicensingService
 * Manages feature entitlements and rate limits for subscription tiers
 *
 * Core Philosophy: "Gate the Automation, not the Data"
 * Users always own their data (CV, Masks), but autonomous agents (Hunter) are metered.
 */

import type {
  SubscriptionTier,
  FeatureKey,
  Entitlement,
  PlanDefinition
} from "@in-midst-my-life/schema";

/**
 * Plan definitions for each subscription tier
 * These define limits, reset periods, and Stripe price IDs
 */
export const PLAN_DEFINITIONS: Record<SubscriptionTier, PlanDefinition> = {
  FREE: {
    tier: "FREE",
    name: "Free Tier",
    features: {
      hunter_job_searches: { limit: 5, resetPeriod: "monthly" },
      hunter_auto_apply: { limit: 0, resetPeriod: "never" },
      masks_limit: { limit: 3, resetPeriod: "never" },
      resume_tailoring: { limit: 10, resetPeriod: "monthly" },
      narrative_generation: { limit: 5, resetPeriod: "monthly" },
    },
    stripePriceId: {
      month: "free",
      year: "free",
    },
  },
  PRO: {
    tier: "PRO",
    name: "Professional",
    features: {
      hunter_job_searches: { limit: -1, resetPeriod: "never" }, // Unlimited (fair use: 100/day)
      hunter_auto_apply: { limit: 1, resetPeriod: "never" },
      masks_limit: { limit: 16, resetPeriod: "never" },
      resume_tailoring: { limit: -1, resetPeriod: "never" },
      narrative_generation: { limit: -1, resetPeriod: "never" },
    },
    stripePriceId: {
      month: "price_pro_monthly",
      year: "price_pro_yearly",
    },
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Enterprise",
    features: {
      hunter_job_searches: { limit: -1, resetPeriod: "never" },
      hunter_auto_apply: { limit: 1, resetPeriod: "never" },
      masks_limit: { limit: -1, resetPeriod: "never" },
      resume_tailoring: { limit: -1, resetPeriod: "never" },
      narrative_generation: { limit: -1, resetPeriod: "never" },
    },
    stripePriceId: {
      month: "price_enterprise_custom",
      year: "price_enterprise_custom",
    },
  },
};

/**
 * Interface for rate limit storage backend
 * Can be implemented with Redis, Database, or In-Memory storage
 */
export interface RateLimitStore {
  /**
   * Get current usage for a feature in the current period
   */
  getUsage(profileId: string, feature: FeatureKey): Promise<number>;

  /**
   * Increment usage counter
   */
  increment(profileId: string, feature: FeatureKey, by: number): Promise<number>;

  /**
   * Reset usage counter for the period
   */
  reset(profileId: string, feature: FeatureKey): Promise<void>;

  /**
   * Get reset time for a feature's period
   */
  getResetTime(profileId: string, feature: FeatureKey): Promise<Date | null>;
}

/**
 * LicensingService: Core entitlement enforcement
 *
 * Responsibilities:
 * 1. Check if a user is allowed to use a feature
 * 2. Consume feature quota (decrement remaining)
 * 3. Handle rate limit resets
 * 4. Provide entitlement information for UI
 */
export class LicensingService {
  constructor(
    private currentTier: (profileId: string) => Promise<SubscriptionTier>,
    private rateLimitStore: RateLimitStore
  ) {}

  /**
   * Check if a user can use a feature
   * Does NOT consume quota - use checkAndConsume for that
   */
  async canUse(profileId: string, feature: FeatureKey): Promise<boolean> {
    const tier = await this.currentTier(profileId);
    const plan = PLAN_DEFINITIONS[tier];
    const featureLimit = plan.features[feature];

    if (!featureLimit) {
      return false; // Feature not available in this tier
    }

    // Unlimited features are always available
    if (featureLimit.limit === -1) {
      return true;
    }

    // Boolean features (0 or 1)
    if (featureLimit.limit === 0) {
      return false;
    }

    // Count-based features: check remaining quota
    const used = await this.rateLimitStore.getUsage(profileId, feature);
    return used < featureLimit.limit;
  }

  /**
   * Check if user can use a feature, and if so, consume 1 unit of quota
   * Returns: [allowed, remaining]
   */
  async checkAndConsume(
    profileId: string,
    feature: FeatureKey,
    amount: number = 1
  ): Promise<[boolean, number]> {
    const tier = await this.currentTier(profileId);
    const plan = PLAN_DEFINITIONS[tier];
    const featureLimit = plan.features[feature];

    if (!featureLimit) {
      return [false, 0]; // Feature not available
    }

    // Unlimited features are always allowed
    if (featureLimit.limit === -1) {
      // Still track usage for analytics, but don't fail
      await this.rateLimitStore.increment(profileId, feature, amount);
      return [true, -1];
    }

    // Boolean features
    if (featureLimit.limit === 0) {
      return [false, 0];
    }

    // Count-based: check and consume
    const used = await this.rateLimitStore.getUsage(profileId, feature);
    const remaining = featureLimit.limit - used;

    if (remaining < amount) {
      // Not enough quota
      return [false, remaining];
    }

    // Consume quota
    const newUsed = await this.rateLimitStore.increment(
      profileId,
      feature,
      amount
    );
    return [true, featureLimit.limit - newUsed];
  }

  /**
   * Get detailed entitlement info for a user (for UI display)
   */
  async getEntitlements(profileId: string): Promise<{
    tier: SubscriptionTier;
    features: Record<FeatureKey, Entitlement>;
  }> {
    const tier = await this.currentTier(profileId);
    const plan = PLAN_DEFINITIONS[tier];
    const features: Record<FeatureKey, Entitlement> = {} as any;

    for (const [key, featureLimit] of Object.entries(plan.features)) {
      const feature = key as FeatureKey;
      const used = await this.rateLimitStore.getUsage(profileId, feature);

      features[feature] = {
        feature,
        value: featureLimit.limit,
        resetPeriod: featureLimit.resetPeriod,
        used,
      };
    }

    return { tier, features };
  }

  /**
   * Reset all counters for a user (called at period boundary)
   */
  async resetAllCounters(profileId: string): Promise<void> {
    const tier = await this.currentTier(profileId);
    const plan = PLAN_DEFINITIONS[tier];

    for (const key of Object.keys(plan.features) as FeatureKey[]) {
      const featureLimit = plan.features[key];
      if (featureLimit && featureLimit.resetPeriod !== "never") {
        await this.rateLimitStore.reset(profileId, key);
      }
    }
  }

  /**
   * Get plan definition for a tier
   */
  getPlanDefinition(tier: SubscriptionTier): PlanDefinition {
    return PLAN_DEFINITIONS[tier];
  }
}

/**
 * Simple In-Memory rate limit store (for development/testing)
 * NOT suitable for production - data is lost on restart
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private usage = new Map<string, number>(); // Key: "${profileId}:${feature}"
  private resetTimes = new Map<string, Date>();

  private key(profileId: string, feature: FeatureKey): string {
    return `${profileId}:${feature}`;
  }

  async getUsage(profileId: string, feature: FeatureKey): Promise<number> {
    return this.usage.get(this.key(profileId, feature)) ?? 0;
  }

  async increment(profileId: string, feature: FeatureKey, by: number): Promise<number> {
    const k = this.key(profileId, feature);
    const current = this.usage.get(k) ?? 0;
    const newValue = current + by;
    this.usage.set(k, newValue);
    return newValue;
  }

  async reset(profileId: string, feature: FeatureKey): Promise<void> {
    this.usage.delete(this.key(profileId, feature));
  }

  async getResetTime(profileId: string, feature: FeatureKey): Promise<Date | null> {
    return this.resetTimes.get(this.key(profileId, feature)) ?? null;
  }
}

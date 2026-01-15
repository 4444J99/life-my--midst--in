import { z } from "zod";

export const SubscriptionTierSchema = z.enum(["FREE", "PRO", "ENTERPRISE"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTierSchema>;

export const SubscriptionStatusSchema = z.enum([
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "trialing",
  "unpaid",
  "paused"
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const BillingIntervalSchema = z.enum(["month", "year"]);
export type BillingInterval = z.infer<typeof BillingIntervalSchema>;

// Core Subscription Record
export const SubscriptionSchema = z.object({
  id: z.string(), // Internal UUID
  profileId: z.string().uuid(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string(),
  status: SubscriptionStatusSchema,
  tier: SubscriptionTierSchema,
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

// Feature Definition
export const FeatureKeySchema = z.enum([
  "hunter_job_searches",      // Count per month/day
  "hunter_auto_apply",        // Boolean
  "masks_limit",              // Count (e.g. 3 vs 16)
  "resume_tailoring",         // Count
  "narrative_generation"      // Count
]);
export type FeatureKey = z.infer<typeof FeatureKeySchema>;

// Entitlement (What the user actually has)
export const EntitlementSchema = z.object({
  feature: FeatureKeySchema,
  value: z.number(), // -1 for unlimited, 0 for false/none, >0 for limit
  resetPeriod: z.enum(["daily", "monthly", "never"]).optional(),
  used: z.number().default(0), // Current usage in period
});
export type Entitlement = z.infer<typeof EntitlementSchema>;

// Plan Definition (Configuration)
export const PlanDefinitionSchema = z.object({
  tier: SubscriptionTierSchema,
  name: z.string(),
  features: z.record(FeatureKeySchema, z.object({
    limit: z.number(),
    resetPeriod: z.enum(["daily", "monthly", "never"])
  })),
  stripePriceId: z.object({
    month: z.string(),
    year: z.string()
  })
});
export type PlanDefinition = z.infer<typeof PlanDefinitionSchema>;

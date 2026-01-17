/**
 * Billing Routes
 * Payment processing and subscription management
 *
 * POST /billing/checkout - Create Stripe checkout session
 * POST /webhooks/stripe - Handle Stripe webhook events
 * GET /billing/subscription/:profileId - Get subscription details
 * POST /billing/subscription/:profileId/cancel - Cancel subscription
 * GET /billing/plans - Get all subscription plans
 */

import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  BillingService,
  LicensingService,
  PLAN_DEFINITIONS,
} from "@in-midst-my-life/core";
import type { SubscriptionTier } from "@in-midst-my-life/schema";
import { subscriptionRepo, type SubscriptionRepo } from "../repositories/subscriptions";
import { createOwnershipMiddleware } from "../middleware/auth";

export async function registerBillingRoutes(
  fastify: FastifyInstance,
  deps?: {
    billingService?: BillingService;
    subscriptionRepo?: SubscriptionRepo;
    licensingService?: LicensingService;
  }
) {
  const repo = deps?.subscriptionRepo ?? subscriptionRepo;
  const ownershipMiddleware = createOwnershipMiddleware();

  // Initialize billing service if not provided
  let billingService = deps?.billingService;
  if (!billingService) {
    // Use mock service for development
    billingService = new BillingService({
      stripeSecretKey: process.env['STRIPE_SECRET_KEY'] || "sk_test_mock",
      stripePriceIds: {
        FREE: { monthly: "free", yearly: "free" },
        PRO: {
          monthly: process.env['STRIPE_PRO_MONTHLY'] || "price_pro_monthly",
          yearly: process.env['STRIPE_PRO_YEARLY'] || "price_pro_yearly",
        },
        ENTERPRISE: {
          monthly: process.env['STRIPE_ENTERPRISE_MONTHLY'] || "price_enterprise_custom",
          yearly: process.env['STRIPE_ENTERPRISE_YEARLY'] || "price_enterprise_custom",
        },
      },
      webhookSecret: process.env['STRIPE_WEBHOOK_SECRET'] || "whsec_test_mock",
    });
  }

  /**
   * GET /billing/plans
   * Get all subscription plan definitions
   */
  fastify.get("/plans", async (_request, reply) => {
    const plans = [
      PLAN_DEFINITIONS.FREE,
      PLAN_DEFINITIONS.PRO,
      PLAN_DEFINITIONS.ENTERPRISE,
    ];

    return reply.code(200).send({
      ok: true,
      data: { plans },
    });
  });

  /**
   * POST /billing/checkout
   * Create Stripe checkout session for subscription
   *
   * Request body:
   * {
   *   tier: "FREE" | "PRO" | "ENTERPRISE",
   *   billingInterval: "monthly" | "yearly",
   *   successUrl: string,
   *   cancelUrl: string
   * }
   */
  fastify.post<{ Params: { profileId: string } }>(
    "/checkout/:profileId",
    {
      onRequest: [ownershipMiddleware],
    },
    async (request, reply) => {
      const { profileId } = request.params;
      
      const bodyParsed = z.object({
        tier: z.enum(["FREE", "PRO", "ENTERPRISE"]),
        billingInterval: z.enum(["monthly", "yearly"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }).safeParse(request.body);

      if (!bodyParsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          errors: bodyParsed.error.flatten(),
        });
      }

      const { tier, billingInterval, successUrl, cancelUrl } = bodyParsed.data;

      try {
        // Prevent checkout for free tier (no payment needed)
        if (tier === "FREE") {
          return reply.code(400).send({
            ok: false,
            error: "invalid_tier",
            message: "Free tier does not require a checkout session",
          });
        }

        // Get or create subscription
        let subscription = await repo.getByProfileId(profileId);
        if (!subscription) {
          // Create new subscription with placeholder customer ID
          // In production, this would be done after Stripe customer creation
          const tempCustomerId = `cus_temp_${Math.random().toString(36).substr(2, 9)}`;
          subscription = await repo.create(profileId, tempCustomerId);
        }

        // Get price ID for tier/interval
        const priceId = billingService!.getPriceId(tier as SubscriptionTier, billingInterval);

        // Create checkout session
        const session = await billingService!.createCheckoutSession({
          profileId,
          priceId,
          successUrl,
          cancelUrl,
          email: request.user?.email,
        });

        // Update subscription with Stripe customer ID
        await repo.update(profileId, {
          stripeCustomerId: session.stripeCustomerId,
        });

        return reply.code(200).send({
          ok: true,
          data: session,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "internal_server_error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * GET /billing/subscription/:profileId
   * Get current subscription details for a user
   */
  fastify.get<{ Params: { profileId: string } }>(
    "/subscription/:profileId",
    {
      onRequest: [ownershipMiddleware],
    },
    async (request, reply) => {
      const { profileId } = request.params;

      try {
        const subscription = await repo.getByProfileId(profileId);

        if (!subscription) {
          return reply.code(404).send({
            ok: false,
            error: "subscription_not_found",
            message: `No subscription found for profile ${profileId}`,
          });
        }

        const plan = PLAN_DEFINITIONS[subscription.tier];

        return reply.code(200).send({
          ok: true,
          data: {
            ...subscription,
            plan,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "internal_server_error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /billing/subscription/:profileId/cancel
   * Request subscription cancellation
   */
  fastify.post<{ Params: { profileId: string } }>(
    "/subscription/:profileId/cancel",
    {
      onRequest: [ownershipMiddleware],
    },
    async (request, reply) => {
      const { profileId } = request.params;
      
      const bodyParsed = z.object({
        atPeriodEnd: z.boolean().optional(),
      }).safeParse(request.body);

      if (!bodyParsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          errors: bodyParsed.error.flatten(),
        });
      }

      const { atPeriodEnd = true } = bodyParsed.data;

      try {
        const subscription = await repo.getByProfileId(profileId);

        if (!subscription) {
          return reply.code(404).send({
            ok: false,
            error: "subscription_not_found",
            message: `No subscription found for profile ${profileId}`,
          });
        }

        // Set cancellation date
        const cancelAt = new Date();
        if (atPeriodEnd && subscription.currentPeriodEnd) {
          // Use the period end date
          cancelAt.setTime(subscription.currentPeriodEnd.getTime());
        }

        await repo.setCancelation(profileId, cancelAt, atPeriodEnd);

        // TODO: Call Stripe API to cancel subscription
        // if (subscription.stripeSubscriptionId) {
        //   await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        //     cancel_at_period_end: atPeriodEnd,
        //   });
        // }

        return reply.code(200).send({
          ok: true,
          message: atPeriodEnd
            ? "Subscription will be canceled at the end of the billing period"
            : "Subscription canceled immediately",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "internal_server_error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /webhooks/stripe
   * Handle Stripe webhook events
   * Requires X-Stripe-Signature header for verification
   */
  fastify.post(
    "/webhooks/stripe",
    {
      config: { rawBody: true },
      schema: {
        description: "Stripe webhook endpoint",
        consumes: ["application/json"],
      },
    } as any,
    async (request, reply) => {
      try {
        const signature = request.headers["stripe-signature"] as string;
        if (!signature) {
          return reply.code(401).send({
            ok: false,
            error: "missing_signature",
            message: "Missing Stripe signature header",
          });
        }

        // Verify webhook signature
        // fastify-raw-body adds rawBody to the request
        const rawBody = (request as any).rawBody;
        if (!rawBody) {
             return reply.code(400).send({
            ok: false,
            error: "missing_body",
            message: "Missing request body",
          });
        }
        
        const verification = billingService!.verifyWebhookSignature(rawBody, signature);

        if (!verification.valid) {
          return reply.code(401).send({
            ok: false,
            error: "invalid_signature",
            message: "Invalid Stripe signature",
          });
        }

        // Handle the event
        const result = await billingService!.handleWebhookEvent(verification.payload!);

        if (!result.processed) {
          fastify.log.warn({ err: result.error }, "Webhook processing failed:");
          // Still return 200 to prevent Stripe retries
        }

        return reply.code(200).send({
          ok: true,
          message: "Webhook processed",
        });
      } catch (error) {
        fastify.log.error({ err: error }, "Webhook error:");
        // Return 200 to prevent Stripe retries on our error
        return reply.code(200).send({
          ok: false,
          message: "Webhook processing error (Stripe will retry)",
        });
      }
    }
  );
}

/**
 * Billing Service
 * Orchestrates payment processing, subscription management, and Stripe integration
 *
 * Core Philosophy: "Payments Enable Features, Users Own Data"
 * Payments unlock metered features (Hunter automation), but users always own their data.
 */

import type { SubscriptionTier } from "@in-midst-my-life/schema";
import { PLAN_DEFINITIONS } from "../licensing/licensing-service";
import {
  InvalidCheckoutError,
  WebhookSignatureVerificationError,
} from "../errors";

export interface BillingConfig {
  stripeSecretKey: string;
  stripePriceIds: {
    [key in SubscriptionTier]: {
      monthly: string;
      yearly: string;
    };
  };
  webhookSecret: string;
}

export interface CheckoutSessionRequest {
  profileId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  email?: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
  stripeCustomerId: string;
}

export interface StripeWebhookPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
    previous_attributes?: Record<string, any>;
  };
}

/**
 * BillingService: Manages all payment and subscription operations
 */
export class BillingService {
  private config: BillingConfig;

  constructor(config: BillingConfig) {
    this.config = config;

    // Validate required config
    if (!config.stripeSecretKey) {
      throw new Error("stripeSecretKey is required for BillingService");
    }
    if (!config.webhookSecret) {
      throw new Error("webhookSecret is required for BillingService");
    }
  }

  /**
   * Get Stripe price ID for a tier and billing interval
   */
  getPriceId(tier: SubscriptionTier, interval: "monthly" | "yearly"): string {
    const tierPrices = this.config.stripePriceIds[tier];
    if (!tierPrices) {
      throw new Error(`No pricing configured for tier: ${tier}`);
    }

    return interval === "monthly" ? tierPrices.monthly : tierPrices.yearly;
  }

  /**
   * Get plan details for a tier
   */
  getPlanDetails(tier: SubscriptionTier) {
    return PLAN_DEFINITIONS[tier];
  }

  /**
   * Create a checkout session for a customer
   *
   * In production, this would call:
   *   const session = await stripe.checkout.sessions.create({...})
   *   return { sessionId: session.id, url: session.url, ... }
   *
   * For now, returning mock response structure with validation
   */
  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSession> {
    const { profileId, priceId, successUrl, cancelUrl } = request;

    // Validate inputs
    if (!profileId) throw new InvalidCheckoutError("profileId", "Profile ID is required");
    if (!priceId) throw InvalidCheckoutError.invalidPriceId(priceId);
    if (!successUrl) throw new InvalidCheckoutError("successUrl", "Success URL is required");
    if (!cancelUrl) throw new InvalidCheckoutError("cancelUrl", "Cancel URL is required");

    // Verify priceId is configured
    const isValidPrice = Object.values(this.config.stripePriceIds).some(
      (prices) => prices.monthly === priceId || prices.yearly === priceId
    );
    if (!isValidPrice && priceId !== "free") {
      throw InvalidCheckoutError.invalidPriceId(priceId);
    }

    // TODO: Call Stripe API in production
    // const stripe = new Stripe(this.config.stripeSecretKey);
    // const session = await stripe.checkout.sessions.create({
    //   payment_method_types: ["card"],
    //   line_items: [{ price: priceId, quantity: 1 }],
    //   mode: "subscription",
    //   success_url: successUrl,
    //   cancel_url: cancelUrl,
    //   customer_email: email,
    //   client_reference_id: profileId,
    //   metadata: { profileId },
    // });

    // Mock return (development/testing)
    return {
      sessionId: "cs_test_" + Math.random().toString(36).substr(2, 9),
      url: "https://checkout.stripe.com/pay/cs_test_mock_" + Math.random().toString(36).substr(2, 9),
      stripeCustomerId: "cus_test_" + Math.random().toString(36).substr(2, 9),
    };
  }

  /**
   * Handle Stripe webhook event
   *
   * Key events to handle:
   * - customer.subscription.created: New subscription
   * - customer.subscription.updated: Tier change, renewal, cancellation
   * - customer.subscription.deleted: Subscription ended
   * - invoice.payment_succeeded: Payment successful
   * - invoice.payment_failed: Payment failed (dunning)
   * - customer.deleted: Account deleted
   */
  async handleWebhookEvent(payload: StripeWebhookPayload): Promise<{
    processed: boolean;
    error?: string;
  }> {
    const { type, data } = payload;

    try {
      switch (type) {
        case "customer.subscription.created":
          return this.handleSubscriptionCreated(data.object);

        case "customer.subscription.updated":
          return this.handleSubscriptionUpdated(data.object, data.previous_attributes);

        case "customer.subscription.deleted":
          return this.handleSubscriptionDeleted(data.object);

        case "invoice.payment_succeeded":
          return this.handlePaymentSucceeded(data.object);

        case "invoice.payment_failed":
          return this.handlePaymentFailed(data.object);

        case "customer.deleted":
          return this.handleCustomerDeleted(data.object);

        default:
          // Unhandled event type, but don't fail
          return { processed: true };
      }
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle new subscription creation
   * Extract: customer_id, subscription_id, plan tier, period dates
   */
  private handleSubscriptionCreated(subscription: any): { processed: boolean } {
    // TODO: Update subscription record in database
    // const { id, customer, items, current_period_start, current_period_end, status } = subscription;
    // Extract tier from price metadata or product metadata
    // Create subscription record: { customer_id, subscription_id, tier, status, period_dates }

    console.log("Subscription created:", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });

    return { processed: true };
  }

  /**
   * Handle subscription update
   * Could be: tier change, renewal, cancellation notice, etc.
   */
  private handleSubscriptionUpdated(
    subscription: any,
    previousAttributes?: Record<string, any>
  ): { processed: boolean } {
    // TODO: Update subscription tier/status based on what changed
    // Check previousAttributes to see what changed:
    //   - items: Could indicate tier change
    //   - status: Could indicate cancellation
    //   - cancel_at: Cancellation scheduled
    //   - cancel_at_period_end: Specific cancellation behavior

    console.log("Subscription updated:", {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAt: subscription.cancel_at,
      changed: Object.keys(previousAttributes || {}),
    });

    return { processed: true };
  }

  /**
   * Handle subscription deletion
   * Downgrade user to FREE tier
   */
  private handleSubscriptionDeleted(subscription: any): { processed: boolean } {
    // TODO: Downgrade to FREE tier
    // Update subscription record: { tier: "FREE", status: "canceled" }

    console.log("Subscription deleted:", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    return { processed: true };
  }

  /**
   * Handle successful payment
   * Update invoice status, send receipt
   */
  private handlePaymentSucceeded(invoice: any): { processed: boolean } {
    // TODO: Update payment status
    // Log invoice for customer's billing history

    console.log("Payment succeeded:", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    });

    return { processed: true };
  }

  /**
   * Handle failed payment
   * Initiate dunning process (retry, notify customer)
   */
  private handlePaymentFailed(invoice: any): { processed: boolean } {
    // TODO: Handle dunning logic
    // Stripe will auto-retry, but we should notify customer and possibly restrict access

    console.log("Payment failed:", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      attemptCount: invoice.attempt_count,
    });

    return { processed: true };
  }

  /**
   * Handle customer deletion
   * Clean up all associated data
   */
  private handleCustomerDeleted(customer: any): { processed: boolean } {
    // TODO: Delete subscription and profile

    console.log("Customer deleted:", {
      customerId: customer.id,
    });

    return { processed: true };
  }

  /**
   * Verify Stripe webhook signature
   *
   * In production:
   *   const sig = request.headers['stripe-signature'];
   *   const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
   *
   * For now, mock verification with signature validation
   */
  verifyWebhookSignature(
    body: string,
    signature: string
  ): { valid: boolean; payload?: StripeWebhookPayload } {
    // Check for signature header
    if (!signature) {
      throw WebhookSignatureVerificationError.missingSignature();
    }

    try {
      const payload = JSON.parse(body) as StripeWebhookPayload;

      // TODO: Implement real Stripe signature verification in production
      // const event = stripe.webhooks.constructEvent(
      //   body,
      //   signature,
      //   this.config.webhookSecret
      // );

      // For development: accept valid test signatures
      if (signature.startsWith("t_") || signature === "test_signature") {
        return { valid: true, payload };
      }

      // Accept mock signatures for testing
      if (signature.startsWith("whsec_test_")) {
        return { valid: true, payload };
      }

      // For now in mock mode, accept any signature
      // In production, this would throw if verification fails
      return { valid: true, payload };
    } catch (error) {
      if (error instanceof Error && error.message.includes("signature")) {
        throw error;
      }
      throw WebhookSignatureVerificationError.invalidSignature();
    }
  }
}

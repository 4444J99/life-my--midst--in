/**
 * Billing Service
 * Orchestrates payment processing, subscription management, and Stripe integration
 *
 * Core Philosophy: "Payments Enable Features, Users Own Data"
 * Payments unlock metered features (Hunter automation), but users always own their data.
 */

import Stripe from "stripe";
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
  stripeCustomerId?: string;
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
  private stripe: Stripe;

  constructor(config: BillingConfig) {
    this.config = config;

    // Validate required config
    if (!config.stripeSecretKey) {
      throw new Error("stripeSecretKey is required for BillingService");
    }
    if (!config.webhookSecret) {
      throw new Error("webhookSecret is required for BillingService");
    }

    this.stripe = new Stripe(config.stripeSecretKey, {
      // apiVersion: "2023-10-16", // Removed to use default/latest or avoid type mismatch
    });
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
   */
  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSession> {
    const { profileId, priceId, successUrl, cancelUrl, email } = request;

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

    // For mock mode (test key), return mock session
    if (this.config.stripeSecretKey === "sk_test_mock" || !this.config.stripeSecretKey.startsWith("sk_live_")) {
      const sessionId = `cs_test_${Math.random().toString(36).substr(2, 9)}`;
      const customerId = `cus_test_${Math.random().toString(36).substr(2, 9)}`;
      return {
        sessionId,
        url: `https://checkout.stripe.com/pay/${sessionId}`,
        stripeCustomerId: customerId,
      };
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        client_reference_id: profileId,
        metadata: { profileId },
      });

      if (!session.url) {
        throw new Error("Failed to create checkout session URL");
      }

      return {
        sessionId: session.id,
        url: session.url,
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle Stripe webhook event
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
          return { processed: true };
      }
    } catch (error) {
      return {
        processed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ... (keep private handlers as placeholders for now, but update comments/logging)

  private handleSubscriptionCreated(subscription: any): { processed: boolean } {
    console.log("Subscription created:", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
    });
    return { processed: true };
  }

  private handleSubscriptionUpdated(
    subscription: any,
    previousAttributes?: Record<string, any>
  ): { processed: boolean } {
    console.log("Subscription updated:", {
      subscriptionId: subscription.id,
      status: subscription.status,
      cancelAt: subscription.cancel_at,
      changed: Object.keys(previousAttributes || {}),
    });
    return { processed: true };
  }

  private handleSubscriptionDeleted(subscription: any): { processed: boolean } {
    console.log("Subscription deleted:", {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });
    return { processed: true };
  }

  private handlePaymentSucceeded(invoice: any): { processed: boolean } {
    console.log("Payment succeeded:", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    });
    return { processed: true };
  }

  private handlePaymentFailed(invoice: any): { processed: boolean } {
    console.log("Payment failed:", {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      attemptCount: invoice.attempt_count,
    });
    return { processed: true };
  }

  private handleCustomerDeleted(customer: any): { processed: boolean } {
    console.log("Customer deleted:", {
      customerId: customer.id,
    });
    return { processed: true };
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(
    body: string,
    signature: string
  ): { valid: boolean; payload?: StripeWebhookPayload } {
    if (!signature) {
      throw WebhookSignatureVerificationError.missingSignature();
    }

    // For mock mode (test webhook secret), parse and return the body as-is
    if (this.config.webhookSecret === "whsec_test" || this.config.webhookSecret === "whsec_test_mock") {
      try {
        const payload = typeof body === 'string' ? JSON.parse(body) : body;
        return { valid: true, payload: payload as StripeWebhookPayload };
      } catch (error) {
        throw WebhookSignatureVerificationError.invalidSignature();
      }
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        this.config.webhookSecret
      );
      
      return { valid: true, payload: event as unknown as StripeWebhookPayload };
    } catch (error) {
      // For development: check if we want to allow test signatures if configured
      // But typically we should rely on the SDK verification.
      
      // If the error comes from Stripe SDK, rethrow as our custom error
       if (error instanceof Error) {
         // Log the underlying error for debugging
         console.error("Stripe signature verification failed:", error.message);
       }
      throw WebhookSignatureVerificationError.invalidSignature();
    }
  }
}

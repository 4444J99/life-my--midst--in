export class AppError extends Error {
  public readonly code: string;
  public statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code = "INTERNAL_ERROR", statusCode = 500, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    // Restore prototype chain for instance checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RetryableError extends AppError {
  constructor(message: string, code = "TRANSIENT_ERROR", context?: Record<string, unknown>) {
    super(message, code, 503, context);
  }
}

export class FatalError extends AppError {
  constructor(message: string, code = "FATAL_ERROR", context?: Record<string, unknown>) {
    super(message, code, 400, context);
  }
}

export class RateLimitError extends RetryableError {
  public readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number, context?: Record<string, unknown>) {
    super(message, "RATE_LIMIT_EXCEEDED", context);
    this.retryAfterMs = retryAfterMs;
    this.statusCode = 429;
  }
}

export class NotFoundError extends FatalError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NOT_FOUND", context);
    this.statusCode = 404;
  }
}

export class ValidationError extends FatalError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", context);
    this.statusCode = 400;
  }
}

/**
 * Billing and Licensing specific errors
 */

export class QuotaExceededError extends AppError {
  constructor(
    public feature: string,
    public limit: number,
    public used: number,
    context?: Record<string, unknown>
  ) {
    super(
      `Quota exceeded for ${feature}. Used ${used}/${limit}.`,
      "QUOTA_EXCEEDED",
      403,
      context
    );
  }
}

export class FeatureNotAvailableError extends AppError {
  constructor(feature: string, tier: string, context?: Record<string, unknown>) {
    super(
      `Feature "${feature}" is not available in ${tier} tier.`,
      "FEATURE_NOT_AVAILABLE",
      403,
      context
    );
  }
}

export class SubscriptionNotFoundError extends NotFoundError {
  constructor(profileId: string) {
    super(`Subscription not found for profile ${profileId}`, { profileId });
  }
}

export class StripeIntegrationError extends AppError {
  constructor(message: string, public stripeCode?: string, context?: Record<string, unknown>) {
    super(
      `Stripe error: ${message}`,
      "STRIPE_ERROR",
      500,
      { stripeCode, ...context }
    );
  }

  static cardDeclined(declineCode?: string): StripeIntegrationError {
    return new StripeIntegrationError(
      "Payment card was declined",
      declineCode || "generic_decline"
    );
  }

  static webhookError(reason: string): StripeIntegrationError {
    return new StripeIntegrationError(
      `Webhook processing failed: ${reason}`,
      "webhook_error"
    );
  }
}

export class WebhookSignatureVerificationError extends AppError {
  constructor(reason: string = "Invalid or missing signature") {
    super(reason, "WEBHOOK_SIGNATURE_VERIFICATION_FAILED", 401, { reason });
  }

  static missingSignature(): WebhookSignatureVerificationError {
    return new WebhookSignatureVerificationError("Webhook signature header is missing");
  }

  static invalidSignature(): WebhookSignatureVerificationError {
    return new WebhookSignatureVerificationError("Webhook signature verification failed");
  }
}

export class InvalidCheckoutError extends ValidationError {
  constructor(field: string, reason: string, context?: Record<string, unknown>) {
    super(`Invalid checkout: ${field} - ${reason}`, { field, reason, ...context });
  }

  static invalidTier(tier: string): InvalidCheckoutError {
    return new InvalidCheckoutError("tier", `Tier "${tier}" is not eligible for checkout`);
  }

  static invalidPriceId(priceId: string): InvalidCheckoutError {
    return new InvalidCheckoutError(
      "priceId",
      `Price ID "${priceId}" is not configured`
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(action: string, resource: string, reason?: string, context?: Record<string, unknown>) {
    super(
      `Not authorized to ${action} ${resource}${reason ? `: ${reason}` : ""}`,
      "UNAUTHORIZED",
      403,
      { action, resource, reason, ...context }
    );
  }

  static notOwner(resourceId: string): AuthorizationError {
    return new AuthorizationError("access", resourceId, "You do not own this resource");
  }

  static adminOnly(action: string): AuthorizationError {
    return new AuthorizationError(action, "this resource", "Admin access required");
  }
}

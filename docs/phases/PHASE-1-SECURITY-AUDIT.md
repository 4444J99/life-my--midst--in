# Phase 1 Security Audit Checklist

## 🔐 Authentication & Authorization

- [ ] **Ownership verification**: Users can only create checkouts for their own profiles
  - Implemented via: `createOwnershipMiddleware()` in billing routes
  - Test: Try to checkout for another user's profile → 403

- [ ] **Admin authorization**: Only admins can access `/admin/licensing/*` endpoints
  - Implemented via: `requireAdmin()` middleware (TODO: verify this exists)
  - Test: Try to access admin endpoints without admin role → 403

- [ ] **Session validation**: All API calls require valid session
  - Implemented via: Fastify auth middleware
  - Test: Call any endpoint without session → 401

## 💳 Payment Security

- [ ] **Webhook signature verification**: Stripe webhooks are verified before processing
  - Implemented via: `verifyWebhookSignature()` in BillingService
  - Test: Send webhook with invalid signature → 401
  - Test: Send webhook with valid test signature → 200

- [ ] **Idempotency**: Duplicate webhook events don't cause double-charges
  - Implemented via: `stripe_events` table with UNIQUE constraint on `stripe_event_id`
  - Test: Send same webhook event twice → only processed once

- [ ] **PII minimization**: Only store necessary customer data
  - ✅ Only store: stripe_customer_id, stripe_subscription_id
  - ❌ Do NOT store: full name, address, payment method details (Stripe stores these)

- [ ] **Checkout metadata sanitization**: Profile IDs are validated UUIDs
  - Implemented via: Zod schema validation
  - Test: Send checkout with invalid UUID → 400

## 🚫 Rate Limiting & Quota Enforcement

- [ ] **Atomic quota checks**: Concurrent requests don't exceed limits
  - Implemented via: PostgreSQL `ON CONFLICT` for atomic increments
  - Test: Send 10 concurrent requests → exactly 5 succeed (FREE tier limit)

- [ ] **Quota bypass prevention**: Users can't bypass quotas by changing tier manually
  - Protection: Tier is read from `subscriptions` table, not user input
  - Test: Try to send tier in request body → ignored

- [ ] **Rate limit store security**: Can't manipulate usage counts directly
  - Protection: Only `LicensingService` has write access to `RateLimitStore`
  - Test: Direct database writes to `rate_limits` table → overwritten by service

## 🔒 Data Protection

- [ ] **Subscription data isolation**: Users can't see other users' subscriptions
  - Implemented via: `WHERE profile_id = $1` in all queries
  - Test: Try to fetch subscription for another user → 404

- [ ] **SQL injection prevention**: All queries use parameterized statements
  - ✅ All queries use `$1, $2, ...` placeholders
  - ❌ No string concatenation in SQL queries

- [ ] **Sensitive data logging**: No PII or secrets in logs
  - ✅ Only log: profileId, tier, feature names
  - ❌ Do NOT log: email, stripe_customer_id (except in debug mode)

## 🌐 API Security

- [ ] **CORS configuration**: Only allow frontend domain
  - TODO: Configure CORS in Fastify
  - Allowed origins: https://yourdomain.com (production)

- [ ] **HTTPS only**: All API calls use HTTPS in production
  - TODO: Configure reverse proxy (nginx/CloudFlare)
  - Test: Try HTTP request → 301 redirect to HTTPS

- [ ] **Rate limiting at API gateway**: Prevent DDoS
  - TODO: Configure rate limiting (100 req/min per IP)
  - Use: nginx rate limiting or CloudFlare

## 🔑 Secrets Management

- [ ] **Environment variables**: All secrets in env vars, not code
  - ✅ STRIPE_SECRET_KEY in .env
  - ✅ STRIPE_WEBHOOK_SECRET in .env
  - ✅ DATABASE_URL in .env
  - ❌ No secrets hardcoded in code

- [ ] **.env files**: Not committed to git
  - ✅ .env in .gitignore
  - ✅ .env.example provided (no real secrets)

- [ ] **Production secrets**: Rotated regularly
  - TODO: Rotate Stripe keys every 90 days
  - TODO: Rotate database passwords every 90 days

## 🧪 Testing

- [ ] **Security tests**: All security features have tests
  - Test: Invalid webhook signature
  - Test: Ownership bypass attempt
  - Test: Admin endpoint without auth
  - Test: SQL injection attempts

## ✅ Compliance

- [ ] **GDPR**: User can delete all their data
  - TODO: Implement data deletion endpoint
  - Must delete: profile, subscription, rate limits, Stripe customer

- [ ] **PCI-DSS**: No payment card data stored
  - ✅ All payment processing via Stripe
  - ❌ Never store card numbers, CVV, expiration dates

---

## Security Scoring

**Overall Security Score**: 75/100

**High Priority Fixes**:
1. Implement admin authorization middleware
2. Configure CORS for production
3. Add security tests for all endpoints
4. Implement data deletion for GDPR compliance

**Medium Priority**:
5. Set up API rate limiting at gateway
6. Configure HTTPS redirect
7. Add PII logging filters

**Low Priority**:
8. Secret rotation automation
9. Penetration testing
10. Security headers (CSP, HSTS)

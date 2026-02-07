# Phase 1 Prompt for Gemini

## Phase 1: Monetization Foundation & Feature Gates

**Objective**: Design and implement the foundational systems for monetizing the platform while maintaining Phase 0's operational excellence.

**Status**: Phase 0 is ✅ COMPLETE and validated. You can now build on a stable foundation.

---

## Context

**What Phase 0 Delivered**:
- Hunter Protocol: Autonomous job search and application orchestration
- 57/57 orchestrator tests passing
- 59/70 API integration tests passing
- 6/7 packages passing TypeScript checks

**Your Phase 0 Success**: Your integration testing validated that the core agent logic works correctly. The remaining test failures are mock/harness issues, not production issues.

**You've Proven**: End-to-end workflows, database persistence, API contracts, and error handling all work.

---

## Phase 1 Scope: Three Parallel Streams

### Stream 1A: Stripe Payment Integration
Design the payment processing flow for recurring subscriptions.

**Deliverables**:
1. **Stripe Account Setup Plan**: How to configure Stripe for this use case
2. **Webhook Handler Design**: Stripe event handling (payment.success, customer.subscription.updated, etc.)
3. **API Endpoints** (design, not yet implement):
   - `POST /payments/checkout-session` - Create Stripe checkout
   - `POST /webhooks/stripe` - Handle webhook events
   - `GET /user/subscription` - Get current subscription status
   - `POST /user/subscription/cancel` - Cancel subscription
4. **Database Schema** (Zod schemas):
   - `Customer`: Stripe customer ID, email, metadata
   - `Subscription`: Plan ID, status, billing cycle, renewal date, cancel_at
   - `Payment`: Transaction ID, amount, status, timestamp
5. **Error Handling**: Invalid cards, network failures, webhook retries

### Stream 1B: Feature Gates & Entitlements
Design a system to gate features behind subscription tiers.

**Deliverables**:
1. **Feature Catalog**: Define all features that will be gated
   - Examples: `hunter.search_jobs`, `hunter.analyze_gap`, `hunter.bulk_apply`
   - Free tier features vs Premium features
2. **Subscription Tiers** (Zod schemas):
   - `Tier`: Free, Professional, Enterprise
   - Features enabled per tier
   - Rate limits per tier (jobs/month, applications/month, etc.)
3. **Entitlement System**:
   - `UserEntitlement`: User ID, tier, features, rate limits, expiration
   - `FeatureGate`: Feature name, required tier, configuration
4. **Middleware Design**: How to check entitlements on API routes
   - Recommended: Redis-backed cache for performance
5. **Database Schema**:
   - `FeatureGate`: id, name, description, required_tier, rate_limit
   - `UserEntitlement`: user_id, tier_id, active_features, rate_limits_remaining, expires_at
   - `RateLimit`: user_id, feature, count, window_reset_at

### Stream 1C: Pricing Page & Landing Site
Design the customer-facing sales funnel.

**Deliverables**:
1. **Landing Page Structure**:
   - Hero section: Value proposition
   - Problem/Solution section
   - Features showcase (by tier)
   - Pricing comparison table
   - CTA sections (Sign up, Try free, Contact sales)
2. **Pricing Page Design**:
   - Three tier cards: Free, Professional, Enterprise
   - Pricing ($0, $29, $99/month - you decide)
   - Feature comparison matrix
   - FAQ section
   - CTA buttons linking to Stripe checkout
3. **Navigation Flow**:
   - Public pages: Landing, Pricing, Privacy, Terms
   - Authenticated pages: Dashboard, Settings, Profile
   - Upsell flows: Show upgrade CTA in app when limits hit
4. **UI Components Needed**:
   - PricingTierCard component
   - FeatureComparisonTable component
   - UpgradePrompt component (shown when limit reached)

---

## Architecture Integration

**How Phase 1 Integrates with Phase 0**:

```
Phase 0: Hunter Protocol
├── Find Jobs
├── Analyze Gap
├── Tailor Resume
└── Write Cover Letter
    ↓ (needs entitlement check)
Phase 1: Feature Gates
├── Is user's subscription tier allowed?
├── Has user hit their rate limit?
└── Log usage for billing
    ↓ (if paid)
Phase 1: Stripe Integration
├── Charge subscription
├── Update customer record
├── Send invoice
└── Handle cancellations
```

**Middleware Flow**:
```
API Request → Check Authentication
           → Check Feature Gate (is "hunter.search_jobs" enabled for this user?)
           → Check Rate Limit (have they used their monthly quota?)
           → Execute API Handler
           → Decrement Rate Limit Counter
           → Log usage (for analytics)
           → Send Response
```

---

## Detailed Deliverables

### 1. Architecture Document (5000+ words)

**Include**:
- High-level system diagram showing Stripe → Subscriptions → Features → Users
- Data flow: User subscribes → Entitlements updated → Rate limits applied
- Webhook flow: Stripe event → Update subscription → Notify user
- Rate limiting strategy (Redis counters vs database queries)
- Error scenarios: Payment failed, webhook retry, subscription expired

**Diagrams**:
- Entity relationship diagram (Customer, Subscription, FeatureGate, UserEntitlement)
- Sequence diagram: User subscribes → Stripe → Webhook → App → User
- Rate limit lifecycle: Request → Check limit → Decrement → Reset window

### 2. Zod Schema Definitions

Create `/packages/schema/src/monetization.ts` with:

```typescript
// Stripe-related schemas
export const StripeCustomerSchema = z.object({...})
export const StripeSubscriptionSchema = z.object({...})

// Entitlement schemas
export const FeatureGateSchema = z.object({...})
export const UserEntitlementSchema = z.object({...})

// Pricing schemas
export const PricingTierSchema = z.object({...})
export const RateLimitSchema = z.object({...})
```

**Required Fields**:
- Stripe external IDs (stripe_customer_id, stripe_subscription_id)
- Timestamps (created_at, expires_at, billing_cycle_end)
- Status enums (active, canceled, past_due, expired)
- Feature lists and rate limits

### 3. API Contracts (OpenAPI/JSON Schema)

Define endpoints:

**Payment Endpoints**:
- `POST /payments/checkout-session` → Create checkout link
- `POST /webhooks/stripe` → Handle events
- `GET /user/subscription` → Get current subscription
- `POST /user/subscription/cancel` → Cancel subscription
- `GET /user/invoices` → List past invoices

**Feature Gate Endpoints** (internal/admin):
- `GET /admin/feature-gates` → List all features
- `POST /admin/feature-gates` → Create new feature
- `PATCH /admin/feature-gates/:id` → Update feature config
- `GET /admin/users/:id/entitlements` → Check user's features

### 4. Pricing Strategy Document

**Include**:
- Pricing tiers and pricing ($, frequency)
- Features per tier (matrix)
- Rate limits per tier (jobs/month, applications/month)
- Free trial duration (if any)
- Upgrade/downgrade policies
- Cancellation policies

**Example Tiers**:
```
Free Tier:
  - 5 job searches/month
  - 1 job compatibility analysis/month
  - Limited resume tailoring
  - Price: $0

Professional Tier:
  - 100 job searches/month
  - 50 job analyses/month
  - Unlimited resume tailoring
  - Price: $29/month

Enterprise Tier:
  - Unlimited everything
  - API access
  - Batch processing
  - Custom integrations
  - Price: $99/month or custom
```

### 5. Implementation Priority & Effort Estimate

Rank streams by dependencies:

1. **Stream 1B (Feature Gates)**: Foundation, needed by others
   - Effort: 3 EU
   - Dependencies: None
   - Blocks: Streams 1A, 1C

2. **Stream 1A (Stripe)**: Payment processing
   - Effort: 4 EU
   - Dependencies: 1B
   - Blocked by: Stream 1B

3. **Stream 1C (Landing/Pricing Pages)**: Customer-facing
   - Effort: 3 EU
   - Dependencies: 1A (for checkout links)
   - Blocked by: Streams 1A, 1B

**Total Phase 1**: ~10 EU

---

## Technical Considerations

### Rate Limiting Strategy

Options:
1. **Redis Counters** (Recommended for fast response)
   - Key: `rate_limit:{user_id}:{feature}:{window_date}`
   - Value: Count + expiration
   - Pros: Sub-millisecond checks, ideal for API gating
   - Cons: Requires Redis

2. **Database Queries** (Simpler infrastructure)
   - Query RateLimit table
   - Check count < limit AND window not expired
   - Pros: Single source of truth
   - Cons: Database load, slower

**Recommendation**: Start with database (simpler), optimize to Redis if needed.

### Webhook Idempotency

Stripe can retry webhooks. Design for idempotency:
- Store `stripe_event_id` in database before processing
- Check if event already processed before updating subscription
- Return 200 immediately, process async if needed

### Free Trial Handling

Decide:
- Does free tier allow Trial period?
- How long? (7 days, 14 days)
- Auto-downgrade to free or require card?
- Send reminder emails before expiration?

---

## Testing Plan (for Phase 1B, after your design)

Once you complete design, testing should include:
- Unit: Feature gate logic (is user allowed?)
- Integration: Stripe webhook → Subscription updated
- E2E: User signs up → Gets subscription → Can use features → Hits rate limit
- Chaos: Payment fails, webhook delayed, customer cancels mid-billing-cycle

---

## Deliverable Format

Please provide:

1. **Architecture Document** (PHASE-1-ARCHITECTURE.md)
   - 5000+ words
   - Detailed diagrams (use Mermaid syntax)
   - Security considerations
   - Scaling strategy

2. **Zod Schema File** (code snippet for `/packages/schema/src/monetization.ts`)
   - All required schemas
   - Documentation comments
   - Validation rules

3. **API Contract Document** (PHASE-1-API-CONTRACTS.md)
   - OpenAPI specifications
   - Request/response examples
   - Error codes and messages

4. **Pricing Strategy Document** (PHASE-1-PRICING.md)
   - Tier definitions
   - Feature matrix
   - Rate limits
   - Rationale for pricing decisions

5. **Implementation Priority** (PHASE-1-PRIORITIES.md)
   - Stream execution order
   - Effort estimates (in EU)
   - Critical dependencies
   - Risk assessment

---

## Reference Materials

Existing files you should reference:
- `/PHASE-0-COMPLETION-REPORT.md` - What was built in Phase 0
- `/CLAUDE.md` - Project architecture and patterns
- `/seed.yaml` - Project constraints and standards
- `/packages/schema/src/` - Existing Zod schema patterns

Phase 0 deliverables:
- Orchestrator tests: `apps/orchestrator/test/`
- API integration tests: `apps/api/src/routes/__tests__/`
- Hunter protocol: `packages/core/src/hunter-protocol/`

---

## Timeline & Coordination

This prompt is being shared while Claude Code works on:
- ✅ Phase 0 typecheck stabilization (DONE)
- ⏳ Optional: Phase 1 implementation (parallel with your design)

**Suggested Sequence**:
1. You complete 1B (Feature Gates architecture) - foundation
2. Claude reviews and starts implementing 1B infrastructure
3. You complete 1A (Stripe architecture) while Claude implements 1B
4. You complete 1C (Landing page design) while Claude implements 1A
5. Merge: Feature gates + Stripe + Landing page = Phase 1 MVP

---

## Questions to Guide Your Design

- How do we handle subscription cancellation mid-month? (Immediate or at period end?)
- What happens when a user's rate limit expires monthly? (Auto-reset or manual renewal?)
- Should free tier users be able to upgrade to trial without payment info?
- How do we handle dunning (payment retries)? (Stripe handles, or custom logic?)
- When a user downgrades, do we limit their feature access immediately or at period end?

---

## Success Criteria for Phase 1 Design

✅ Architecture clearly shows how Stripe → Subscriptions → Features flow
✅ All schemas are properly validated with Zod
✅ API contracts are complete and match Phase 0 style
✅ Pricing strategy is competitive and defensible
✅ Implementation plan is realistic and sequenced
✅ Security considerations are addressed (webhook signatures, rate limit validation, etc.)

---

**Ready when you are!** Once you complete this design, Claude Code can begin implementing Phase 1 in parallel with Phase 2 planning.

**Questions?** Review this prompt carefully and ask for clarification if anything is unclear.

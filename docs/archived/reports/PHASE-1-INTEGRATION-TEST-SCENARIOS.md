# Phase 1: Integration Test Scenarios

**Status**: Planning
**Target**: QA / Integration Testing (Stream 1A+1B+1C)
**Priority**: Medium (10%)

## 1. Overview
These scenarios verify that all streams (Stripe, Licensing, UI) work together as a cohesive system. They focus on the **User Journey**.

## 2. Test Environment
- **Stripe**: Test Mode (using Test Cards).
- **Database**: Staging (reset daily).
- **Time**: Simulated using Stripe Test Clocks or internal `mock-time` service if needed.

## 3. Scenarios

### Scenario 1: The "Happy Path" Upgrade
**Goal**: Verify a user can freely upgrade without friction.
1.  **User** creates account.
2.  **System** assigns `FREE` tier.
3.  **User** checks `/api/licensing/me` -> sees limit 5.
4.  **User** navigates to `/pricing`, clicks "Pro".
5.  **Stripe** checkout session opens.
6.  **User** enters Test Card (4242...).
7.  **Stripe** redirects to success page.
8.  **App** polls API until `tier: PRO`. (Max 5s).
9.  **User** runs 6th job search.
10. **System** allows it. usage increments to 6.

### Scenario 2: Payment Failure & Recovery
**Goal**: Verify grace periods and downgrades.
1.  **User** (PRO) card fails renewal (simulated in Stripe Dashboard).
2.  **Webhook** `invoice.payment_failed` received.
3.  **System** marks Subscription as `past_due`.
4.  **Entitlement Check**: User *should* still have access (Grace Period: 3 days).
5.  **User** sees banner: "Payment failed. Update card to keep Pro."
6.  **User** does nothing.
7.  **Stripe** cancels subscription (after retries/time).
8.  **Webhook** `customer.subscription.deleted` received.
9.  **System** downgrades to `FREE`.
10. **User** runs search. **Blocked**.

### Scenario 3: The "Mask Hoarder" Downgrade
**Goal**: Verify data ownership is respected during downgrade.
1.  **User** (PRO) creates 15 Masks (Limit: 16).
2.  **User** cancels subscription.
3.  **System** downgrades to `FREE` (Limit: 3).
4.  **User** views Mask Registry (`TabulaPersonarum`).
    - **Expect**: Sees all 15 masks.
    - **Visual**: Top 3 active/highlighted? Or all available read-only?
    - **Policy**: Read-only access to all.
5.  **User** tries to create 16th mask.
    - **Expect**: Error "Limit reached (15/3). Delete 13 masks to create new ones."

### Scenario 4: Concurrent Usage
**Goal**: Verify race conditions in counters.
1.  **User** (FREE, 0/5 usage) launches 5 parallel browser tabs.
2.  **User** clicks "Search" in all 5 tabs simultaneously.
3.  **System** processes requests.
4.  **Expect**: 5 succeed.
5.  **User** clicks "Search" in 6th tab.
6.  **Expect**: Blocked.
7.  **Redis**: Counter is exactly 5.

## 4. Cross-Stream Dependencies
- **UI <-> API**: UI must handle `402` errors gracefully.
- **API <-> Stripe**: Webhook signature verification is non-negotiable.
- **Agent <-> Licensing**: Agent must not "burn" tokens (LLM cost) if Licensing check fails later. Check *before* generation.

## 5. Performance Baselines
- **Entitlement Check**: < 10ms.
- **Webhook Processing**: < 200ms (p99).
- **Checkout Redirect**: < 1s.

# Phase 1B Test Plan: Licensing & Feature Gates

**Status**: Planning
**Target**: Stream 1B (Feature Gates)
**Priority**: High (40%)

## 1. Overview
This test plan covers the **Licensing Engine** which enforces feature limits based on subscription tiers. Since "gating automation" is the core monetization strategy, this system must be robust, fail-safe (fail closed for paid features, fail open for core data access), and performant.

**Key Component**: `packages/core/src/licensing/licensing-service.ts`

## 2. Test Matrix

We must verify behavior across all Tiers and Features.

| Feature | Tier: FREE | Tier: PRO | Tier: ENTERPRISE | Edge Case |
| :--- | :--- | :--- | :--- | :--- |
| **Hunter Search** | Limit: 5/mo | Unlimited | Unlimited | Reset boundary |
| **Auto Apply** | Disabled (0) | Enabled (1) | Enabled (1) | Toggle |
| **Masks** | Limit: 3 | Limit: 16 | Unlimited | Downgrade > 3 |
| **Resume Tailor** | Limit: 10/mo | Unlimited | Unlimited | Concurrent reqs |
| **Narrative** | Limit: 5/mo | Unlimited | Unlimited | - |

## 3. Unit Test Suite (`packages/core/test/licensing.test.ts`)

### 3.1 LicensingService Logic
- [ ] **Instantiation**: Can be created with `InMemoryRateLimitStore` and `mockTierProvider`.
- [ ] **Plan Retrieval**: `getPlanDefinition("FREE")` returns correct config.
- [ ] **Can Use (Boolean)**:
    - `canUse(..., "hunter_auto_apply")` returns `false` for FREE.
    - Returns `true` for PRO.
- [ ] **Can Use (Count)**:
    - Returns `true` if usage < limit.
    - Returns `false` if usage >= limit.
    - Returns `true` if usage is high but limit is -1 (Unlimited).
- [ ] **Consume**:
    - `checkAndConsume` decrements quota correctly.
    - Returns `[false, remaining]` if consuming would exceed limit.
    - Returns `[true, new_remaining]` on success.
    - Does *not* increment if check fails (atomic check-and-set logic simulation).

### 3.2 Rate Limit Reset
- [ ] **Monthly Reset**:
    - Simulate usage at `2026-01-31 23:59:59`.
    - Call `resetAllCounters`.
    - Verify usage is 0 at `2026-02-01 00:00:01`.
- [ ] **Never Reset**:
    - Verify `masks_limit` does *not* reset on monthly boundary.

### 3.3 Downgrade Logic (Edge Cases)
- [ ] **Mask Overflow**:
    - User has 10 masks (PRO).
    - User downgrades to FREE (Limit 3).
    - `canUse(..., "masks_limit")` should return `false` (cannot create *new* masks).
    - **Crucial**: Existing masks must NOT be deleted automatically. Access should be read-only or restricted to top 3. *Verify policy on this.*

## 4. Integration Test Suite (`apps/api/test/licensing.integration.test.ts`)

**Infrastructure**: Redis (via `ioredis`) + Postgres.

### 4.1 Redis RateLimitStore
- [ ] **Increment**: `INCR` command works and returns new value.
- [ ] **Persistence**: Data survives service restart (Redis persistence).
- [ ] **Key Expiry**: Verify keys expire at end of billing period (if implemented via TTL).

### 4.2 Middleware Integration (`apps/api/src/middleware/entitlements.ts`)
- [ ] **Block Request**:
    - Send `POST /hunter/search` as FREE user who exhausted limit.
    - Expect `403 Forbidden` or `402 Payment Required`.
    - Response body includes `code: "USAGE_LIMIT_EXCEEDED"`, `feature: "hunter_job_searches"`, `upgradeUrl`.
- [ ] **Allow Request**:
    - Send request as PRO user.
    - Expect `200 OK`.
- [ ] **Latency Budget**: Check overhead is < 10ms (Redis roundtrip).

## 5. Mock Scenarios

### Scenario A: The "Power User" Free Trial
1.  **User A** signs up (FREE).
2.  Runs 1 search (Usage: 1/5). Success.
3.  Runs 4 more searches (Usage: 5/5). Success.
4.  Runs 6th search.
    - **Expect**: Error `UsageLimitExceeded`.
    - **UI**: Shows "You've hit your monthly limit. Upgrade for unlimited."

### Scenario B: The Upgrade
1.  **User A** (from above) calls `POST /billing/checkout`.
2.  (Mock) Webhook `invoice.paid` arrives for PRO plan.
3.  **User A** usage logic checks Tier. Now PRO.
4.  Runs 6th search.
    - **Expect**: Success.
    - **Usage**: Tracked as 1 (new counter for PRO?) or 6 (continued)? *Decision: Reset on upgrade or carry over? Typically reset or carry over is fine if limit is now infinite.*

## 6. Performance Targets
- **Throughput**: 1000 entitlement checks / sec.
- **Latency**: p99 < 20ms.
- **Reliability**: Fail-open for "Core Data" (if Redis down, can I still see my CV? Yes). Fail-closed for "Hunter" (if Redis down, Agent pauses).

## 7. Test Fixtures
- `fixtures/users.ts`:
    - `free_user_fresh` (0 usage)
    - `free_user_capped` (5/5 usage)
    - `pro_user`
- `fixtures/redis.ts`:
    - Scripts to pre-populate Redis counters.

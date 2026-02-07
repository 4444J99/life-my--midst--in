# Phase 1 Edge Cases & Handling

## 💳 Payment Edge Cases

### 1. Payment succeeds but webhook fails
**Scenario**: User pays, Stripe charges card, but webhook never reaches our server (network failure, server down).

**Current Behavior**:
- User sees Stripe "success" page
- Our database never updated (still shows FREE tier)
- User can't use paid features

**Solution**:
- Stripe retries webhooks for 3 days
- Manual verification: Admin checks Stripe Dashboard → Update tier manually
- Future: Implement webhook retry monitoring

**Runbook**: See "Manual Tier Update" below

---

### 2. Webhook arrives before user returns to success page
**Scenario**: Webhook processes instantly, but user's browser takes 5 seconds to redirect.

**Current Behavior**:
- ✅ Success page waits 3 seconds before fetching subscription
- ✅ Should show updated tier

**Edge Case**: User closes browser before redirect

**Solution**:
- Subscription is already upgraded (webhook processed)
- User can check tier on dashboard
- No action needed

---

### 3. User has multiple browser tabs during checkout
**Scenario**: User clicks "Upgrade" in 2 tabs simultaneously.

**Current Behavior**:
- 2 checkout sessions created
- User completes payment in 1 tab
- Other tab still shows checkout URL (now invalid)

**Solution**:
- Stripe prevents double-charging (same customer, same price)
- Other tab shows "Session expired" error
- No issue

---

### 4. Subscription downgrade (PRO → FREE)
**Scenario**: User cancels PRO subscription, period ends, should downgrade to FREE.

**Current Behavior**:
- Webhook: `customer.subscription.deleted`
- Database: `tier = 'FREE'`, `status = 'canceled'`

**Edge Case**: User had 15 masks, FREE only allows 3

**Solution**:
- DO NOT delete masks (data preservation)
- Future searches/resumes still enforce 3 mask limit
- User can manually delete extra masks
- TODO: Add UI warning: "You have X masks but tier allows Y"

---

### 5. Payment fails after trial
**Scenario**: User starts 14-day PRO trial, card declines at trial end.

**Current Behavior**:
- Stripe sends: `invoice.payment_failed`
- Subscription status: `past_due`
- We keep user at PRO tier (grace period)

**Solution**:
- Stripe retries payment 4 times over 2 weeks
- If all fail: `customer.subscription.deleted` → downgrade to FREE
- User sees "Payment failed" banner in dashboard (TODO: implement)

---

## 🔢 Rate Limiting Edge Cases

### 6. Concurrent quota checks (race condition)
**Scenario**: User sends 3 job search requests simultaneously (FREE tier has 5/month limit, currently used 4).

**Expectation**: Only 1 should succeed (4 + 1 = 5, limit reached)

**Risk**: Without atomic operations, all 3 might succeed

**Solution**:
- ✅ PostgreSQL `ON CONFLICT` with atomic INCREMENT
- ✅ All 3 requests hit DB simultaneously
- ✅ PostgreSQL serializes writes, only 1 succeeds
- Test: Added in Gemini-2's test suite

---

### 7. Quota reset during active request
**Scenario**: User's quota resets on 1st of month while job search is in progress.

**Current Behavior**:
- Quota check: 5/5 used → DENIED
- (1 second later, cron resets to 0/5)
- User sees quota exceeded error

**Solution**:
- Rare edge case (< 1% of users)
- User can retry immediately (quota now reset)
- Future: Check if reset time is NOW ± 1 minute, auto-retry

---

### 8. User upgrades mid-search
**Scenario**: User hits quota (5/5 FREE), upgrades to PRO, retries search immediately.

**Current Behavior**:
- First request: quota check FAILS (still FREE in resolver cache)
- Webhook updates database: tier = PRO
- Second request (1 sec later): quota check SUCCEEDS

**Solution**:
- ✅ No caching in SubscriptionTierResolver (always queries DB)
- Search should succeed immediately after upgrade

---

## 📅 Subscription Edge Cases

### 9. Subscription canceled, then resubscribed
**Scenario**: User cancels PRO (scheduled for end of period), then changes mind and resubscribes.

**Current Behavior**:
- Cancel: `cancel_at = 2024-02-01, cancel_at_period_end = true`
- Resubscribe (via Stripe Dashboard): cancel fields cleared
- Webhook: `customer.subscription.updated`
- Database: `cancel_at = null, cancel_at_period_end = false`

**Solution**: ✅ Already handled by webhook logic

---

### 10. Multiple subscriptions for same user
**Scenario**: User creates 2 Stripe subscriptions (via API bug or manual creation).

**Current Behavior**:
- Only 1 subscription per `profile_id` (UNIQUE constraint)
- If webhook tries to create 2nd: PostgreSQL error

**Solution**:
- Catch error in webhook handler
- Log warning: "Duplicate subscription for profile"
- Keep existing subscription, ignore new one
- TODO: Add duplicate check in webhook handler

---

## 🛡️ Security Edge Cases

### 11. Webhook replay attack
**Scenario**: Attacker captures valid webhook, replays it 100 times to create fake subscriptions.

**Current Behavior**:
- `stripe_events` table has UNIQUE constraint on `stripe_event_id`
- First webhook: processed
- Replays: Skipped (event already processed)

**Solution**: ✅ Idempotency protects against replays

---

### 12. User tampers with profileId in checkout metadata
**Scenario**: User modifies checkout session metadata to upgrade another user's account.

**Current Behavior**:
- Checkout session created with `client_reference_id = profileId`
- User can't modify this (Stripe session is server-side)

**Risk**: If attacker controls API call (no auth middleware)

**Solution**:
- ✅ `createOwnershipMiddleware()` verifies user owns profileId
- Test: Try to checkout for another user → 403

---

## 🔧 Operational Edge Cases

### 13. Database migration fails mid-migration
**Scenario**: Running `011_subscriptions.sql`, power outage after table created but before indexes.

**Current Behavior**:
- PostgreSQL transaction rolls back (if wrapped in BEGIN/COMMIT)
- If not wrapped: partial migration (table exists, no indexes)

**Solution**:
- ✅ Migrations are idempotent (IF NOT EXISTS checks)
- Re-run migration: creates missing indexes, no errors

---

### 14. Stripe webhook arrives out of order
**Scenario**: `subscription.updated` arrives before `subscription.created`.

**Current Behavior**:
- `handleSubscriptionUpdated()` queries database
- No subscription found → error

**Solution**:
- Webhook handler should create subscription if missing
- TODO: Add "upsert" logic to subscription handlers

---

## 📊 Data Integrity Edge Cases

### 15. User deletes profile while subscription active
**Scenario**: User requests account deletion, but has active PRO subscription.

**Current Behavior**:
- Profile deleted → cascades to subscriptions (FOREIGN KEY)
- Stripe subscription still active (billing continues)

**Solution**:
- Before deleting profile:
  1. Cancel Stripe subscription
  2. Wait for `subscription.deleted` webhook
  3. Delete profile
- TODO: Implement account deletion flow with Stripe cancellation

---

## ✅ Edge Case Summary

| Edge Case | Severity | Current Handling | Action Needed |
|-----------|----------|------------------|--------------|
| Payment succeeds, webhook fails | High | Manual fix | Implement monitoring |
| Concurrent quota checks | High | ✅ Atomic ops | Add test |
| Subscription downgrade (data loss) | Medium | Preserves data | Add UI warning |
| Payment fails after trial | Medium | Grace period | Add banner |
| Multiple subscriptions | Low | Error logged | Add duplicate check |
| Webhook out of order | Medium | Error | Add upsert logic |
| Profile deletion with active sub | High | ❌ Orphaned sub | Implement cancellation |

**Total Edge Cases**: 15
**Handled**: 9
**Needs Work**: 6

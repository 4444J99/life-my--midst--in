# Phase 1 Operations Runbook

## 🆘 Common Operations

### 1. Manual Tier Update (When Webhook Fails)

**Scenario**: User paid but tier not updated in database.

**Steps**:
1. Verify payment in Stripe Dashboard:
   - Go to https://dashboard.stripe.com/test/subscriptions
   - Search for customer email
   - Confirm subscription is `active`

2. Get Stripe customer ID and subscription ID from dashboard

3. Update database:
```sql
UPDATE subscriptions
SET
  tier = 'PRO',
  status = 'active',
  stripe_subscription_id = 'sub_xxxxx',
  billing_interval = 'monthly',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month'
WHERE stripe_customer_id = 'cus_xxxxx';
```

4. Verify update:
```sql
SELECT tier, status FROM subscriptions WHERE stripe_customer_id = 'cus_xxxxx';
```

---

### 2. Reset User Quota (Support Request)

**Scenario**: User accidentally used all quota, requests reset.

**Steps**:
1. Get profile ID from support ticket
2. Option A: Via Admin API
```bash
curl -X POST http://localhost:3001/admin/licensing/entitlements/PROFILE_ID/reset \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

3. Option B: Via Database
```sql
DELETE FROM rate_limits WHERE profile_id = 'PROFILE_ID';
```

4. Verify reset:
```sql
SELECT * FROM rate_limits WHERE profile_id = 'PROFILE_ID';
-- Should return 0 rows
```

---

### 3. Refund & Downgrade User

**Scenario**: User requests refund and account downgrade.

**Steps**:
1. Process refund in Stripe Dashboard:
  - Find subscription → "Actions" → "Refund payment"
  - Stripe automatically sends charge.refunded webhook
2. Cancel subscription:
  - "Actions" → "Cancel subscription" → "Cancel immediately"
  - Webhook: customer.subscription.deleted
3. Verify database updated:
```sql
SELECT tier, status FROM subscriptions WHERE profile_id = 'PROFILE_ID';
-- Should show: tier = 'FREE', status = 'canceled'
```

4. Notify user: "Your subscription has been canceled and refund processed."

---

### 4. Investigate Failed Webhook

**Scenario**: Stripe webhook failed (500 error in dashboard).

**Steps**:
1. Check webhook logs in Stripe Dashboard:
  - Go to "Developers" → "Webhooks" → Click endpoint
  - Find failed event → View details
2. Check application logs:
```bash
# Search for webhook errors
grep "Webhook error" /var/log/app.log

# Or in Docker
docker logs app-container | grep "Webhook error"
```

3. Common failures:
  - "Invalid signature": Check STRIPE_WEBHOOK_SECRET matches dashboard
  - "Database connection failed": Check PostgreSQL is running
  - "Profile not found": Check metadata.profileId is valid UUID
4. Retry webhook:
  - Stripe Dashboard → Event → "Send test webhook"
  - Should process successfully now

---

### 5. Monitor Quota Usage (Analytics)

**Scenario**: Product team wants usage metrics.

Query all usage by tier:
```sql
SELECT
  s.tier,
  r.feature,
  AVG(r.used) as avg_usage,
  MAX(r.used) as max_usage,
  COUNT(*) as user_count
FROM subscriptions s
JOIN rate_limits r ON r.profile_id = s.profile_id
GROUP BY s.tier, r.feature
ORDER BY s.tier, r.feature;
```

Query users near quota limit:
```sql
SELECT
  s.profile_id,
  s.tier,
  r.feature,
  r.used,
  (SELECT value FROM plan_features WHERE tier = s.tier AND feature = r.feature) as limit
FROM subscriptions s
JOIN rate_limits r ON r.profile_id = s.profile_id
WHERE r.used >= (SELECT value FROM plan_features WHERE tier = s.tier AND feature = r.feature) * 0.8
ORDER BY r.used DESC;
```

---


### 6. Handle Disputed Payment

**Scenario**: User disputes charge, Stripe creates charge.dispute.created event.

**Steps**:
1. Check Stripe Dashboard for dispute reason
2. Immediately suspend account (optional, based on policy):
```sql
UPDATE subscriptions
SET status = 'suspended'
WHERE stripe_customer_id = 'cus_xxxxx';
```

3. Respond to dispute in Stripe Dashboard (within 7 days)
4. If dispute lost:
  - Stripe refunds automatically
  - Webhook: charge.dispute.closed (status: lost)
  - Downgrade to FREE
5. If dispute won:
  - Unsuspend account
  - Webhook: charge.dispute.closed (status: won)

---


### 7. Delete User Account (GDPR Request)

**Scenario**: User requests full data deletion.

**Steps**:
1. Cancel active subscription (if any):
# Get subscription ID
```sql
SELECT stripe_subscription_id FROM subscriptions WHERE profile_id = 'PROFILE_ID';
```

# Cancel via Stripe API (or dashboard)
```bash
curl -X DELETE https://api.stripe.com/v1/subscriptions/sub_xxxxx \
  -u "sk_test_xxxxx:"
```

2. Delete Stripe customer:
```bash
curl -X DELETE https://api.stripe.com/v1/customers/cus_xxxxx \
  -u "sk_test_xxxxx:"
```

3. Delete database records (cascades via FOREIGN KEY):
```sql
DELETE FROM profiles WHERE id = 'PROFILE_ID';
-- Cascades to: subscriptions, rate_limits, masks, epochs, etc.
```

4. Verify deletion:
```sql
SELECT * FROM subscriptions WHERE profile_id = 'PROFILE_ID';
SELECT * FROM rate_limits WHERE profile_id = 'PROFILE_ID';
-- Both should return 0 rows
```

---


🚨 Emergency Procedures

Webhook Endpoint Down (All Payments Failing)

Symptoms:
- Stripe Dashboard shows 100% webhook failures
- Users report "Subscription upgraded but features not working"

Steps:
1. Check application status:
```bash
curl https://api.yourdomain.com/health
# Should return 200 OK
```

2. Check webhook endpoint specifically:
```bash
curl -X POST https://api.yourdomain.com/webhooks/stripe \
  -H "stripe-signature: test" \
  -d '{"type":"ping"}'
# Should return 401 (expected for invalid sig, but confirms endpoint is up)
```

3. If endpoint is down:
  - Restart application server
  - Check logs for errors
  - Verify STRIPE_WEBHOOK_SECRET is set
4. Backfill missed webhooks:
  - Stripe Dashboard → Events → Filter last 24 hours
  - Manually replay failed events (click "Send test webhook")

---


Database Connection Pool Exhausted

Symptoms:
- API returns 500 errors
- Logs show "connection pool exhausted"

Steps:
1. Check active connections:
```sql
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';
```

2. Kill idle connections:
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes';
```

3. Increase pool size in application:
```javascript
const pool = new Pool({
  max: 20, // Increase from default 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

4. Restart application to apply changes

---


📞 Escalation Contacts
┌────────────────────┬──────────────────────┬───────────────┐
│     Issue Type     │       Contact        │ Response Time │
├────────────────────┼──────────────────────┼───────────────┤
│ Payment failures   │ support@stripe.com   │ 24 hours      │
├────────────────────┼──────────────────────┼───────────────┤
│ Database issues    │ DevOps team          │ 1 hour        │
├────────────────────┼──────────────────────┼───────────────┤
│ Security incidents │ security@company.com │ Immediate     │
├────────────────────┼──────────────────────┼───────────────┤
│ User support       │ support@company.com  │ 4 hours       │
└────────────────────┴──────────────────────┴───────────────┘

---


📋 Checklist Templates

New User Onboarding

- Profile created
- Subscription created (tier: FREE)
- Welcome email sent
- Usage metrics initialized

Subscription Upgrade

- Stripe checkout session created
- Payment successful
- Webhook received and processed
- Database updated (tier, status, dates)
- User can access new features
- Confirmation email sent

Subscription Cancellation

- Cancellation request received
- Stripe subscription canceled
- Webhook processed
- Database updated (cancelAt, cancelAtPeriodEnd)
- User notified of cancellation date
- Access continues until period end

# Phase 1 Monitoring & Alerting Recommendations

This document outlines the monitoring strategy for the **Billing & Licensing** system in Phase 1.

## 📊 Key Performance Indicators (KPIs)

| Metric | Target | Description |
|--------|--------|-------------|
| **Webhook Success Rate** | > 99.9% | % of Stripe webhooks resulting in 2xx status |
| **Checkout Conversion** | > 15% | % of users who start checkout and complete it |
| **Upgrade Latency** | < 5s | Time from Stripe payment to database update |
| **Quota Denial Rate** | < 5% | % of requests denied due to quota limits |

---

## 🛠️ Monitoring Setup

### 1. Prometheus Metrics
The following metrics should be exported by the `apps/api` service:

- `billing_webhook_received_total{type}`: Count of all Stripe webhooks
- `billing_webhook_error_total{type, reason}`: Count of failed webhooks
- `licensing_quota_check_total{feature, result}`: Count of allow/deny checks
- `licensing_active_subscriptions{tier}`: Current count of active subs by tier

### 2. Log Aggregation (ELK/Grafana Loki)
Search queries for critical billing events:

- `level:error msg:"Webhook signature verification failed"`
- `level:error msg:"Failed to process subscription update"`
- `level:info msg:"User upgraded to PRO" profileId:"..."`

---

## 🚨 Alerting Rules

### Critical Alerts (Immediate Response)
- **StripeWebhookDown**: `rate(billing_webhook_received_total[5m]) == 0` AND Stripe Dashboard shows failures.
- **HighWebhookFailureRate**: `rate(billing_webhook_error_total[10m]) / rate(billing_webhook_received_total[10m]) > 0.05`
- **DatabaseConnectionPoolExhausted**: Connection pool usage > 90%.

### Warning Alerts (Same-Day Response)
- **QuotaResetFailure**: Cron job for monthly quota reset failed.
- **HighQuotaDenialRate**: More than 20% of users hitting limits (may indicate pricing tier mismatch).
- **StripeAPIErrorRate**: `stripe_api_request_error_total > 5` in 1 hour.

---

## 📈 Dashboard Layout

### Billing Dashboard (Grafana)
1. **Revenue Stats**: MRR (Monthly Recurring Revenue), Churn Rate (from Stripe API).
2. **Webhook Health**: Success/Failure rate graph.
3. **Checkout Funnel**: Upgrade button clicks -> Stripe Session -> Success.
4. **Active Subscriptions**: Pie chart by tier (FREE vs PRO).

### Licensing Dashboard
1. **Quota Usage**: Top features by usage.
2. **Limit Hits**: Histogram of users near 80%, 90%, 100% of limits.
3. **Atomic Conflicts**: Count of PostgreSQL `ON CONFLICT` triggers.

---

## 🛡️ Security Monitoring
- **Suspicious Activity**: Same IP creating > 10 checkout sessions in 1 minute.
- **Unauthorized Admin Access**: Non-admin users attempting to hit `/admin/licensing/*`.
- **Idempotency Hits**: Monitor how many `customer.subscription.updated` events are skipped due to duplicate IDs (detects Stripe retry behavior).

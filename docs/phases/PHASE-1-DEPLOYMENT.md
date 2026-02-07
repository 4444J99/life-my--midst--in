# Phase 1 Production Deployment Guide

This guide covers the deployment of Phase 1 features, specifically the **Billing, Licensing, and Subscription** system integrated with Stripe.

## 🚀 Pre-Deployment Checklist

### 1. Stripe Account Setup
- [ ] Create a Stripe account (https://stripe.com)
- [ ] Enable **Test Mode** for initial deployment
- [ ] Create Products and Prices in Stripe Dashboard
- [ ] Copy `Price ID` for the **PRO** tier
- [ ] Configure **Webhook Endpoint**: `https://api.yourdomain.com/webhooks/stripe`
  - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Get `Stripe Secret Key` and `Webhook Secret`

### 2. Environment Variables
Ensure the following variables are set in your production environment (Vault/1Password):

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe Private API Key | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook Signature Secret | `whsec_...` |
| `STRIPE_PRO_PRICE_ID` | Price ID for PRO tier | `price_...` |
| `APP_BASE_URL` | Public Frontend URL | `https://app.domain.com` |
| `API_BASE_URL` | Public API URL | `https://api.domain.com` |

### 3. Database Migrations
- [ ] Run `011_subscriptions.sql` (Schema for subscriptions)
- [ ] Run `012_rate_limits.sql` (Schema for quota tracking)
- [ ] Run `seed_plans.sql` (Seed initial plan data: FREE, PRO)

---

## 📦 Deployment Steps

### Step 1: Deploy API Service
The API service contains the Stripe webhook handlers and licensing logic.

```bash
# Build and push
docker build -t ghcr.io/user/api:v1.1.0 ./apps/api
docker push ghcr.io/user/api:v1.1.0

# Update Kubernetes
kubectl set image deployment/api api=ghcr.io/user/api:v1.1.0 -n in-midst-my-life
```

### Step 2: Deploy Frontend
The web service contains the checkout buttons and subscription dashboard.

```bash
# Build and push
docker build -t ghcr.io/user/web:v1.1.0 ./apps/web
docker push ghcr.io/user/web:v1.1.0

# Update Kubernetes
kubectl set image deployment/web web=ghcr.io/user/web:v1.1.0 -n in-midst-my-life
```

### Step 3: Verify Webhook Connectivity
Test that Stripe can reach your API:

1. Go to Stripe Dashboard -> Developers -> Webhooks
2. Click your endpoint -> "Test Webhooks"
3. Send a `ping` or `checkout.session.completed` test event
4. Verify 200 OK response

---

## 🛠️ Post-Deployment Verification

### 1. Subscription Flow Test
1. Log in to the application
2. Click "Upgrade to PRO"
3. Complete Stripe Checkout (using test card `4242...`)
4. Verify redirect back to success page
5. Verify account tier is updated to `PRO` in user profile

### 2. Quota Enforcement Test
1. As a `FREE` user, attempt to exceed 5 job searches
2. Verify "Quota Exceeded" message appears
3. Upgrade to `PRO`
4. Verify job search now works immediately

---

## 🔄 Rollback Plan

If critical issues occur (e.g., webhooks failing, users double-charged):

1. **Rollback API**:
   ```bash
   kubectl rollout undo deployment/api -n in-midst-my-life
   ```
2. **Disable Stripe Webhook**: Toggle "Enabled" to "Disabled" in Stripe Dashboard to prevent further processing while investigating.
3. **Database Revert**: (Only if schema changed) Run down-migration.

---

## 📞 Support Contacts
- **Billing Lead**: billing-ops@domain.com
- **Stripe Support**: https://support.stripe.com

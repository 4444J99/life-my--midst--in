# Environment Variables Documentation

This document describes all environment variables used in the
in–midst–my–life system.

## Quick Start

1. Copy `.env.production.example` to `.env.production`
2. Fill in values for your deployment (see sections below)
3. Validate: `pnpm validate-env`
4. Deploy: `docker-compose up`

## Categories

### Database Configuration

#### DATABASE_URL
**Type:** String (PostgreSQL connection string)
**Required:** Yes
**Example:** `postgresql://user:password@db-host:5432/midst_prod`

**Description:**
Primary PostgreSQL database connection. Used by both API and Orchestrator
for profile storage, subscriptions, rate limits, and task queue.

**How to obtain:**
- Self-hosted: Create database and user
- Cloud: Use AWS RDS, DigitalOcean Postgres, or similar
- Format: `postgresql://username:password@hostname:port/database_name`

**Security:**
- Use strong passwords (32+ characters)
- Restrict database access to application IPs only
- Enable SSL/TLS for connections (append `?sslmode=require`)

---

#### POSTGRES_URL (Legacy)
**Type:** String
**Required:** No (deprecated, use DATABASE_URL)
**Example:** Same as DATABASE_URL

**Description:**
Kept for backwards compatibility with older API versions. If not set,
falls back to DATABASE_URL.

---

#### REDIS_URL
**Type:** String (Redis connection URL)
**Required:** Yes
**Example:** `redis://:password@redis-host:6379/0`

**Description:**
Redis connection for caching and task queue. Used by Orchestrator for
background job processing and API for session/quota caching.

**How to obtain:**
- Self-hosted: Install Redis from redis.io
- Cloud: Use AWS ElastiCache, DigitalOcean Redis, or similar
- Format: `redis://[:password@]hostname:port/database_number`

**Security:**
- Use password authentication (append after `:` )
- Don't expose Redis port to public internet
- Use separate Redis databases for different environments (0=prod, 1=staging)

---

### Stripe Integration

#### STRIPE_SECRET_KEY
**Type:** String (Stripe live secret key)
**Required:** Yes
**Example:** `sk_live_abc123def456...`

**Description:**
Stripe live API secret key for processing payments. Only use in production.

**How to obtain:**
1. Sign up at https://stripe.com
2. Create live account (requires business verification)
3. Go to Dashboard → Developers → API Keys
4. Copy "Secret Key" (starts with `sk_live_`)

**Security:**
- NEVER commit real key to git
- Use environment variables or secrets manager
- Rotate key annually or if compromised

---

#### STRIPE_WEBHOOK_SECRET
**Type:** String (Webhook signing secret)
**Required:** Yes
**Example:** `whsec_live_abc123...`

**Description:**
Secret key for verifying Stripe webhook signatures. Prevents spoofed
webhook events.

**How to obtain:**
1. Dashboard → Developers → Webhooks
2. Create new webhook endpoint: `https://yourdomain.com/webhooks/stripe`
3. Select events: customer.subscription.*, invoice.payment.*
4. Reveal "Signing secret" (starts with `whsec_live_`)

**Security:**
- Rotate if compromised
- Use separate endpoints for staging/production

---

#### STRIPE_PRO_MONTHLY, STRIPE_PRO_YEARLY, etc.
**Type:** String (Stripe price IDs)
**Required:** Yes (for each plan)
**Example:** `price_1Lb7abLBSRqDXZG30a7Xq9Jk`

**Description:**
Price IDs for each subscription tier and billing interval.

**How to obtain:**
1. Dashboard → Products
2. Create products: "In-Midst PRO", "In-Midst Enterprise"
3. Create prices (monthly and yearly): Set pricing, currency
4. Copy price ID (starts with `price_`)

**Note:** Must match tier names in code (FREE, PRO, ENTERPRISE)

---

### Authentication & Security

#### JWT_SECRET
**Type:** String (256-bit hex)
**Required:** Yes
**Example:** `a1b2c3d4e5f6g7h8...` (64 hex chars)

**Description:**
Secret key for signing JWT authentication tokens.

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Security:**
- Generate once and store securely
- Use same value across all API instances
- Rotate annually (will invalidate all tokens)

---

#### PROFILE_KEY_ENC_KEY
**Type:** String (256-bit hex)
**Required:** Yes
**Example:** Same format as JWT_SECRET

**Description:**
Encryption key for sensitive profile data at rest. Used for data that
should never be visible to admins (personal info, salary, etc.).

**How to generate:** Same as JWT_SECRET

---

#### SESSION_SECRET
**Type:** String (256-bit hex)
**Required:** Yes
**Example:** Same format as JWT_SECRET

**Description:**
Secret for signing secure cookies in Next.js frontend.

**How to generate:** Same as JWT_SECRET

---

### Cross-Origin Resource Sharing (CORS)

#### ALLOWED_ORIGINS
**Type:** String (comma-separated URLs)
**Required:** Yes
**Example:** `https://app.yourdomain.com,https://yourdomain.com`

**Description:**
Domains allowed to make cross-origin requests to API. Prevents
unauthorized sites from accessing your API.

**For different environments:**
- Development: `http://localhost:3000,http://localhost:3001`
- Staging: `https://staging-app.yourdomain.com`
- Production: `https://app.yourdomain.com,https://yourdomain.com`

**Security:**
- Only include trusted domains
- Be specific (don't use wildcards like *.yourdomain.com)
- Include https:// to restrict to secure connections

---

### Application Configuration

#### NODE_ENV
**Type:** String (development | staging | production)
**Required:** Yes
**Default:** development

**Description:**
Environment mode. Affects error reporting, logging, and feature
availability.

---

#### API_BASE_URL, WEB_BASE_URL
**Type:** String (full URL)
**Required:** Yes
**Examples:**
- API: `https://api.yourdomain.com`
- Web: `https://app.yourdomain.com`

**Description:**
Base URLs for API and frontend. Used in redirects, email links, etc.

---

### Observability & Monitoring

#### SENTRY_DSN
**Type:** String (Sentry DSN URL)
**Required:** Optional
**Example:** `https://abc123def456@sentry.io/project-id`

**Description:**
Sentry error tracking URL. If not provided, errors are logged locally only.

**How to obtain:**
1. Sign up at https://sentry.io
2. Create project for each service (API, Web, Orchestrator)
3. Copy DSN URL from Settings

---

#### LOG_LEVEL
**Type:** String (trace | debug | info | warn | error | fatal)
**Required:** No
**Default:** info

**Description:**
Minimum log level to output. Production should be info or warn.

---

### Feature Flags

#### FEATURE_HUNTER_ENABLED
**Type:** Boolean (true | false)
**Required:** No
**Default:** true

**Description:**
Enable/disable Hunter Protocol job search features. Set to false to
disable feature during maintenance.

---

## Validation

Check environment before deployment:
```bash
pnpm validate-env
```

This script verifies:
- ✓ All required variables are set
- ✓ DATABASE_URL is valid PostgreSQL connection
- ✓ REDIS_URL is valid Redis connection
- ✓ STRIPE keys have correct format
- ✓ JWT/encryption keys are 256-bit hex
- ✓ CORS origins are valid URLs

---

## Per-Environment Examples

### Development
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/midst_dev
REDIS_URL=redis://localhost:6379/0
NODE_ENV=development
JWT_SECRET=dev_secret_do_not_use_in_production
# Stripe: use test keys (sk_test_...)
```

### Staging
```bash
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/midst_staging
REDIS_URL=redis://staging-redis.example.com:6379/0
NODE_ENV=production
SENTRY_DSN=https://...@sentry.io/staging-project
# Stripe: use test keys (sk_test_...)
```

### Production
```bash
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/midst_prod
REDIS_URL=redis://prod-redis.example.com:6379/0
NODE_ENV=production
SENTRY_DSN=https://...@sentry.io/prod-project
# Stripe: use live keys (sk_live_...)
```

---

## Secrets Management Best Practices

1. **Version Control:**
   - ✓ Commit `.env.*.example` files (templates)
   - ✗ Never commit `.env` or `.env.production` files
2. **Deployment:**
   - Use secrets manager (GitHub Secrets, AWS Secrets Manager, etc.)
   - Don't embed secrets in Docker images
   - Inject via environment variables at runtime
3. **Rotation:**
   - Stripe keys: Annually or after compromise
   - JWT secrets: Annually (invalidates all tokens)
   - Encryption keys: Very rarely (data locked to key)
4. **Audit:**
   - Log all access to secrets
   - Monitor for suspicious activity
   - Restrict who can view/modify secrets

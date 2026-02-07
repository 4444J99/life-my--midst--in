# Security Guidelines
## in–midst–my-life Security Checklist & Best Practices

**Version**: 2.0
**Last Updated**: 2026-01-18
**Status**: Pre-production security guidance

---

## Table of Contents

1. [Quick Checklist](#quick-checklist)
2. [Authentication](#authentication)
3. [Authorization](#authorization)
4. [API Security](#api-security)
5. [Database Security](#database-security)
6. [Secret Management](#secret-management)
7. [Input Validation](#input-validation)
8. [Rate Limiting](#rate-limiting)
9. [Audit Logging](#audit-logging)
10. [OWASP Top 10](#owasp-top-10)
11. [Deployment Security](#deployment-security)
12. [Incident Response](#incident-response)
13. [Security Testing](#security-testing)

---

## Quick Checklist

### Pre-Commit
- [ ] No secrets in code (run `gitleaks detect`)
- [ ] No hardcoded credentials
- [ ] `.env` files in `.gitignore`
- [ ] Input validation for all user inputs
- [ ] Parameterized SQL queries (no string concatenation)

### Pre-Deployment
- [ ] All environment variables documented
- [ ] Secrets stored in secure vault (1Password/Vault)
- [ ] Rate limiting configured
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Database credentials rotated
- [ ] Dependency audit clean (`pnpm audit`)

### Production
- [ ] Monitoring and alerting enabled
- [ ] Audit logging active
- [ ] Backup/restore tested
- [ ] Incident response plan documented
- [ ] Security contact published

---

## Authentication

### Current Status
**Authentication is implemented** via JWT bearer tokens with role-based access control.

### Current Implementation

#### JWT Authentication
- **Access tokens**: Short-lived (1 hour), signed with configurable algorithm
- **Refresh tokens**: Long-lived (7 days)
- **Claims**: `sub`, `email`, `roles`, `permissions`, `profileId`
- **Library**: `jose` for JWT operations

#### Middleware Stack
- `createAuthMiddleware()` — Required auth (401 if missing/invalid)
- `createOptionalAuthMiddleware()` — Proceeds without user context if no token
- `createOwnershipMiddleware()` — Ensures user owns the resource (compares `profileId`)
- `createAdminMiddleware()` — Requires admin role (403 if not admin)

#### Global Auth Hook
A three-tier `onRequest` hook applies authentication globally:
- **Public routes** (exact match): `/health`, `/ready`, `/metrics`, `/plans`
- **Public prefixes** (startsWith): `/public-profiles`, `/taxonomy`
- **Optional auth prefixes** (GET-only): `/profiles`, `/masks`, `/epochs`, `/stages`
- All other routes require valid JWT

#### OAuth2/OIDC Integration
Support social login via:
- **Google** — Primary option for most users
- **GitHub** — Developer audience
- **LinkedIn** — Professional identity verification

#### DID-Based Authentication (Future)
For Web3 users:
- Wallet signature authentication
- DID document verification
- Non-custodial identity

### WebSocket Security

GraphQL WebSocket subscriptions (`GET /graphql/ws`) require JWT authentication at connection time:
- `onConnect` validates JWT from `connectionParams.authorization` header
- Unauthenticated connections are rejected (returns `false`)
- Auth is skipped only when `jwtAuth` is not configured (dev mode without JWT secret)
- Depth limiting (max 10) applies to subscription queries
- Introspection disabled in production

### Implementation Checklist
- [x] JWT-based authentication with bearer tokens
- [x] Ownership middleware for resource-level access control
- [x] Admin middleware for privileged operations
- [x] Global auth hook with route categorization
- [x] WebSocket connection-level auth
- [ ] OAuth2 flow with PKCE
- [ ] CSRF protection for cookie-based sessions
- [ ] Account lockout after failed attempts

---

## Authorization

### Role-Based Access Control (RBAC)

#### Planned Roles
| Role | Permissions |
|------|-------------|
| **Owner** | Full access to own profile, billing, data export |
| **Reviewer** | Read-only access to public profile views |
| **Admin** | System administration (internal only) |
| **Agent** | API access with scoped permissions |

### Resource-Based Authorization
```typescript
// Check ownership before modification
function canModifyProfile(user: User, profile: Profile): boolean {
  return profile.identityId === user.identityId || user.role === 'admin';
}
```

### Authorization Middleware
```typescript
// Planned: apps/api/src/middleware/authorize.ts
export function requireAuth(req, reply, done) {
  if (!req.session?.userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
  done();
}

export function requireOwner(req, reply, done) {
  if (req.params.profileId !== req.session.profileId) {
    return reply.code(403).send({ error: 'Forbidden' });
  }
  done();
}
```

### API Key Authentication (Agents)
For Hunter Protocol and external integrations:
- Scoped API keys with limited permissions
- Key rotation capability
- Usage logging and quotas

---

## API Security

### Endpoint Protection

#### Public Endpoints (No Auth)
- `GET /health`
- `GET /ready`
- `GET /taxonomy/*` (reference data)

#### Protected Endpoints (Auth Required)
All profile CRUD, narrative generation, export endpoints.

#### Restricted Endpoints (Internal Only)
- `GET /metrics` - Prometheus metrics
- `POST /webhooks/github` - GitHub webhook ingestion

### Security Headers (Implemented)

Security headers are enforced via `@fastify/helmet` in `apps/api/src/index.ts`:

```typescript
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

Headers set automatically on every response:
- **Content-Security-Policy** — Restricts resource loading origins
- **Strict-Transport-Security** — Forces HTTPS with 1-year max-age and preload
- **X-Content-Type-Options** — Prevents MIME sniffing (`nosniff`)
- **X-Frame-Options** — Prevents clickjacking (`SAMEORIGIN`)
- **X-DNS-Prefetch-Control** — Disables DNS prefetching
- **X-Download-Options** — Prevents IE from opening downloads directly
- **X-Permitted-Cross-Domain-Policies** — Restricts Adobe cross-domain access

> **Note:** Helmet is disabled in test mode to avoid CSP interfering with test harnesses.

### CORS Configuration
```typescript
app.register(require('@fastify/cors'), {
  origin: [
    'https://your-domain.com',
    process.env.NODE_ENV === 'development' && 'http://localhost:3000',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
```

### Request Size Limits
```typescript
app.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file
    files: 5, // Max 5 files per request
  }
});
```

---

## Database Security

### Connection Security
- Use SSL/TLS for all database connections
- Connection string via environment variable (never hardcoded)
- Minimum required permissions for app user

### Credential Isolation
| Environment | Database | Credentials |
|-------------|----------|-------------|
| Development | `midst_dev` | Local dev creds |
| Testing | `midst_test` | Isolated test creds |
| Integration | `midst_integration` | CI-specific creds |
| Production | `midst_prod` | Vault-managed creds |

### SQL Injection Prevention
**Always use parameterized queries:**
```typescript
// CORRECT - Parameterized query
const result = await pool.query(
  'SELECT * FROM profiles WHERE id = $1',
  [profileId]
);

// WRONG - String concatenation (SQL injection risk)
// Never do this: `SELECT * FROM profiles WHERE id = '${profileId}'`
```

### Database User Permissions
```sql
-- App user should NOT have superuser privileges
CREATE USER app_user WITH PASSWORD '...';
GRANT CONNECT ON DATABASE midst_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- Deny DROP, TRUNCATE, CREATE
```

### Data Encryption
- **At rest**: Use database-level encryption (Neon, Supabase)
- **In transit**: TLS required for all connections
- **Sensitive fields**: Consider application-level encryption for PII

---

## Secret Management

### Hierarchy of Secret Storage

| Environment | Method | Tool |
|-------------|--------|------|
| Local Dev | `.env.local` | File (gitignored) |
| CI/CD | Environment variables | GitHub Secrets |
| Production | Secret manager | 1Password / HashiCorp Vault |

### 1Password Integration
```bash
# Load environment from 1Password
# ~/.config/op/load-env.sh

# Project-specific loader
# /path/to/project/*.env.op.sh
op inject -i .env.template -o .env
```

### Required Secrets
| Secret | Used By | Rotation |
|--------|---------|----------|
| `DATABASE_URL` | API, Orchestrator | On compromise |
| `REDIS_URL` | API, Orchestrator | On compromise |
| `GITHUB_WEBHOOK_SECRET` | Orchestrator | Monthly |
| `SERPER_API_KEY` | Hunter Protocol | On compromise |
| `STRIPE_SECRET_KEY` | API (billing) | Annual |
| `SESSION_SECRET` | API (auth) | Quarterly |

### Never Commit
- API keys
- Database passwords
- Webhook secrets
- Private keys
- OAuth client secrets
- JWT signing keys

### Detection
```bash
# Pre-commit hook to detect secrets
pnpm add -D gitleaks
gitleaks detect --source . --verbose

# CI integration
# - name: Secret Scan
#   run: gitleaks detect --source . --fail
```

---

## Input Validation

### Validation Strategy
1. **Schema validation** - Zod at API boundary
2. **Type coercion** - Controlled type conversion
3. **Sanitization** - HTML/XSS prevention
4. **Business rules** - Domain-specific validation

### Zod Schema Validation
```typescript
// apps/api/src/validation/profile.ts
import { z } from 'zod';

export const CreateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).trim(),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(50),
  title: z.string().max(200).optional(),
  headline: z.string().max(500).optional(),
  summaryMarkdown: z.string().max(10000).optional(),
});

// Use in route handler
const parsed = CreateProfileSchema.safeParse(req.body);
if (!parsed.success) {
  return reply.code(400).send({ errors: parsed.error.errors });
}
```

### XSS Prevention
- Sanitize HTML in markdown fields before rendering
- Use Content Security Policy headers
- Escape user content in responses

### File Upload Validation
```typescript
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];

function validateUpload(file: MultipartFile): boolean {
  return (
    allowedMimeTypes.includes(file.mimetype) &&
    file.size <= 10 * 1024 * 1024 // 10MB
  );
}
```

---

## Rate Limiting

### Strategy
Implement multiple layers of rate limiting:

1. **Global** - Protect infrastructure
2. **Per-IP** - Prevent abuse from single source
3. **Per-User** - Fair usage enforcement
4. **Per-Endpoint** - Expensive operation protection

### Implementation
```typescript
// apps/api/src/plugins/rateLimit.ts
app.register(require('@fastify/rate-limit'), {
  global: true,
  max: 100, // requests
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip,
  errorResponseBuilder: (req, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${context.after}`,
  }),
});

// Stricter limit for expensive operations
app.route({
  method: 'POST',
  url: '/profiles/:id/narrative',
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute',
    }
  },
  handler: narrativeHandler,
});
```

### Rate Limits by Tier
| Tier | Requests/Min | Narrative Gen/Min |
|------|--------------|-------------------|
| Free | 30 | 5 |
| Artisan | 100 | 20 |
| Dramatist | 300 | 50 |

### Redis-Based Tracking
```typescript
// Track per-user usage
async function trackUsage(userId: string, action: string): Promise<void> {
  const key = `usage:${userId}:${action}:${getCurrentMinute()}`;
  await redis.incr(key);
  await redis.expire(key, 120); // 2 minute TTL
}
```

---

## Audit Logging

### What to Log
| Category | Events |
|----------|--------|
| **Authentication** | Login, logout, failed attempts, password reset |
| **Authorization** | Permission denied, role changes |
| **Data Access** | Profile views, exports, modifications |
| **API** | Requests, errors, rate limit hits |
| **System** | Startup, shutdown, config changes |

### Log Format
```typescript
interface AuditLog {
  timestamp: string;    // ISO 8601
  level: 'info' | 'warn' | 'error';
  event: string;        // e.g., 'profile.view', 'auth.login'
  userId?: string;
  profileId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}
```

### Implementation
```typescript
// apps/api/src/services/audit.ts
export async function audit(event: AuditEvent): Promise<void> {
  const log: AuditLog = {
    timestamp: new Date().toISOString(),
    level: 'info',
    event: event.type,
    userId: event.userId,
    profileId: event.profileId,
    ip: event.request?.ip,
    userAgent: event.request?.headers['user-agent'],
    details: event.details,
  };

  // Write to database
  await db.query(
    'INSERT INTO audit_logs (data) VALUES ($1)',
    [JSON.stringify(log)]
  );

  // Also log to stdout for aggregation
  console.log(JSON.stringify(log));
}
```

### PII Considerations
- Never log passwords, tokens, or API keys
- Redact sensitive fields (email to `user@***`)
- Log IP addresses but consider GDPR compliance
- Implement log retention policies

---

## OWASP Top 10

### Coverage Matrix

| # | Vulnerability | Mitigation | Status |
|---|---------------|------------|--------|
| 1 | **Broken Access Control** | Authorization middleware, ownership checks | Implemented |
| 2 | **Cryptographic Failures** | TLS everywhere, secure password hashing | Ready |
| 3 | **Injection** | Parameterized queries, Zod validation | Implemented |
| 4 | **Insecure Design** | Security review, threat modeling | Planned |
| 5 | **Security Misconfiguration** | Security headers, defaults review | Ready |
| 6 | **Vulnerable Components** | `pnpm audit`, Dependabot | Ready |
| 7 | **Authentication Failures** | Session management, MFA | Planned |
| 8 | **Software/Data Integrity** | CI/CD security, signed commits | Planned |
| 9 | **Logging Failures** | Audit logging, monitoring | Planned |
| 10 | **SSRF** | URL validation, allowlists | Ready |

### Injection Prevention
```typescript
// SQL - Always parameterize
await pool.query('SELECT * FROM profiles WHERE id = $1', [id]);

// NoSQL/Redis - Validate keys
const key = `profile:${validateUUID(id)}`;

// OS Commands - Use execFile instead of exec
// See: src/utils/execFileNoThrow.ts for safe command execution
```

### SSRF Prevention (Hunter Protocol)
```typescript
// Validate URLs before fetching
const allowedDomains = ['linkedin.com', 'github.com', 'example.com'];

function validateExternalUrl(url: string): boolean {
  const parsed = new URL(url);
  return (
    ['http:', 'https:'].includes(parsed.protocol) &&
    allowedDomains.some(d => parsed.hostname.endsWith(d)) &&
    !isPrivateIP(parsed.hostname)
  );
}
```

---

## Deployment Security

### HTTPS Enforcement
- All production traffic over HTTPS
- HSTS headers with preload
- Redirect HTTP to HTTPS
- Valid SSL certificates (Let's Encrypt / Cloudflare)

### Environment Isolation
```
Development       Staging           Production
-----------       -------           ----------
midst_dev         midst_stage       midst_prod
Local creds       Test creds        Vault creds
No auth           Test auth         Full auth
```

### Container Security
```dockerfile
# Use specific version, not latest
FROM node:22-alpine

# Run as non-root user
RUN addgroup -S app && adduser -S app -G app
USER app

# Don't expose unnecessary ports
EXPOSE 3001
```

### Network Security
- Database not exposed to public internet
- Redis not exposed to public internet
- Only API/web ports exposed via load balancer
- VPC/private networking between services

---

## Incident Response

### Contact
Security issues: security@in-midst-my-life.dev

### Severity Levels
| Level | Description | Response Time |
|-------|-------------|---------------|
| **Critical** | Active exploit, data breach | Immediate |
| **High** | Exploitable vulnerability | < 24 hours |
| **Medium** | Vulnerability requiring auth | < 1 week |
| **Low** | Minor issue, defense in depth | < 1 month |

### Response Procedure
1. **Detect** - Monitoring alert or report
2. **Contain** - Isolate affected systems
3. **Assess** - Determine scope and impact
4. **Remediate** - Fix vulnerability
5. **Recover** - Restore normal operations
6. **Review** - Post-incident analysis

### Playbook: Credential Leak
1. Immediately rotate affected credentials
2. Check audit logs for unauthorized access
3. Invalidate all active sessions
4. Notify affected users if data accessed
5. Update `gitleaks` rules to prevent recurrence

---

## Security Testing

### Automated Testing
```bash
# Dependency vulnerability scan
pnpm audit

# Secret detection
gitleaks detect --source .

# SAST (future)
# Consider: Semgrep, CodeQL
```

### Manual Testing Checklist
- [ ] Authentication bypass attempts
- [ ] Authorization boundary testing
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Rate limit verification
- [ ] Error message information leakage

### Penetration Testing
Schedule professional penetration testing before production launch:
- [ ] External network penetration test
- [ ] Web application security assessment
- [ ] API security review

---

## Compliance Considerations

### GDPR (If serving EU users)
- [ ] Data minimization
- [ ] Purpose limitation
- [ ] Right to erasure (profile deletion)
- [ ] Data export (JSON-LD export exists)
- [ ] Privacy policy
- [ ] Cookie consent

### SOC 2 (Future consideration)
- [ ] Access controls documented
- [ ] Audit logging implemented
- [ ] Encryption at rest and in transit
- [ ] Incident response plan

---

## Related Documents

- [CLAUDE.md](../CLAUDE.md) - Development guidelines
- [DEFINITIONS.md](../DEFINITIONS.md) - Terminology
- [DECISION-LOG.md](../DECISION-LOG.md) - Architecture decisions
- [docs/ENVIRONMENT-VARS.md](ENVIRONMENT-VARS.md) - Environment configuration
- [seed.yaml](../seed.yaml) - Repository constraints

---

**Document Authority**: This document defines security requirements for the project. All code must comply with these guidelines before production deployment.

**Review Schedule**: Security guidelines should be reviewed quarterly and after any security incident.

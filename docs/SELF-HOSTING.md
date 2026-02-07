# Self-Hosting Guide

Deploy `in-midst-my-life` on your own infrastructure with these options.

---

## Quick Deploy Options

### One-Click Deploy (Recommended)

| Platform | Deploy Button | Free Tier | Notes |
|----------|--------------|-----------|-------|
| **Railway** | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/4444J99/life-my--midst--in) | 500 hrs/mo | API + Orchestrator |
| **Render** | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/4444J99/life-my--midst--in) | 750 hrs/mo | Full stack |
| **Vercel** | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/4444J99/life-my--midst--in) | Unlimited | Frontend only |

---

## Full Stack Self-Hosting

### Option 1: Docker Compose (Simplest)

Perfect for VPS deployment (DigitalOcean, Linode, AWS EC2, Hetzner).

```bash
# 1. Clone the repository
git clone https://github.com/4444J99/life-my--midst--in.git
cd life-my--midst--in

# 2. Copy environment template
cp infra/.env.example .env

# 3. Edit environment variables
nano .env
# Set: DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

# 4. Start all services
docker-compose -f infra/docker-compose.prod.yml up -d

# 5. Run migrations
docker-compose -f infra/docker-compose.prod.yml exec api pnpm migrate

# 6. Verify deployment
curl http://localhost:3001/health
```

**Minimum VPS Requirements:**
- 2 vCPU, 4GB RAM, 20GB SSD
- Ubuntu 22.04 or Debian 12
- Docker + Docker Compose installed

**Estimated Cost:** $20-40/month (DigitalOcean, Linode, Hetzner)

---

### Option 2: Free Tier Stack

Run the entire system on free tiers (with usage limits).

| Service | Provider | Free Tier Limit | Setup |
|---------|----------|----------------|-------|
| **Frontend** | Vercel | Unlimited deploys | [Deploy](#vercel-frontend) |
| **API** | Railway | 500 hrs/mo | [Deploy](#railway-api) |
| **Database** | Neon | 0.5GB storage | [Setup](#neon-database) |
| **Redis** | Upstash | 10K commands/day | [Setup](#upstash-redis) |

**Total Monthly Cost: $0** (with usage limits)

---

## Platform-Specific Setup

### Vercel (Frontend)

Deploy the Next.js frontend:

```bash
# Using Vercel CLI
npx vercel --prod

# Or connect GitHub repo at vercel.com
```

**Environment Variables (Vercel Dashboard):**
```
NEXT_PUBLIC_API_URL=https://your-api.railway.app
DATABASE_URL=postgresql://...@neon.tech/midst
```

### Railway (API + Orchestrator)

Deploy backend services:

1. Go to [railway.app/new](https://railway.app/new)
2. Select "Deploy from GitHub repo"
3. Choose `life-my--midst--in`
4. Set service to `apps/api` (or `apps/orchestrator`)

**Environment Variables:**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
PORT=3001
NODE_ENV=production
JWT_SECRET=your-secret-key-min-32-chars
```

### Neon Database

Free PostgreSQL with 0.5GB storage:

1. Create account at [neon.tech](https://neon.tech)
2. Create new project "in-midst-my-life"
3. Copy connection string
4. Run migrations:

```bash
# From local machine
DATABASE_URL=postgresql://...@neon.tech/midst pnpm migrate
```

### Upstash Redis

Free Redis with 10K commands/day:

1. Create account at [upstash.com](https://upstash.com)
2. Create new database
3. Copy connection string (starts with `rediss://`)
4. Add to environment variables

---

## Kubernetes Deployment

For production-grade deployments, use the included Helm charts.

### Prerequisites

- Kubernetes cluster (any provider)
- `kubectl` configured
- `helm` installed

### Quick Deploy

```bash
# Add secrets
kubectl create secret generic inmidst-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=redis-url='redis://...' \
  --from-literal=jwt-secret='your-secret-key'

# Deploy with Helm
helm install inmidst ./infra/helm \
  --set global.domain=inmidst.example.com \
  --set postgres.enabled=false \  # Use managed database
  --set redis.enabled=false       # Use managed Redis

# Verify
kubectl get pods -l app.kubernetes.io/name=inmidst
```

### Helm Values Reference

```yaml
# values.yaml
global:
  domain: inmidst.example.com
  imageTag: latest

api:
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

web:
  replicas: 2

orchestrator:
  replicas: 1

ingress:
  enabled: true
  className: nginx
  tls:
    enabled: true
    secretName: inmidst-tls
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/midst` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | `your-super-secret-key-here-min-32` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | API server port | `3001` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

### Third-Party Services

| Variable | Description | Required |
|----------|-------------|----------|
| `SERPER_API_KEY` | Serper API for job search | For Hunter Protocol |
| `STRIPE_SECRET_KEY` | Stripe for payments | For billing |
| `GITHUB_OAUTH_CLIENT_ID` | GitHub OAuth | For login |
| `LINKEDIN_OAUTH_CLIENT_ID` | LinkedIn OAuth | For login |

---

## Monitoring & Observability

### Health Checks

```bash
# API health
curl https://your-api.example.com/health
# → {"status":"ok"}

# Readiness (checks dependencies)
curl https://your-api.example.com/ready
# → 200 OK (or 503 if dependencies down)

# Prometheus metrics
curl https://your-api.example.com/metrics
```

### Logging

All services output structured JSON logs. Configure aggregation:

**Docker Compose:**
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Kubernetes:**
Use FluentD, Loki, or cloud provider logging.

### Grafana Dashboard

Import the included dashboard:

```bash
# From infra/grafana/dashboards/
kubectl apply -f inmidst-dashboard.yaml
```

---

## Security Checklist

Before deploying to production:

- [ ] Set strong `JWT_SECRET` (min 32 random characters)
- [ ] Enable HTTPS/TLS for all endpoints
- [ ] Configure CORS to only allow your frontend domain
- [ ] Set `NODE_ENV=production`
- [ ] Remove development credentials from `.env`
- [ ] Enable rate limiting
- [ ] Review `docs/SECURITY.md`

---

## Troubleshooting

### Database Connection Failed

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check SSL mode (Neon requires SSL)
DATABASE_URL=postgresql://...?sslmode=require
```

### Redis Connection Failed

```bash
# Test connection
redis-cli -u $REDIS_URL PING

# For Upstash (uses TLS)
REDIS_URL=rediss://...  # Note: rediss:// not redis://
```

### Build Failures

```bash
# Clear cache and rebuild
pnpm clean
pnpm install
pnpm build

# Check Node version (requires 22+)
node --version
```

### Memory Issues

If running on limited RAM (free tier):

```bash
# Reduce Node.js memory
NODE_OPTIONS="--max-old-space-size=512" pnpm start
```

---

## Getting Help

- **GitHub Issues**: [github.com/4444J99/life-my--midst--in/issues](https://github.com/4444J99/life-my--midst--in/issues)
- **Documentation**: See `docs/` directory
- **Community**: Coming soon

---

## Contributing

Found an issue with self-hosting? Contributions welcome!

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

# Deployment Guide

Complete deployment guide for the **In Midst My Life** platform covering Docker Compose (local/staging) and Kubernetes Helm (production) setups.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Migrations](#database-migrations)
- [Monitoring & Observability](#monitoring--observability)
- [Backup & Disaster Recovery](#backup--disaster-recovery)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

**All Deployments:**
- Docker 24+ and Docker Compose 2.0+
- Git
- 1Password CLI (optional, for secrets management)

**Kubernetes Deployments:**
- kubectl 1.28+
- Helm 3.12+
- Access to a Kubernetes cluster (GKE, EKS, AKS, or local minikube)

**Resource Requirements:**

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| API | 0.5-2 cores | 512MB-2GB | - |
| Orchestrator | 1-4 cores | 1GB-4GB | - |
| Web | 0.5-1 cores | 512MB-1GB | - |
| PostgreSQL | 1-2 cores | 2GB-8GB | 20GB-100GB |
| Redis | 0.5-1 cores | 512MB-2GB | 5GB-20GB |

---

## Docker Compose Deployment

Docker Compose is ideal for local development, testing, and small-scale staging environments.

### Step 1: Clone Repository

```bash
git clone https://github.com/anthropics/in-midst-my-life.git
cd in-midst-my-life
```

### Step 2: Configure Environment

Create `.env` file from example:

```bash
cp .env.example .env
```

**Required environment variables:**

```bash
# Database
POSTGRES_USER=midstsvc
POSTGRES_PASSWORD=<secure-password>
POSTGRES_DB=midst

# Redis
REDIS_PASSWORD=<secure-redis-password>
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PORT=6379

# API Configuration
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
POSTGRES_URL=${DATABASE_URL}
PROFILE_REPO=postgres

# Orchestrator Configuration
ORCH_TASK_STORE=postgres
ORCH_PORT=3002
ORCH_WORKER_ENABLED=true
ORCH_SCHEDULER_ENABLED=true
TASK_QUEUE=redis
ORCH_REDIS_URL=redis://redis:6379

# LLM Configuration (Local by default)
ORCH_AGENT_EXECUTOR=local
LOCAL_LLM_API=ollama
LOCAL_LLM_URL=http://host.docker.internal:11434
LOCAL_LLM_ALLOWED_HOSTS=host.docker.internal
LOCAL_LLM_MODEL=llama3.1:8b
ORCH_LLM_RESPONSE_FORMAT=text

# Web Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_ORCH_BASE_URL=http://localhost:3002
WEB_PORT=3000

# Security
NODE_ENV=production
```

**Using 1Password for Secrets:**

```bash
# Load secrets from 1Password
source scripts/secrets.env.op.sh

# Or use 1Password CLI directly
export POSTGRES_PASSWORD=$(op read "op://Dev/postgres/password")
```

### Step 3: Start Services

#### Development Mode (with hot-reload)

```bash
docker-compose up
```

Services will be available at:
- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Orchestrator**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Neo4j**: http://localhost:7474 (browser), localhost:7687 (bolt)

#### Production Mode

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 4: Run Migrations

Run database migrations and seed data:

```bash
# Option 1: Using migrations profile
docker-compose --profile init up migrations

# Option 2: Manually
docker-compose exec api pnpm --filter @in-midst-my-life/api migrate
docker-compose exec api pnpm --filter @in-midst-my-life/api seed
docker-compose exec orchestrator pnpm --filter @in-midst-my-life/orchestrator migrate
docker-compose exec orchestrator pnpm --filter @in-midst-my-life/orchestrator seed
```

### Step 5: Verify Deployment

```bash
# Check service health
curl http://localhost:3001/health
curl http://localhost:3001/ready
curl http://localhost:3002/health

# View logs
docker-compose logs -f api
docker-compose logs -f orchestrator
docker-compose logs -f web

# Check database
docker-compose exec postgres psql -U midstsvc -d midst -c "\dt"
```

### Step 6: Access Application

Open http://localhost:3000 in your browser to access:
- Timeline view
- Graph visualization
- Gallery mode
- Admin Studio

---

## Production Docker Compose

For production or staging without Kubernetes, use the dedicated production compose file:

```bash
# Required env vars
export POSTGRES_PASSWORD=<secure-password>
export JWT_SECRET=<min-32-char-secret>

# Optional external services
export STRIPE_SECRET_KEY=sk_live_...
export OPENAI_API_KEY=sk-...
export SENTRY_DSN=https://...

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

This uses individual Dockerfiles for each service (API, Web, Orchestrator) with:
- **HEALTHCHECK** on every container (Postgres, Redis, API, Web, Orchestrator)
- **pgvector** PostgreSQL image for semantic search support
- **Non-root** users in all application containers
- **dumb-init** as PID 1 for proper signal handling

### Verify Health

```bash
# Check all containers are healthy
docker compose -f docker-compose.prod.yml ps

# API health check
curl http://localhost:3001/health

# Service status (requires admin JWT)
curl -H "Authorization: Bearer <token>" http://localhost:3001/v1/admin/service-status
```

---

## Kubernetes Deployment

Kubernetes deployment using Helm charts for production environments.

### Architecture Overview

```mermaid
graph TB
    subgraph "Ingress Layer"
        ING[Ingress Controller]
    end
    
    subgraph "Application Layer"
        WEB[Web Deployment<br/>Next.js]
        API[API Deployment<br/>Fastify]
        ORCH[Orchestrator Deployment<br/>Workers]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>StatefulSet)]
        REDIS[(Redis<br/>StatefulSet)]
        NEO4J[(Neo4j<br/>Optional)]
    end
    
    subgraph "Jobs"
        MIG[Migrations Job]
        SEED[Seed Job]
    end
    
    ING --> WEB
    ING --> API
    WEB --> API
    WEB --> ORCH
    API --> PG
    API --> REDIS
    ORCH --> PG
    ORCH --> REDIS
    MIG -.->|init| PG
    SEED -.->|init| PG
```

### Step 1: Prepare Kubernetes Cluster

**For GKE (Google Kubernetes Engine):**

```bash
gcloud container clusters create inmidst-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10
```

**For EKS (Amazon Elastic Kubernetes Service):**

```bash
eksctl create cluster \
  --name inmidst-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10
```

**For local testing (minikube):**

```bash
minikube start --cpus=4 --memory=8192
```

### Step 2: Install Helm Chart

Navigate to the Helm chart directory:

```bash
cd infra/helm
```

**Review/customize `values.yaml`:**

```yaml
# infra/helm/values.yaml
global:
  domain: inmidstmylife.com
  environment: production

api:
  replicaCount: 2
  image:
    repository: gcr.io/inmidst/api
    tag: "0.2.0"
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 2Gi

orchestrator:
  replicaCount: 3
  image:
    repository: gcr.io/inmidst/orchestrator
    tag: "0.2.0"
  resources:
    requests:
      cpu: 1000m
      memory: 1Gi
    limits:
      cpu: 4000m
      memory: 4Gi

web:
  replicaCount: 2
  image:
    repository: gcr.io/inmidst/web
    tag: "0.2.0"
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

postgres:
  persistence:
    size: 50Gi
    storageClass: standard-rwo
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi

redis:
  persistence:
    size: 10Gi
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
```

### Step 3: Create Kubernetes Secrets

```bash
# Create namespace
kubectl create namespace inmidst

# Create secret for database credentials
kubectl create secret generic postgres-creds \
  --from-literal=username=midstsvc \
  --from-literal=password=<secure-password> `# allow-secret - placeholder` \
  --from-literal=database=midst \
  -n inmidst

# Create secret for Redis
kubectl create secret generic redis-creds \
  --from-literal=password=<secure-password> `# allow-secret - placeholder` \
  -n inmidst

# Create secret for JWT tokens
kubectl create secret generic jwt-secret \
  --from-literal=secret=<jwt-secret-key> `# allow-secret - placeholder` \
  -n inmidst
```

**Using 1Password for secrets:**

```bash
# Export secrets from 1Password
export POSTGRES_PASSWORD=$(op read "op://Production/postgres/password")
export REDIS_PASSWORD=$(op read "op://Production/redis/password")
export JWT_SECRET=$(op read "op://Production/jwt/secret")

# Create secrets
kubectl create secret generic postgres-creds \
  --from-literal=username=midstsvc \
  --from-literal=password=$POSTGRES_PASSWORD \
  --from-literal=database=midst \
  -n inmidst
```

### Step 4: Install Helm Release

```bash
# Install (first time)
helm install inmidst . \
  --namespace inmidst \
  --values values.yaml \
  --values values.production.yaml

# Upgrade (subsequent deployments)
helm upgrade inmidst . \
  --namespace inmidst \
  --values values.yaml \
  --values values.production.yaml

# Rollback if needed
helm rollback inmidst -n inmidst
```

### Step 5: Run Migrations

Migrations run automatically via Kubernetes Job on install/upgrade:

```bash
# Check migration job status
kubectl get jobs -n inmidst
kubectl logs job/inmidst-migrations -n inmidst

# Manually trigger migrations if needed
kubectl create job --from=job/inmidst-migrations inmidst-migrations-manual -n inmidst
```

### Step 6: Configure Ingress

**NGINX Ingress Controller:**

```bash
# Install NGINX ingress controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Apply ingress rules
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: inmidst-ingress
  namespace: inmidst
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - inmidstmylife.com
    - api.inmidstmylife.com
    secretName: inmidst-tls
  rules:
  - host: inmidstmylife.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: inmidst-web
            port:
              number: 3000
  - host: api.inmidstmylife.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: inmidst-api
            port:
              number: 3001
EOF
```

### Step 7: Setup TLS/SSL with cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create Let's Encrypt issuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: padavano.anthony@gmail.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### Step 8: Verify Deployment

```bash
# Check pod status
kubectl get pods -n inmidst

# Check services
kubectl get svc -n inmidst

# Check ingress
kubectl get ingress -n inmidst

# View logs
kubectl logs -l app=inmidst-api -n inmidst
kubectl logs -l app=inmidst-orchestrator -n inmidst

# Test health endpoints
kubectl port-forward svc/inmidst-api 3001:3001 -n inmidst
curl http://localhost:3001/health
```

### CI/CD: GitHub Actions Deploy Workflow

The `.github/workflows/deploy.yml` workflow automates container builds and Kubernetes deployment:

1. **Build phase** — builds and pushes three Docker images (API, Web, Orchestrator) to GHCR with layer caching
2. **Deploy phase** — uses `helm upgrade --install` with `--set` flags to inject the Git SHA as the image tag:

```bash
helm upgrade --install in-midst-my-life ./infra/helm \
  --set "api.image.tag=${IMAGE_TAG}" \
  --set "web.image.tag=${IMAGE_TAG}" \
  --set "orchestrator.image.tag=${IMAGE_TAG}"
```

**Required secrets:**
- `KUBECONFIG` — base64-encoded kubeconfig for the target cluster

The workflow runs on pushes to `master` and can be triggered manually via `workflow_dispatch`.

---

## Environment Configuration

### Environment Variables Reference

#### API Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `POSTGRES_URL` | Yes | - | Same as DATABASE_URL (alias) |
| `REDIS_URL` | No | - | Redis connection string (include password: `redis://:pass@host:6379`) |
| `REDIS_PASSWORD` | Prod | - | Redis `requirepass` value; wired into REDIS_URL in docker-compose.prod |
| `PROFILE_REPO` | Yes | `postgres` | Profile repository type |
| `NODE_ENV` | Yes | `development` | Environment (development/production) |
| `PORT` | No | `3001` | API server port |
| `LOG_LEVEL` | No | `info` | Logging level |
| `JWT_SECRET` | Yes | - | JWT signing secret (min 32 chars) |
| `STRIPE_SECRET_KEY` | No | `sk_test_mock` | Stripe API key (mock if omitted) |
| `STRIPE_WEBHOOK_SECRET` | No | `whsec_test_mock` | Stripe webhook signing secret |
| `OPENAI_API_KEY` | No | `sk-test-mock` | OpenAI key for embeddings (mock if omitted) |
| `SENTRY_DSN` | No | - | Sentry error reporting DSN |
| `ALLOWED_ORIGINS` | No | localhost | Comma-separated CORS origins |

#### Orchestrator Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `ORCH_TASK_STORE` | Yes | `postgres` | Task store backend |
| `REDIS_URL` | Yes | - | Redis connection for queue |
| `ORCH_PORT` | No | `3002` | Orchestrator port |
| `ORCH_WORKER_ENABLED` | Yes | `true` | Enable background workers |
| `ORCH_SCHEDULER_ENABLED` | Yes | `true` | Enable task scheduler |
| `ORCH_AGENT_EXECUTOR` | Yes | `local` | Agent executor (local/stub) |
| `LOCAL_LLM_URL` | No | - | Local LLM API endpoint |
| `LOCAL_LLM_MODEL` | No | `llama3.1:8b` | Model name |
| `ORCH_LLM_RESPONSE_FORMAT` | No | `text` | Response format (text/structured-json) |
| `ORCH_TOOL_ALLOWLIST` | No | - | Comma-separated tool names |

#### Web Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | - | API base URL |
| `NEXT_PUBLIC_ORCH_BASE_URL` | No | - | Orchestrator base URL |
| `NEXT_PUBLIC_GRAPH_LAYOUT` | No | `radial` | Graph layout (radial/force) |

---

## Database Migrations

### Running Migrations

**Docker Compose:**

```bash
# API migrations
docker-compose exec api pnpm --filter @in-midst-my-life/api migrate

# Orchestrator migrations
docker-compose exec orchestrator pnpm --filter @in-midst-my-life/orchestrator migrate
```

**Kubernetes:**

```bash
# Migrations run automatically on deployment via Job
# Check status:
kubectl get jobs -n inmidst
kubectl logs job/inmidst-migrations -n inmidst

# Manual migration:
kubectl create job --from=job/inmidst-migrations manual-migration -n inmidst
```

**Local Development:**

```bash
# Start services
./scripts/dev-up.sh

# Run migrations
pnpm --filter @in-midst-my-life/api migrate
pnpm --filter @in-midst-my-life/orchestrator migrate
```

### Seeding Data

**Development/Staging:**

```bash
# Docker Compose
docker-compose exec api pnpm --filter @in-midst-my-life/api seed
docker-compose exec orchestrator pnpm --filter @in-midst-my-life/orchestrator seed

# Local
pnpm --filter @in-midst-my-life/api seed
pnpm --filter @in-midst-my-life/orchestrator seed
```

**Production:**

⚠️ Seeds use `ON CONFLICT DO NOTHING` and are safe to re-run, but review seed files before running in production.

### Migration Best Practices

1. **Always backup before migrations**
2. **Test migrations in staging first**
3. **Migrations are idempotent by design**
4. **Use separate databases for dev/test/prod**
5. **Keep migration history in git**

---

## Monitoring & Observability

### Health Checks

All services expose health endpoints:

```bash
# API health
curl http://localhost:3001/health

# API readiness (checks DB/Redis)
curl http://localhost:3001/ready

# Orchestrator health
curl http://localhost:3002/health
```

### Metrics

Prometheus-compatible metrics:

```bash
# API metrics
curl http://localhost:3001/metrics

# Orchestrator metrics
curl http://localhost:3002/metrics
```

**⚠️ Security:** Restrict `/metrics` endpoint in production via:
- Ingress authentication
- IP allowlist
- Network policies
- Service mesh policies

### Kubernetes Probes

Configured in Helm templates:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Logging

**Docker Compose:**

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f orchestrator
docker-compose logs -f web

# Filter by severity
docker-compose logs api | grep ERROR
```

**Kubernetes:**

```bash
# View pod logs
kubectl logs -l app=inmidst-api -n inmidst
kubectl logs -l app=inmidst-orchestrator -n inmidst --tail=100 -f

# Stream logs
kubectl logs -f deployment/inmidst-api -n inmidst
```

### Performance Monitoring

**API Response Times (p95 targets):**
- Profile reads: <120ms
- Narrative builds: <300ms
- JSON-LD export: <200ms
- PDF export: <450ms

**Monitor using:**
- Prometheus + Grafana
- Application Performance Monitoring (APM) tools
- Custom dashboards via `/metrics` endpoint

---

## Backup & Disaster Recovery

### PostgreSQL Backups

**Automated Backups (Kubernetes):**

```bash
# Create CronJob for daily backups
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: inmidst
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            env:
            - name: PGHOST
              value: postgres
            - name: PGUSER
              valueFrom:
                secretKeyRef:
                  name: postgres-creds
                  key: username
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-creds
                  key: password
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -d midst | gzip > /backup/midst-\$(date +%Y%m%d).sql.gz
            volumeMounts:
            - name: backup
              mountPath: /backup
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
EOF
```

**Manual Backup:**

```bash
# Docker Compose
docker-compose exec postgres pg_dump -U midstsvc midst > backup.sql

# Kubernetes
kubectl exec -n inmidst postgres-0 -- pg_dump -U midstsvc midst > backup.sql
```

### Redis Backups

Redis uses AOF (Append Only File) persistence by default in our configuration:

```bash
# Trigger manual save
docker-compose exec redis redis-cli BGSAVE

# Copy RDB file
docker cp inmidst-redis:/data/dump.rdb ./backup/
```

### Restore Procedures

**PostgreSQL Restore:**

```bash
# Docker Compose
docker-compose exec -T postgres psql -U midstsvc midst < backup.sql

# Kubernetes
kubectl exec -i -n inmidst postgres-0 -- psql -U midstsvc midst < backup.sql
```

**Redis Restore:**

```bash
# Copy RDB file to container
docker cp backup/dump.rdb inmidst-redis:/data/

# Restart Redis
docker-compose restart redis
```

---

## Security Hardening

### Network Security

**Docker Compose:**

```yaml
# Use internal networks
networks:
  backend:
    driver: bridge
    internal: true
  frontend:
    driver: bridge
```

**Kubernetes:**

```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: inmidst-network-policy
spec:
  podSelector:
    matchLabels:
      app: inmidst
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: inmidst
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    - podSelector:
        matchLabels:
          app: redis
```

### Secrets Management

**Best Practices:**
1. **Never commit secrets to git**
2. **Use 1Password or similar secret managers**
3. **Rotate secrets regularly**
4. **Use different secrets per environment**

**1Password Integration:**

```bash
# Load secrets from 1Password
source scripts/secrets.env.op.sh

# Or use op CLI directly
export DATABASE_URL=$(op read "op://Production/postgres/url")
```

**Kubernetes Secrets:**

```bash
# Use sealed-secrets for GitOps
kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

### TLS/SSL Configuration

**Enable HTTPS for all public endpoints:**

```yaml
# Ingress with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - inmidstmylife.com
    secretName: inmidst-tls
```

### Database Security

1. **Use strong passwords**
2. **Enable SSL for database connections**
3. **Restrict database access to application pods only**
4. **Regular security audits**

```bash
# Enable PostgreSQL SSL
# In postgresql.conf:
ssl = on
ssl_cert_file = '/var/lib/postgresql/server.crt'
ssl_key_file = '/var/lib/postgresql/server.key'
```

---

## Troubleshooting

### Common Issues

#### Database Connection Errors

**Symptom:** `ECONNREFUSED` or `connection timeout`

**Solutions:**

```bash
# Check PostgreSQL is running
docker-compose ps postgres
kubectl get pods -l app=postgres -n inmidst

# Check connection string
echo $DATABASE_URL

# Test connection
docker-compose exec postgres psql -U midstsvc midst -c "SELECT 1"

# Check network connectivity
docker-compose exec api ping postgres
```

#### Redis Connection Errors

**Symptom:** `Redis connection failed`

**Solutions:**

```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check URL format
echo $REDIS_URL  # Should be redis://redis:6379
```

#### Migration Failures

**Symptom:** `Migration failed` errors

**Solutions:**

```bash
# Check database exists
docker-compose exec postgres psql -U midstsvc -l

# Check migrations table
docker-compose exec postgres psql -U midstsvc midst -c "\dt migrations"

# Re-run migrations (idempotent)
docker-compose exec api pnpm --filter @in-midst-my-life/api migrate

# Check migration logs
docker-compose logs api | grep migration
```

#### Port Conflicts

**Symptom:** `Port already in use`

**Solutions:**

```bash
# Check what's using the port
lsof -i :3001
lsof -i :5432

# Change ports in .env
WEB_PORT=3010
REDIS_PORT=6380

# Restart services
docker-compose down && docker-compose up
```

#### OOM (Out of Memory) Errors

**Symptom:** Pods/containers crashing

**Solutions:**

```bash
# Check resource usage
docker stats
kubectl top pods -n inmidst

# Increase memory limits
# In docker-compose.yml or Helm values.yaml:
resources:
  limits:
    memory: 4Gi
```

#### Orchestrator Not Processing Jobs

**Symptom:** Jobs stuck in queue

**Solutions:**

```bash
# Check worker is enabled
echo $ORCH_WORKER_ENABLED  # Should be "true"

# Check Redis connection
docker-compose exec orchestrator node -e "require('redis').createClient({url: process.env.REDIS_URL}).ping().then(console.log)"

# Check job queue
docker-compose exec redis redis-cli LLEN "bull:task-queue:waiting"

# View orchestrator logs
docker-compose logs -f orchestrator | grep worker
```

### Diagnostic Commands

**System Health:**

```bash
# Check all services
docker-compose ps
kubectl get all -n inmidst

# Check service health
curl http://localhost:3001/health
curl http://localhost:3001/ready

# Database connectivity
docker-compose exec api node -e "const {Pool}=require('pg');new Pool({connectionString:process.env.DATABASE_URL}).query('SELECT NOW()').then(r=>console.log(r.rows[0]))"
```

**Logs & Events:**

```bash
# Docker Compose logs
docker-compose logs --tail=100 -f

# Kubernetes logs
kubectl logs -f deployment/inmidst-api -n inmidst
kubectl logs -f deployment/inmidst-orchestrator -n inmidst

# Kubernetes events
kubectl get events -n inmidst --sort-by='.lastTimestamp'
```

**Database Inspection:**

```bash
# Connect to database
./scripts/dev-shell.sh postgres

# Check tables
\dt

# Check row counts
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM experiences;
```

---

## Additional Resources

- **Developer Guide**: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Troubleshooting Guide**: [TROUBLESHOOTING.md](./operations/TROUBLESHOOTING.md)
- **Security Guide**: [SECURITY.md](./SECURITY.md)
- **Architecture Documentation**: [ARCH-001-system-architecture.md](../ARCH-001-system-architecture.md)
- **Hunter Protocol Guide**: [HUNTER-PROTOCOL.md](./features/hunter-protocol/HUNTER-PROTOCOL.md)

---

## Support

- **GitHub Issues**: https://github.com/anthropics/in-midst-my-life/issues
- **Email**: padavano.anthony@gmail.com
- **Documentation**: https://github.com/anthropics/in-midst-my-life/docs

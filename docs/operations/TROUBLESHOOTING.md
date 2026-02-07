# Troubleshooting Guide

Common errors, debugging strategies, and solutions for the **In Midst My Life** platform.

---

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Database Issues](#database-issues)
- [Redis & Caching Issues](#redis--caching-issues)
- [API Errors](#api-errors)
- [Orchestrator & Job Queue Issues](#orchestrator--job-queue-issues)
- [Frontend Issues](#frontend-issues)
- [Development Environment](#development-environment)
- [Deployment Issues](#deployment-issues)
- [Performance Issues](#performance-issues)
- [LLM & Agent Issues](#llm--agent-issues)

---

## Quick Diagnostics

### Health Check Script

Run this first to diagnose system health:

```bash
#!/bin/bash
# save as: scripts/health-check.sh

echo "🔍 Running system diagnostics..."

echo "\n1. Checking services..."
docker-compose ps

echo "\n2. Testing API health..."
curl -s http://localhost:3001/health || echo "❌ API unreachable"
curl -s http://localhost:3001/ready || echo "❌ API not ready"

echo "\n3. Testing database connection..."
docker-compose exec -T postgres pg_isready -U midstsvc || echo "❌ PostgreSQL not ready"

echo "\n4. Testing Redis..."
docker-compose exec -T redis redis-cli ping || echo "❌ Redis not responding"

echo "\n5. Checking logs for errors..."
docker-compose logs --tail=50 api | grep -i error
docker-compose logs --tail=50 orchestrator | grep -i error

echo "\n✅ Diagnostics complete"
```

### Common Commands

```bash
# View all container status
docker-compose ps

# Check service logs
docker-compose logs -f api
docker-compose logs -f orchestrator
docker-compose logs --tail=100 api

# Restart specific service
docker-compose restart api

# Full restart
docker-compose down && docker-compose up -d

# Check port usage
lsof -i :3001
lsof -i :5432
```

---

## Database Issues

### Error: `ECONNREFUSED` - Cannot Connect to Database

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres
```

**Solutions:**

1. **PostgreSQL not started:**
   ```bash
   ./scripts/dev-up.sh
   # or
   docker-compose up postgres -d
   ```

2. **Wrong connection string:**
   ```bash
   # Check environment variable
   echo $DATABASE_URL
   
   # Should be:
   postgresql://midstsvc:password@localhost:5432/midst_dev
   
   # For Docker services:
   postgresql://midstsvc:password@postgres:5432/midst
   ```

3. **Port conflict:**
   ```bash
   # Check what's using port 5432
   lsof -i :5432
   
   # Change port in .env
   POSTGRES_PORT=5433
   
   # Update DATABASE_URL accordingly
   ```

4. **Container networking issue:**
   ```bash
   # Verify network
   docker network ls
   docker network inspect in-midst-my-life_default
   
   # Recreate network
   docker-compose down
   docker-compose up -d
   ```

---

### Error: `relation "profiles" does not exist`

**Symptoms:**
```
ERROR: relation "profiles" does not exist
```

**Diagnosis:**

```bash
# Connect to database
./scripts/dev-shell.sh postgres

# In psql:
\dt                    # List all tables
```

**Solution:**

```bash
# Run migrations
pnpm --filter @in-midst-my-life/api migrate
pnpm --filter @in-midst-my-life/orchestrator migrate

# Verify tables exist
./scripts/dev-shell.sh postgres
# In psql:
\dt
SELECT COUNT(*) FROM profiles;
```

---

### Error: Migration Failed

**Symptoms:**
```
Migration failed: duplicate column name
```

**Diagnosis:**

```bash
# Check migration status
./scripts/dev-shell.sh postgres
# In psql:
SELECT * FROM migrations ORDER BY applied_at DESC;
```

**Solutions:**

1. **Migration already applied:**
   - Migrations are idempotent by design
   - Check if table/column already exists

2. **Partial migration:**
   ```bash
   # Rollback (if DOWN statements exist)
   # Edit migration file with proper DOWN
   
   # Re-run migration
   pnpm --filter @in-midst-my-life/api migrate
   ```

3. **Database in bad state:**
   ```bash
   # DANGER: Nuclear option (dev only)
   docker-compose down -v  # Removes volumes
   docker-compose up postgres -d
   pnpm --filter @in-midst-my-life/api migrate
   pnpm --filter @in-midst-my-life/api seed
   ```

---

### Error: `too many connections`

**Symptoms:**
```
FATAL: sorry, too many clients already
```

**Solutions:**

1. **Close unused connections:**
   ```bash
   ./scripts/dev-shell.sh postgres
   # In psql:
   SELECT COUNT(*) FROM pg_stat_activity;
   
   # Kill idle connections
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND query_start < NOW() - INTERVAL '5 minutes';
   ```

2. **Increase max_connections:**
   ```yaml
   # docker-compose.yml
   postgres:
     command: postgres -c max_connections=200
   ```

3. **Connection pooling:**
   - Check API uses connection pooling (default in our setup)
   - Verify pool size is appropriate (default: 10)

---

## Redis & Caching Issues

### Error: `Redis connection failed`

**Symptoms:**
```
Error: Redis connection to redis:6379 failed
```

**Diagnosis:**

```bash
# Check Redis status
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping
```

**Solutions:**

1. **Redis not started:**
   ```bash
   ./scripts/dev-up.sh
   # or
   docker-compose up redis -d
   ```

2. **Wrong Redis URL:**
   ```bash
   echo $REDIS_URL
   
   # Should be:
   redis://redis:6379          # From Docker containers
   redis://localhost:6379      # From host machine
   ```

3. **Redis auth required but not provided:**
   ```bash
   # If Redis has password
   redis://:<password>@redis:6379
   ```

---

### Error: Cache Inconsistency

**Symptoms:**
- Stale data returned
- Taxonomy changes not reflected

**Solutions:**

1. **Clear cache manually:**
   ```bash
   ./scripts/dev-shell.sh redis
   # In redis-cli:
   FLUSHDB         # Clear current database
   FLUSHALL        # Clear all databases
   ```

2. **Clear specific keys:**
   ```bash
   ./scripts/dev-shell.sh redis
   # In redis-cli:
   KEYS taxonomy:*  # Find taxonomy keys
   DEL taxonomy:masks taxonomy:epochs taxonomy:stages
   ```

3. **Disable caching (dev only):**
   ```bash
   # Set in .env
   REDIS_URL=  # Empty = use in-memory fallback
   ```

---

## API Errors

### Error: `401 Unauthorized`

**Symptoms:**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

**Solutions:**

1. **Missing Authorization header:**
   ```bash
   # Include JWT token
   curl -H "Authorization: Bearer <your-jwt-token>" \
     http://localhost:3001/profiles
   ```

2. **Expired token:** <!-- allow-secret - documentation example -->
   - Obtain new token from auth provider
   - Check token expiry: https://jwt.io

3. **Invalid token signature:**
   - Verify JWT_SECRET matches between services
   - Check token issuer/audience claims

---

### Error: `404 Not Found`

**Symptoms:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Profile not found"
  }
}
```

**Diagnosis:**

```bash
# Check if resource exists in database
./scripts/dev-shell.sh postgres
# In psql:
SELECT * FROM profiles WHERE id = '<uuid>';
```

**Solutions:**

1. **Resource doesn't exist:**
   - Create the resource first
   - Check if ID is correct (UUID format)

2. **Soft-deleted:**
   ```sql
   SELECT * FROM profiles WHERE id = '<uuid>' AND is_active = true;
   ```

---

### Error: `429 Too Many Requests` / `QUOTA_EXCEEDED`

**Symptoms:**
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Monthly quota exceeded for this feature",
    "details": {
      "feature": "resume_tailoring",
      "limit": 5,
      "used": 5,
      "resetDate": "2025-02-01T00:00:00Z"
    }
  }
}
```

**Solutions:**

1. **Upgrade tier:**
   - FREE → PRO → ENTERPRISE

2. **Wait for quota reset:**
   - Check `resetDate` in error response

3. **Bypass in development:**
   ```bash
   # Set env var (dev only)
   DISABLE_RATE_LIMITING=true
   ```

---

### Error: `500 Internal Server Error`

**Symptoms:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

**Diagnosis:**

```bash
# Check API logs
docker-compose logs api | tail -100

# Look for stack traces
docker-compose logs api | grep -A 20 "Error:"
```

**Solutions:**

1. **Database connection issue:**
   - See [Database Issues](#database-issues)

2. **Uncaught exception:**
   - Check logs for stack trace
   - File bug report with reproduction steps

3. **Resource exhaustion:**
   - Check memory/CPU usage
   - Restart service: `docker-compose restart api`

---

## Orchestrator & Job Queue Issues

### Error: Jobs Not Processing

**Symptoms:**
- Jobs stuck in `pending` status
- Queue growing but not draining

**Diagnosis:**

```bash
# Check orchestrator is running
docker-compose ps orchestrator

# Check worker is enabled
docker-compose exec orchestrator printenv | grep ORCH_WORKER_ENABLED

# Check Redis queue length
./scripts/dev-shell.sh redis
# In redis-cli:
LLEN "bull:task-queue:waiting"
LLEN "bull:task-queue:active"
LLEN "bull:task-queue:failed"
```

**Solutions:**

1. **Worker not enabled:**
   ```bash
   # Set in .env
   ORCH_WORKER_ENABLED=true
   
   # Restart orchestrator
   docker-compose restart orchestrator
   ```

2. **Redis connection issue:**
   ```bash
   # Check REDIS_URL or ORCH_REDIS_URL
   echo $ORCH_REDIS_URL
   
   # Should be:
   redis://redis:6379
   ```

3. **Job handler not registered:**
   ```bash
   # Check orchestrator logs
   docker-compose logs orchestrator | grep "Registering handler"
   
   # Ensure task type matches registered handlers
   ```

4. **Job failing silently:**
   ```bash
   # Check failed queue
   ./scripts/dev-shell.sh redis
   # In redis-cli:
   LRANGE "bull:task-queue:failed" 0 -1
   ```

---

### Error: LLM Agent Timeout

**Symptoms:**
```
Error: LLM request timeout after 30s
```

**Solutions:**

1. **Local LLM not running:**
   ```bash
   # Check Ollama is running
   curl http://localhost:11434/api/tags
   
   # Start Ollama
   ollama serve
   
   # Pull model if needed
   ollama pull llama3.1:8b
   ```

2. **Wrong LLM URL:**
   ```bash
   # For local development
   LOCAL_LLM_URL=http://localhost:11434
   
   # For Docker containers
   LOCAL_LLM_URL=http://host.docker.internal:11434
   LOCAL_LLM_ALLOWED_HOSTS=host.docker.internal
   ```

3. **Use stub executor (no LLM):**
   ```bash
   # Set in .env
   ORCH_AGENT_EXECUTOR=stub
   ```

---

## Frontend Issues

### Error: `hydration failed` in Next.js

**Symptoms:**
```
Error: Hydration failed because the initial UI does not match what was rendered on the server.
```

**Solutions:**

1. **Client-only rendering:**
   ```typescript
   'use client';
   
   import dynamic from 'next/dynamic';
   
   const ClientComponent = dynamic(() => import('./ClientComponent'), {
     ssr: false,
   });
   ```

2. **Date/time formatting:**
   ```typescript
   // Use consistent formatting
   const date = new Date(dateString).toISOString();
   ```

3. **Browser extensions:**
   - Disable browser extensions
   - Test in incognito mode

---

### Error: API calls failing from frontend

**Symptoms:**
```
Failed to fetch: net::ERR_CONNECTION_REFUSED
```

**Diagnosis:**

```bash
# Check API is running
curl http://localhost:3001/health

# Check NEXT_PUBLIC_API_BASE_URL
echo $NEXT_PUBLIC_API_BASE_URL
```

**Solutions:**

1. **API not running:**
   ```bash
   pnpm --filter @in-midst-my-life/api dev
   ```

2. **Wrong API URL:**
   ```bash
   # Set in .env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   ```

3. **CORS issue:**
   - Check API CORS configuration
   - Ensure origin is allowed

---

### Error: D3 Graph Not Rendering

**Symptoms:**
- Blank graph area
- Console error: `Cannot read property 'append' of null`

**Solutions:**

1. **Container ref not attached:**
   ```typescript
   const containerRef = useRef<HTMLDivElement>(null);
   
   useEffect(() => {
     if (!containerRef.current) return;
     // ... D3 code
   }, []);
   
   return <div ref={containerRef} />;
   ```

2. **Dynamic import for D3:**
   ```typescript
   const D3Graph = dynamic(() => import('./D3Graph'), {
     ssr: false,
   });
   ```

3. **Fallback to radial layout:**
   ```bash
   # Set in .env
   NEXT_PUBLIC_GRAPH_LAYOUT=radial
   ```

---

## Development Environment

### Error: `pnpm install` fails

**Symptoms:**
```
ERR_PNPM_LOCKFILE_BROKEN_NODE_MODULES
```

**Solutions:**

```bash
# Clean install
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# If still failing, clear pnpm cache
pnpm store prune
pnpm install
```

---

### Error: TypeScript errors after update

**Symptoms:**
```
Type 'X' is not assignable to type 'Y'
```

**Solutions:**

```bash
# Rebuild all packages
pnpm build

# Clear TypeScript cache
rm tsconfig.tsbuildinfo
rm -rf apps/*/tsconfig.tsbuildinfo
rm -rf packages/*/tsconfig.tsbuildinfo

# Re-run typecheck
pnpm typecheck
```

---

### Error: Port already in use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port
# In .env:
API_PORT=3011
```

---

## Deployment Issues

### Error: Kubernetes Pod CrashLoopBackOff

**Diagnosis:**

```bash
# Check pod status
kubectl get pods -n inmidst

# View pod logs
kubectl logs <pod-name> -n inmidst

# Describe pod for events
kubectl describe pod <pod-name> -n inmidst
```

**Common Causes:**

1. **Missing environment variables:**
   ```bash
   # Check pod environment
   kubectl exec <pod-name> -n inmidst -- printenv
   ```

2. **Database connection failure:**
   - Check DATABASE_URL secret
   - Verify database is accessible from cluster

3. **Image pull error:**
   ```bash
   # Check image exists
   docker pull <image-name>:<tag>
   
   # Check image pull secrets
   kubectl get secrets -n inmidst
   ```

---

### Error: Helm Install Failed

**Diagnosis:**

```bash
# Check Helm release status
helm status inmidst -n inmidst

# View release history
helm history inmidst -n inmidst

# Get error details
helm get notes inmidst -n inmidst
```

**Solutions:**

1. **Rollback to previous version:**
   ```bash
   helm rollback inmidst -n inmidst
   ```

2. **Uninstall and reinstall:**
   ```bash
   helm uninstall inmidst -n inmidst
   helm install inmidst . -n inmidst -f values.yaml
   ```

3. **Debug with dry-run:**
   ```bash
   helm install inmidst . --dry-run --debug -n inmidst
   ```

---

## Performance Issues

### Issue: Slow API Response Times

**Diagnosis:**

```bash
# Check API metrics
curl http://localhost:3001/metrics | grep http_request_duration

# Test specific endpoint
time curl http://localhost:3001/profiles/<id>
```

**Solutions:**

1. **Database query optimization:**
   ```bash
   # Enable query logging
   # In postgresql.conf:
   log_statement = 'all'
   log_duration = on
   
   # Check slow queries
   SELECT * FROM pg_stat_statements
   ORDER BY total_time DESC
   LIMIT 10;
   ```

2. **Add database indexes:**
   ```sql
   CREATE INDEX idx_profiles_slug ON profiles(slug);
   CREATE INDEX idx_experiences_profile_id ON experiences(profile_id);
   ```

3. **Enable Redis caching:**
   ```bash
   # Ensure REDIS_URL is set
   echo $REDIS_URL
   
   # Test Redis connection
   ./scripts/dev-shell.sh redis
   ```

---

### Issue: High Memory Usage

**Diagnosis:**

```bash
# Check memory usage
docker stats

# Kubernetes
kubectl top pods -n inmidst
```

**Solutions:**

1. **Increase memory limits:**
   ```yaml
   # docker-compose.yml
   api:
     deploy:
       resources:
         limits:
           memory: 2G
   ```

2. **Connection pool tuning:**
   ```typescript
   // Reduce pool size
   const pool = new Pool({
     max: 5, // instead of 10
   });
   ```

---

## LLM & Agent Issues

### Error: LLM returns invalid JSON

**Symptoms:**
```
Error: Unexpected token in JSON at position 0
```

**Solutions:**

1. **Use simpler model:**
   ```bash
   # Switch to smaller model
   LOCAL_LLM_MODEL=gemma3:4b
   ```

2. **Disable structured output:**
   ```bash
   # Use text mode
   ORCH_LLM_RESPONSE_FORMAT=text
   ```

3. **Retry with exponential backoff:**
   - Already implemented in agent executor

---

### Error: Agent tool not found

**Symptoms:**
```
Error: Tool 'rg' not in allowlist
```

**Solutions:**

```bash
# Enable tool in allowlist
ORCH_TOOL_ALLOWLIST=rg,ls,cat

# Or disable tools entirely
ORCH_TOOL_ALLOWLIST=  # Empty = no tools
```

---

## Getting More Help

### Enable Debug Logging

```bash
# API
LOG_LEVEL=debug pnpm --filter @in-midst-my-life/api dev

# Orchestrator
LOG_LEVEL=debug pnpm --filter @in-midst-my-life/orchestrator dev

# Docker Compose
docker-compose up --verbose
```

### Collect Diagnostic Information

```bash
# Create bug report bundle
./scripts/collect-diagnostics.sh > diagnostics.txt

# Includes:
# - Service status
# - Recent logs
# - Environment config (secrets redacted)
# - Database table counts
# - Redis stats
```

### Contact Support

- **GitHub Issues**: https://github.com/anthropics/in-midst-my-life/issues
- **Email**: padavano.anthony@gmail.com
- **Documentation**: https://github.com/anthropics/in-midst-my-life/docs

**When reporting issues, include:**
1. Error message (full stack trace)
2. Steps to reproduce
3. Environment (Docker/Kubernetes, OS, Node version)
4. Relevant logs
5. Diagnostic output

---

## Additional Resources

- [Developer Guide](./DEVELOPER_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Documentation](../ARCH-001-system-architecture.md)

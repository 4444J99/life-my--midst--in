# Operations Runbook

Comprehensive operational guide for the **in–midst–my-life** platform. This document serves as the primary reference for deployment, monitoring, incident response, and maintenance.

**Version**: 1.0
**Last Updated**: 2026-01-19
**On-Call Rotation**: See [Escalation Contacts](#escalation-contacts)

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Deployment Procedures](#deployment-procedures)
3. [Database Operations](#database-operations)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Incident Response](#incident-response)
6. [Scaling & Performance](#scaling--performance)
7. [Scheduled Maintenance](#scheduled-maintenance)
8. [Security & Compliance](#security--compliance)
9. [Troubleshooting Quick Reference](#troubleshooting-quick-reference)
10. [Runbooks & Checklists](#runbooks--checklists)
11. [Related Documentation](#related-documentation)

---

## Quick Reference

### Health Check URLs

| Service | Health | Ready | Metrics |
|---------|--------|-------|---------|
| **API** | `GET /health` | `GET /ready` | `GET /metrics` |
| **Orchestrator** | `GET /health` | `GET /ready` | `GET /metrics` |
| **Web** | `GET /api/health` | N/A | N/A |

### Critical Environment Variables

```bash
# Required for all services
DATABASE_URL=postgresql://user:pass@host:5432/midst
REDIS_URL=redis://host:6379
JWT_SECRET=<min-32-random-chars>

# API-specific
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Orchestrator-specific
ORCH_WORKER_ENABLED=true
LOCAL_LLM_URL=http://host:11434
```

### Emergency Commands

```bash
# Restart all services
docker-compose restart

# View real-time logs
docker-compose logs -f api orchestrator

# Emergency database backup
pg_dump $DATABASE_URL > /tmp/emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# Check active connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';"

# Clear Redis cache (nuclear option)
docker-compose exec redis redis-cli FLUSHDB
```

---

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Database migrations reviewed
- [ ] Environment variables updated in secrets manager
- [ ] Feature flags configured for gradual rollout
- [ ] Rollback plan documented
- [ ] On-call notified of deployment window

### Deployment Methods

#### Docker Compose (Development/Staging)

```bash
# 1. Pull latest images
docker-compose pull

# 2. Run migrations (always before app deployment)
docker-compose run --rm api pnpm migrate

# 3. Deploy with zero-downtime
docker-compose up -d --no-deps api orchestrator

# 4. Verify health
curl http://localhost:3001/health
curl http://localhost:3002/health

# 5. Monitor logs for errors
docker-compose logs -f --tail=100 api orchestrator
```

#### Kubernetes/Helm (Production)

```bash
# 1. Update values.yaml with new image tag
helm upgrade inmidst ./infra/helm \
  --namespace inmidst \
  --set global.imageTag=v1.2.3 \
  --wait \
  --timeout 10m

# 2. Monitor rollout
kubectl rollout status deployment/api -n inmidst
kubectl rollout status deployment/orchestrator -n inmidst

# 3. Verify pods healthy
kubectl get pods -n inmidst -l app.kubernetes.io/name=inmidst

# 4. Check application health
kubectl exec -it deployment/api -n inmidst -- curl localhost:3001/health
```

### Post-Deployment Checklist

- [ ] Health endpoints return 200
- [ ] Smoke tests pass
- [ ] No error spikes in logs
- [ ] Metrics showing normal patterns
- [ ] Key user flows working (manual verification)
- [ ] Monitoring dashboards reviewed
- [ ] Deployment tagged in git

### Rollback Procedure

```bash
# Docker Compose
docker-compose down
docker-compose pull <previous-tag>
docker-compose up -d

# Kubernetes
kubectl rollout undo deployment/api -n inmidst
kubectl rollout undo deployment/orchestrator -n inmidst

# Database (if migration was applied)
# See: docs/DATABASE-ROLLBACK.md
```

---

## Database Operations

### Backup Strategy

#### Automated Backups

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| **Full snapshot** | Daily 2:00 UTC | 30 days | S3/Neon |
| **WAL archiving** | Continuous | 7 days | S3/Neon |
| **Logical dump** | Weekly | 90 days | S3 cold storage |

#### Manual Backup

```bash
# Full logical backup
pg_dump $DATABASE_URL --format=custom --file=backup-$(date +%Y%m%d).dump

# Schema-only backup
pg_dump $DATABASE_URL --schema-only > schema-$(date +%Y%m%d).sql

# Specific tables
pg_dump $DATABASE_URL -t profiles -t subscriptions > critical-tables.sql
```

### Point-in-Time Recovery (PITR)

For Neon databases (production):

```bash
# Create branch from specific point in time
# Via Neon Console: Project → Branches → Create Branch → Select timestamp

# Or via API
curl -X POST "https://console.neon.tech/api/v2/projects/$PROJECT_ID/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -d '{"name": "recovery-branch", "parent_lsn": "0/12345678"}'
```

For self-hosted PostgreSQL:

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore from base backup + WAL
pg_basebackup -D /var/lib/postgresql/15/recovery -Fp -Xs -P

# Set recovery target time in postgresql.conf
echo "recovery_target_time = '2026-01-19 14:30:00'" >> recovery.conf
echo "restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'" >> recovery.conf

# Start recovery
sudo systemctl start postgresql
```

### Migration Operations

```bash
# Run pending migrations
pnpm --filter @in-midst-my-life/api migrate
pnpm --filter @in-midst-my-life/orchestrator migrate

# Check migration status
psql $DATABASE_URL -c "SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT 10;"

# Rollback specific migration
# See: docs/DATABASE-ROLLBACK.md
psql $DATABASE_URL -f apps/api/migrations/rollback/012_stripe_events.sql
```

### Connection Management

```bash
# View active connections
psql $DATABASE_URL -c "
SELECT
  pid, usename, application_name, client_addr,
  state, query_start, query
FROM pg_stat_activity
WHERE datname = 'midst'
ORDER BY query_start DESC;"

# Kill idle connections (careful!)
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND query_start < NOW() - INTERVAL '10 minutes';"

# Connection pool status (if using PgBouncer)
psql -p 6432 pgbouncer -c "SHOW POOLS;"
```

---

## Monitoring & Alerting

### Metrics Endpoints

All services expose Prometheus-compatible metrics at `/metrics`:

```bash
# API metrics
curl http://localhost:3001/metrics

# Key metrics to monitor:
# - http_request_duration_seconds_bucket
# - http_requests_total
# - nodejs_heap_size_used_bytes
# - pg_pool_active_connections
# - redis_commands_total
```

### Grafana Dashboards

Pre-configured dashboards in `infra/grafana/dashboards/`:

| Dashboard | Purpose | Key Panels |
|-----------|---------|------------|
| `api-performance.json` | API latency and throughput | P50/P95/P99 latency, requests/sec, error rate |
| `database-redis.json` | Database and cache health | Connection pool, query times, cache hit rate |

Import via Grafana UI or:
```bash
kubectl apply -f infra/grafana/provisioning/dashboards/
```

### Alert Configuration

#### Critical Alerts (Page immediately)

| Alert | Condition | Action |
|-------|-----------|--------|
| **API Down** | Health check failing > 2 min | Restart service, check logs |
| **Database Connection Exhausted** | Active connections > 90% pool | Kill idle, increase pool |
| **Error Rate Spike** | 5xx errors > 5% of requests | Check logs, rollback if recent deploy |
| **Disk Space Critical** | Disk usage > 90% | Expand storage, clean logs |

#### Warning Alerts (Investigate within 1 hour)

| Alert | Condition | Action |
|-------|-----------|--------|
| **High Latency** | P95 > 2 seconds | Check slow queries, scale up |
| **Memory Pressure** | Heap usage > 80% | Restart, investigate leaks |
| **Queue Backlog** | Pending jobs > 1000 | Scale workers, check failures |
| **Certificate Expiry** | < 14 days remaining | Renew certificates |

#### Prometheus Alert Rules

```yaml
# Example alert rule (infra/prometheus/alerts.yml)
groups:
  - name: inmidst-alerts
    rules:
      - alert: APIHighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket{job="api"}) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "P95 latency is {{ $value }}s (threshold: 2s)"
```

### Log Aggregation

#### Structured Logging Format

All services output JSON logs:

```json
{
  "level": "info",
  "time": "2026-01-19T12:00:00.000Z",
  "msg": "Request completed",
  "reqId": "abc123",
  "method": "GET",
  "path": "/profiles/123",
  "statusCode": 200,
  "responseTime": 45
}
```

#### Searching Logs

```bash
# Docker Compose
docker-compose logs api | grep -i error

# Kubernetes with kubectl
kubectl logs -l app=api -n inmidst --tail=1000 | jq 'select(.level == "error")'

# With Loki/Grafana
{namespace="inmidst", app="api"} |= "error" | json
```

---

## Incident Response

### Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **SEV1** | Complete outage, data loss risk | 15 minutes | API down, database corruption |
| **SEV2** | Major feature broken, no workaround | 1 hour | Payments failing, auth broken |
| **SEV3** | Feature degraded, workaround exists | 4 hours | Slow queries, partial failures |
| **SEV4** | Minor issue, low impact | Next business day | UI glitch, minor bugs |

### Incident Commander Checklist

1. **Acknowledge** - Respond in #incidents channel within response time
2. **Assess** - Determine severity and impact scope
3. **Communicate** - Post status update to stakeholders
4. **Delegate** - Assign investigation and mitigation tasks
5. **Mitigate** - Focus on restoring service (fix root cause later)
6. **Resolve** - Confirm service restored, close incident
7. **Review** - Schedule post-mortem within 48 hours

### Common Incident Playbooks

#### Playbook: API Unresponsive

```bash
# 1. Check health endpoint
curl -v http://localhost:3001/health

# 2. Check container status
docker-compose ps api
kubectl get pods -l app=api -n inmidst

# 3. Check logs for errors
docker-compose logs --tail=200 api | grep -i error

# 4. Check resource usage
docker stats api
kubectl top pods -l app=api -n inmidst

# 5. Restart if needed
docker-compose restart api
kubectl rollout restart deployment/api -n inmidst

# 6. If still failing, check dependencies
curl http://localhost:5432  # PostgreSQL
curl http://localhost:6379  # Redis
```

#### Playbook: Database Connection Errors

```bash
# 1. Check PostgreSQL status
docker-compose ps postgres
psql $DATABASE_URL -c "SELECT 1;"

# 2. Check connection count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"

# 3. If exhausted, kill idle connections
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < NOW() - INTERVAL '5 minutes';"

# 4. Increase pool size if recurring
# Edit apps/api/src/db/pool.ts: max: 20 → 30

# 5. Restart applications to apply
docker-compose restart api orchestrator
```

#### Playbook: Stripe Webhooks Failing

See detailed runbook: [PHASE-1-RUNBOOK.md](../phases/PHASE-1-RUNBOOK.md)

Quick steps:
```bash
# 1. Check webhook endpoint
curl -X POST http://localhost:3001/webhooks/stripe \
  -H "stripe-signature: test" -d '{}'
# Expect: 401 (confirms endpoint is up)

# 2. Verify STRIPE_WEBHOOK_SECRET
echo $STRIPE_WEBHOOK_SECRET | head -c 10
# Should start with "whsec_"

# 3. Check logs for specific errors
docker-compose logs api | grep -i "webhook"

# 4. Replay failed webhooks from Stripe Dashboard
# Dashboard → Developers → Webhooks → Events → Resend
```

### Post-Incident Review Template

```markdown
## Incident Post-Mortem: [Title]

**Date**: YYYY-MM-DD
**Duration**: X hours Y minutes
**Severity**: SEV[1-4]
**Incident Commander**: [Name]

### Summary
[2-3 sentence description of what happened]

### Timeline (UTC)
- HH:MM - Incident detected
- HH:MM - Acknowledged, investigation started
- HH:MM - Root cause identified
- HH:MM - Mitigation applied
- HH:MM - Service restored
- HH:MM - Incident resolved

### Root Cause
[Technical explanation of why this happened]

### Impact
- Users affected: [number/percentage]
- Revenue impact: [$X or N/A]
- Data loss: [yes/no, details]

### Action Items
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]

### Lessons Learned
- What went well: [...]
- What could improve: [...]
```

---

## Scaling & Performance

### Horizontal Scaling

#### API Service

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

#### Orchestrator Service

```bash
# Scale workers manually (single replica recommended for job ordering)
kubectl scale deployment orchestrator --replicas=1 -n inmidst

# For parallel workloads, use separate queues with dedicated workers
```

### Vertical Scaling

| Service | Minimum | Recommended | High Load |
|---------|---------|-------------|-----------|
| API | 256MB, 0.25 CPU | 512MB, 0.5 CPU | 1GB, 1 CPU |
| Orchestrator | 512MB, 0.5 CPU | 1GB, 1 CPU | 2GB, 2 CPU |
| PostgreSQL | 512MB | 2GB | 8GB+ |
| Redis | 128MB | 256MB | 1GB |

### Database Optimization

#### Index Review

```sql
-- Find missing indexes (high sequential scans)
SELECT schemaname, relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > 1000
ORDER BY seq_tup_read DESC;

-- Find unused indexes
SELECT indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'pg_%';
```

#### Query Performance

```sql
-- Enable query logging temporarily
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

-- Review slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;
```

### Caching Strategy

| Data Type | Cache TTL | Invalidation |
|-----------|-----------|--------------|
| Taxonomy (masks, epochs) | 1 hour | Manual on change |
| Profile summary | 5 minutes | On profile update |
| Job search results | 15 minutes | On new search |
| Rate limit counters | 1 month | Automatic expiry |

```bash
# Check cache hit rate
docker-compose exec redis redis-cli INFO stats | grep hit
# keyspace_hits:12345
# keyspace_misses:123
# Hit rate = hits / (hits + misses) = 99%
```

---

## Scheduled Maintenance

### Maintenance Windows

| Type | Schedule | Duration | Notification |
|------|----------|----------|--------------|
| Minor updates | Weekly, Sat 2:00 UTC | 30 min | 24 hours |
| Major releases | Monthly, Sun 2:00 UTC | 2 hours | 1 week |
| Emergency patches | ASAP | Varies | Immediate |

### Pre-Maintenance Checklist

- [ ] Maintenance window scheduled and communicated
- [ ] Backup completed and verified
- [ ] Rollback procedure documented
- [ ] On-call engineer confirmed
- [ ] Status page updated to "Scheduled Maintenance"

### Post-Maintenance Checklist

- [ ] All services healthy
- [ ] Smoke tests passing
- [ ] Metrics returning to normal
- [ ] Status page updated to "Operational"
- [ ] Maintenance ticket closed

### Routine Tasks

#### Daily

- [ ] Check error rate in Grafana
- [ ] Review failed jobs in orchestrator
- [ ] Verify backup completion

#### Weekly

- [ ] Review slow query log
- [ ] Check disk space trends
- [ ] Update dependencies (security patches)
- [ ] Rotate log files

#### Monthly

- [ ] Full security scan
- [ ] Load testing against staging
- [ ] Review and prune unused resources
- [ ] Update runbooks if needed

---

## Security & Compliance

### Secret Rotation

| Secret | Rotation | Procedure |
|--------|----------|-----------|
| JWT_SECRET | Quarterly | Generate new, deploy, invalidate old sessions |
| Database password | Quarterly | Update in secrets manager, rolling restart |
| API keys (Stripe, etc.) | As needed | Regenerate in provider dashboard |

### Access Control

```bash
# Audit who has production access
kubectl get rolebindings -n inmidst -o yaml

# Review database roles
psql $DATABASE_URL -c "\du"
```

### Security Incident Response

1. **Contain** - Isolate affected systems
2. **Eradicate** - Remove threat
3. **Recover** - Restore from clean backup
4. **Review** - Document and improve

See: [docs/SECURITY.md](./SECURITY.md) for detailed security guidelines.

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| API returns 500 | Database connection | `docker-compose restart api` |
| Slow responses | Missing index | Check `pg_stat_statements` |
| Jobs not processing | Worker disabled | Set `ORCH_WORKER_ENABLED=true` |
| Auth failures | JWT secret mismatch | Verify `JWT_SECRET` across services |
| Webhook errors | Invalid signature | Check `STRIPE_WEBHOOK_SECRET` |
| Memory exhaustion | Large result sets | Add pagination, check leaks |
| Cache misses | Redis not running | `docker-compose up redis` |

For detailed troubleshooting: [docs/TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Runbooks & Checklists

### Deployment Runbook

```bash
#!/bin/bash
# Production deployment runbook

set -e

echo "=== Pre-deployment checks ==="
pnpm test
pnpm typecheck
pnpm lint

echo "=== Creating backup ==="
pg_dump $DATABASE_URL > /tmp/pre-deploy-backup-$(date +%Y%m%d-%H%M%S).sql

echo "=== Running migrations ==="
pnpm --filter @in-midst-my-life/api migrate
pnpm --filter @in-midst-my-life/orchestrator migrate

echo "=== Deploying services ==="
docker-compose pull
docker-compose up -d --no-deps api orchestrator

echo "=== Verifying deployment ==="
sleep 10
curl -f http://localhost:3001/health || exit 1
curl -f http://localhost:3002/health || exit 1

echo "=== Deployment complete ==="
```

### New On-Call Engineer Checklist

- [ ] Access to production environment
- [ ] Access to monitoring dashboards
- [ ] Added to #incidents channel
- [ ] Familiar with this runbook
- [ ] Knows escalation contacts
- [ ] Has tested alerting works
- [ ] Understands severity definitions

---

## Escalation Contacts

| Issue Type | Primary Contact | Secondary | Response Time |
|------------|----------------|-----------|---------------|
| Production outage | On-call engineer | Team lead | 15 min |
| Security incident | Security team | CTO | Immediate |
| Payment issues | Stripe support | Finance | 24 hours |
| Database critical | DBA on-call | Cloud provider | 1 hour |

### Communication Channels

- **#incidents** - All incident communication
- **#engineering** - General engineering discussions
- **Email**: ops@inmidst.io (for external escalation)

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Detailed error resolution |
| [DATABASE-ROLLBACK.md](./DATABASE-ROLLBACK.md) | Migration rollback procedures |
| [SELF-HOSTING.md](../SELF-HOSTING.md) | Self-hosted deployment guide |
| [PHASE-1-RUNBOOK.md](../phases/PHASE-1-RUNBOOK.md) | Billing/Stripe operations |
| [SECURITY.md](../SECURITY.md) | Security guidelines |
| [ENVIRONMENT-VARS.md](../ENVIRONMENT-VARS.md) | Environment configuration |

---

**Document Authority**: This is the primary operations reference. For specific subsystems, consult the related documentation linked above.

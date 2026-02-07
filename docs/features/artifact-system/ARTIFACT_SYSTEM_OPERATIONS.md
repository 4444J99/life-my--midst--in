# Artifact System Operations Guide

**Version**: 1.0  
**Last Updated**: January 16, 2026  
**Audience**: Site Reliability Engineers, DevOps

## Table of Contents

1. [Monitoring](#monitoring)
2. [Logging](#logging)
3. [Health Checks](#health-checks)
4. [Troubleshooting](#troubleshooting)
5. [Manual Operations](#manual-operations)
6. [Backup & Recovery](#backup--recovery)
7. [Performance Tuning](#performance-tuning)
8. [Incident Response](#incident-response)

---

## Monitoring

### Key Metrics to Track

#### Application Metrics

**API Service** (`apps/api`):
```bash
# Request rate (requests/second)
midst_api_requests_total{method="GET",path="/artifacts",status="200"}

# Response time (p50, p95, p99)
midst_api_request_duration_seconds{path="/artifacts"}

# Error rate
midst_api_errors_total{type="database"|"oauth"|"validation"}

# Active connections
midst_api_active_connections
```

**Orchestrator Service** (`apps/orchestrator`):
```bash
# Task execution rate
midst_orch_tasks_executed_total{type="artifact_sync_full"|"artifact_sync_incremental"}

# Task queue length
midst_orch_queue_length{queue="artifact_sync"}

# Worker utilization
midst_orch_workers_busy / midst_orch_workers_total

# Artifact classification time
midst_orch_classification_duration_seconds
```

#### Infrastructure Metrics

**PostgreSQL**:
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Database size
SELECT pg_size_pretty(pg_database_size('in_midst_my_life'));

-- Slow queries (>1 second)
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Table sizes
SELECT 
  schemaname, 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Redis**:
```bash
# Connected clients
redis-cli INFO clients | grep connected_clients

# Memory usage
redis-cli INFO memory | grep used_memory_human

# Queue lengths
redis-cli LLEN midst:queue:artifact_sync
redis-cli LLEN midst:queue:artifact_classify

# Hit rate
redis-cli INFO stats | grep keyspace_hits
redis-cli INFO stats | grep keyspace_misses
```

### Monitoring Setup with Prometheus

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'midst-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  - job_name: 'midst-orchestrator'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']  # postgres_exporter

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']  # redis_exporter
```

### Grafana Dashboards

**Key Dashboards**:
1. **Artifact System Overview**
   - Total artifacts ingested (last 24h)
   - Pending artifacts count
   - Sync success rate
   - API response times

2. **OAuth Health**
   - Token expiry warnings
   - OAuth flow success rate
   - Provider API error rates

3. **Worker Performance**
   - Tasks processed/hour
   - Average classification time
   - Queue depth over time

---

## Logging

### Log Levels

```
ERROR   - Critical failures requiring immediate attention
WARN    - Degraded performance or recoverable errors
INFO    - Normal operational events
DEBUG   - Detailed diagnostic information (dev only)
```

### Log Locations

**Development**:
```bash
# API logs
tail -f apps/api/logs/app.log

# Orchestrator logs
tail -f apps/orchestrator/logs/app.log

# PM2 logs
pm2 logs midst-api
pm2 logs midst-orchestrator
```

**Production (Docker)**:
```bash
# Container logs
docker logs -f midst-api
docker logs -f midst-orchestrator

# Save logs to file
docker logs midst-api > api_logs_$(date +%Y%m%d).log 2>&1
```

### Important Log Patterns

**OAuth Token Refresh**:
```
[INFO] OAuth token refreshed successfully for integration_id=abc123
[WARN] OAuth token expires in 5 minutes for integration_id=abc123
[ERROR] OAuth token refresh failed: invalid_grant
```

**Artifact Sync**:
```
[INFO] Starting full import for integration_id=abc123, provider=google_drive
[INFO] Listed 145 files from Google Drive folder=/Academic
[INFO] Downloaded file: /Academic/paper.pdf (2.3MB)
[INFO] Classified as artifact_type=academic_paper, confidence=0.87
[INFO] Created artifact_id=art456, status=pending
[INFO] Full import completed: 145 files, 142 artifacts created, 3 skipped
```

**Errors to Alert On**:
```
[ERROR] Database connection lost: connection refused
[ERROR] Redis connection timeout after 5000ms
[ERROR] OAuth provider returned 401 Unauthorized
[ERROR] File download failed: network timeout
[ERROR] Disk space critical: 95% used on /tmp
```

### Log Aggregation (ELK Stack)

**Filebeat configuration** (`filebeat.yml`):
```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/midst/api/*.log
      - /var/log/midst/orchestrator/*.log
    fields:
      service: artifact-system
    multiline:
      pattern: '^\['
      negate: true
      match: after

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "midst-logs-%{+yyyy.MM.dd}"
```

---

## Health Checks

### Automated Health Checks

**API Health Endpoint**:
```bash
curl -f http://localhost:3001/health || exit 1

# Response:
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2026-01-16T12:00:00.000Z",
  "uptime": 86400,
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

**Orchestrator Health Endpoint**:
```bash
curl -f http://localhost:3002/health || exit 1

# Response:
{
  "ok": true,
  "status": "healthy",
  "workers": 4,
  "queueLength": 5,
  "schedulerRunning": true
}
```

### Kubernetes Liveness & Readiness Probes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: midst-api
spec:
  containers:
  - name: api
    image: midst/api:latest
    livenessProbe:
      httpGet:
        path: /health
        port: 3001
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health
        port: 3001
      initialDelaySeconds: 10
      periodSeconds: 5
```

### Manual Health Verification

```bash
# Check all services
./scripts/health-check.sh

#!/bin/bash
# health-check.sh

echo "Checking API..."
curl -sf http://localhost:3001/health > /dev/null && echo "✓ API healthy" || echo "✗ API down"

echo "Checking Orchestrator..."
curl -sf http://localhost:3002/health > /dev/null && echo "✓ Orchestrator healthy" || echo "✗ Orchestrator down"

echo "Checking PostgreSQL..."
psql -U postgres -d in_midst_my_life -c "SELECT 1" > /dev/null 2>&1 && echo "✓ PostgreSQL healthy" || echo "✗ PostgreSQL down"

echo "Checking Redis..."
redis-cli ping > /dev/null 2>&1 && echo "✓ Redis healthy" || echo "✗ Redis down"
```

---

## Troubleshooting

### Common Issues

#### 1. OAuth Tokens Expired

**Symptoms**:
- Users see "Connection failed" errors
- Logs show `401 Unauthorized` from provider APIs
- Artifacts not syncing

**Diagnosis**:
```sql
-- Check token expiry
SELECT 
  id, 
  provider, 
  status,
  last_synced_at,
  (credentials->>'tokenExpiry')::timestamp AS token_expiry
FROM cloud_storage_integrations
WHERE status = 'connected'
  AND (credentials->>'tokenExpiry')::timestamp < NOW();
```

**Resolution**:
```bash
# Option 1: User re-authenticates in UI
# Navigate to /settings/integrations → click "Reconnect"

# Option 2: Force token refresh via API
curl -X POST http://localhost:3001/profiles/{profileId}/integrations/{integrationId}/refresh
```

#### 2. Files Not Syncing

**Symptoms**:
- New files in cloud storage don't appear in UI
- Last sync time is stale

**Diagnosis**:
```bash
# Check orchestrator logs
grep "artifact_sync" apps/orchestrator/logs/app.log | tail -20

# Check scheduled tasks
curl http://localhost:3002/tasks?type=artifact_sync

# Check integration status
curl http://localhost:3001/profiles/{profileId}/integrations/{integrationId}
```

**Common Causes**:
1. **Scheduler not running**:
   ```bash
   # Restart orchestrator
   pm2 restart midst-orchestrator
   
   # Verify scheduler enabled
   echo $ORCH_SCHEDULER_ENABLED  # should be "true"
   ```

2. **OAuth token expired**: See section above

3. **Rate limiting**:
   ```
   [WARN] Rate limit exceeded for provider=google_drive, retry_after=60s
   ```
   Wait and retry automatically handled.

4. **Network errors**:
   ```bash
   # Test connectivity to provider
   curl -I https://www.googleapis.com/drive/v3/about
   curl -I https://api.dropboxapi.com/2/users/get_current_account
   ```

#### 3. Artifacts Not Created

**Symptoms**:
- Files discovered but no artifacts in database
- Classification fails

**Diagnosis**:
```sql
-- Check artifact creation errors
SELECT 
  run_id, 
  task_type, 
  status, 
  error_message
FROM runs
WHERE task_type LIKE 'artifact%'
  AND status = 'failed'
ORDER BY created_at DESC LIMIT 10;
```

**Common Causes**:
1. **File too large**:
   ```
   [WARN] Skipping file: size 105MB exceeds max 100MB
   ```
   Increase `ORCH_ARTIFACT_MAX_FILE_SIZE` or filter at source.

2. **File type not supported**:
   ```
   [WARN] No processor available for mime_type=application/vnd.ms-project
   ```
   Add processor in Phase 3 or classify as `other`.

3. **Database constraint violation**:
   ```
   [ERROR] Duplicate artifact: sourceProvider=google_drive, sourceId=file123
   ```
   Delta sync should prevent this, check `artifact_sync_state` table.

#### 4. High Memory Usage

**Symptoms**:
- Orchestrator OOM kills
- Slow file processing

**Diagnosis**:
```bash
# Check memory usage
docker stats midst-orchestrator

# Check heap size (Node.js)
curl http://localhost:3002/metrics | grep nodejs_heap_size_used_bytes
```

**Resolution**:
```bash
# Increase Node.js heap size
NODE_OPTIONS="--max-old-space-size=4096" pm2 start apps/orchestrator/dist/index.js

# Reduce batch size
export ORCH_ARTIFACT_BATCH_SIZE=50  # default: 100

# Process files serially instead of parallel
export ORCH_PARALLEL_DOWNLOADS=1  # default: 3
```

#### 5. Slow Artifact Listing

**Symptoms**:
- API endpoint `/artifacts` takes >5 seconds
- Database CPU high

**Diagnosis**:
```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM artifacts 
WHERE profile_id = 'abc123' 
  AND status = 'pending' 
ORDER BY captured_date DESC 
LIMIT 20;

-- Check missing indexes
SELECT 
  schemaname, 
  tablename, 
  attname, 
  n_distinct, 
  correlation
FROM pg_stats
WHERE tablename = 'artifacts';
```

**Resolution**:
```sql
-- Add indexes if missing
CREATE INDEX IF NOT EXISTS idx_artifacts_profile_status 
  ON artifacts(profile_id, status);

CREATE INDEX IF NOT EXISTS idx_artifacts_captured_date 
  ON artifacts(captured_date DESC);

-- Analyze table
ANALYZE artifacts;
```

---

## Manual Operations

### Trigger Artifact Sync

**Full Import** (discover all files):
```bash
curl -X POST http://localhost:3001/profiles/{profileId}/integrations/{integrationId}/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

**Incremental Sync** (detect changes since last sync):
```bash
curl -X POST http://localhost:3001/profiles/{profileId}/integrations/{integrationId}/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'
```

**Single Folder Refresh**:
```bash
curl -X POST http://localhost:3001/profiles/{profileId}/integrations/{integrationId}/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "folder", "folderPath": "/Academic/Papers"}'
```

### Update Integration Configuration

```bash
# Update monitored folders
curl -X PATCH http://localhost:3001/profiles/{profileId}/integrations/{integrationId} \
  -H "Content-Type: application/json" \
  -d '{
    "folderConfig": {
      "includedFolders": ["/Academic", "/Creative"],
      "excludedPatterns": ["*/Private/*", "*/Temp/*"],
      "maxFileSizeMB": 100
    }
  }'
```

### Archive Artifacts in Bulk

```bash
# Archive all rejected artifacts older than 30 days
curl -X POST http://localhost:3001/profiles/{profileId}/artifacts/bulk-archive \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "status": "rejected",
      "olderThanDays": 30
    }
  }'
```

### Re-classify Artifacts

```bash
# Re-run classification for low-confidence artifacts
curl -X POST http://localhost:3001/profiles/{profileId}/artifacts/bulk-reclassify \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      "confidenceLessThan": 0.7
    }
  }'
```

### Database Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE artifacts;
VACUUM ANALYZE cloud_storage_integrations;
VACUUM ANALYZE artifact_sync_state;

-- Reindex
REINDEX TABLE artifacts;

-- Clean up old sync state (>90 days)
DELETE FROM artifact_sync_state 
WHERE last_modified < NOW() - INTERVAL '90 days';

-- Archive old artifacts
UPDATE artifacts 
SET status = 'archived' 
WHERE status = 'rejected' 
  AND updated_at < NOW() - INTERVAL '180 days';
```

---

## Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-artifact-system.sh

BACKUP_DIR="/backups/midst"
DATE=$(date +%Y%m%d_%H%M%S)

echo "Starting backup at $DATE..."

# 1. PostgreSQL backup
pg_dump -U postgres -F c -b -v -f "$BACKUP_DIR/db_$DATE.dump" in_midst_my_life
echo "✓ Database backed up"

# 2. Redis backup (if persistence enabled)
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb"
echo "✓ Redis backed up"

# 3. Artifact files (if stored locally)
if [ -d "/var/midst/artifacts" ]; then
  tar -czf "$BACKUP_DIR/artifacts_$DATE.tar.gz" /var/midst/artifacts
  echo "✓ Artifact files backed up"
fi

# 4. Configuration files
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  apps/api/.env \
  apps/orchestrator/.env \
  docker-compose.yml
echo "✓ Configuration backed up"

# 5. Clean up old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete
echo "✓ Old backups cleaned"

echo "Backup completed successfully at $(date)"
```

### Restore from Backup

```bash
# 1. Stop services
pm2 stop all
# or
docker-compose down

# 2. Restore database
pg_restore -U postgres -d in_midst_my_life -c /backups/midst/db_20260116.dump

# 3. Restore Redis (optional)
cp /backups/midst/redis_20260116.rdb /var/lib/redis/dump.rdb
redis-cli SHUTDOWN
redis-server  # restart

# 4. Restore artifact files
tar -xzf /backups/midst/artifacts_20260116.tar.gz -C /

# 5. Restart services
pm2 start all
# or
docker-compose up -d
```

### Disaster Recovery Checklist

1. ✅ Backup database (PostgreSQL)
2. ✅ Backup Redis (task queue state)
3. ✅ Backup artifact files (if stored locally, not in cloud)
4. ✅ Backup environment variables (encrypted)
5. ✅ Document OAuth app credentials (stored securely)
6. ✅ Test restore procedure quarterly
7. ✅ Store backups off-site (S3, Google Cloud Storage)

---

## Performance Tuning

### Database Tuning

**Connection Pooling**:
```typescript
// apps/api/src/db.ts
const pool = new Pool({
  max: 20,           // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Query Optimization**:
```sql
-- Add composite indexes for common queries
CREATE INDEX idx_artifacts_profile_status_date 
  ON artifacts(profile_id, status, captured_date DESC);

-- Partition large tables (if >10M rows)
CREATE TABLE artifacts_2026 PARTITION OF artifacts
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

### Redis Tuning

```bash
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru
save 900 1  # Save if 1 key changes in 15 min
save 300 10
save 60 10000
```

### Orchestrator Tuning

```bash
# Increase worker pool
export ORCH_WORKER_COUNT=8  # default: 4

# Adjust poll interval
export ORCH_POLL_INTERVAL_MS=10000  # default: 5000 (5 seconds)

# Batch size for sync
export ORCH_ARTIFACT_BATCH_SIZE=200  # default: 100
```

---

## Incident Response

### Severity Levels

- **P0 (Critical)**: System down, data loss risk
- **P1 (High)**: Major feature broken, affects all users
- **P2 (Medium)**: Minor feature broken, affects some users
- **P3 (Low)**: Cosmetic issue, no user impact

### P0 Incident: API Down

1. **Detect**: Health check alerts, user reports
2. **Assess**: Check logs, database connectivity
3. **Mitigate**:
   ```bash
   # Restart services
   pm2 restart midst-api
   
   # Check database
   psql -U postgres -c "SELECT 1"
   
   # Restore from backup if needed
   ```
4. **Communicate**: Update status page
5. **Post-mortem**: Document root cause

### P1 Incident: OAuth Tokens Expired for All Users

1. **Detect**: Spike in 401 errors from providers
2. **Assess**: Check token expiry in database
3. **Mitigate**:
   ```bash
   # Force refresh for all integrations
   curl -X POST http://localhost:3001/admin/integrations/refresh-all
   ```
4. **Notify**: Email users to re-authenticate if refresh fails

---

## Runbook: Common Tasks

### Add New Cloud Provider

1. Implement provider in `packages/core/src/integrations/`
2. Add to `createCloudStorageProvider()` factory
3. Update environment variables
4. Add OAuth routes in `apps/api/src/routes/integrations.ts`
5. Update UI in `apps/web/src/app/settings/integrations/`

### Scale Orchestrator Workers

```bash
# Horizontal scaling (multiple instances)
pm2 start apps/orchestrator/dist/index.js -i 4  # 4 instances

# Vertical scaling (increase resources)
docker-compose up -d --scale orchestrator=3
```

### Migrate to New Database Server

```bash
# 1. Dump from old server
pg_dump -h old-server -U postgres -F c in_midst_my_life > backup.dump

# 2. Restore to new server
pg_restore -h new-server -U postgres -d in_midst_my_life backup.dump

# 3. Update DATABASE_URL
export DATABASE_URL=postgresql://postgres:password@new-server:5432/in_midst_my_life

# 4. Restart services
pm2 restart all
```

---

**Document Version**: 1.0  
**Last Updated**: January 16, 2026  
**On-Call Contacts**: See internal wiki

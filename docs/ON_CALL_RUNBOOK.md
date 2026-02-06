# On-Call Runbook

Operational procedures for responding to alerts in the in-midst-my-life platform.

## Quick Reference

| Alert | Severity | First Response |
|-------|----------|----------------|
| [HighAPIErrorRate](#high-api-error-rate) | Critical | Check API logs for 5xx patterns |
| [HighAPILatency](#high-api-latency) | Warning | Check DB query latency, active connections |
| [APIDown](#api-down) | Critical | Verify pod health, check dependencies |
| [HighDatabaseConnections](#high-database-connections) | Warning | Check for connection leaks, idle transactions |
| [SlowDatabaseQueries](#slow-database-queries) | Warning | Identify slow queries, check indexes |
| [PostgreSQLDown](#postgresql-down) | Critical | Check pod/container status, disk space |
| [HighRedisMemory](#high-redis-memory) | Warning | Check key count, eviction policy |
| [RedisDown](#redis-down) | Critical | Check pod/container status, AOF corruption |
| [SlowRedisOperations](#slow-redis-operations) | Warning | Check large keys, command latency |
| [HighActiveConnections](#high-active-connections) | Warning | Check for connection leaks |
| [LowCacheHitRatio](#low-cache-hit-ratio) | Warning | Review cache key patterns, TTL config |
| [TargetDown](#target-down) | Critical | Check scrape target container/pod |

---

## API Alerts

### High API Error Rate

**Alert:** `HighAPIErrorRate` — 5xx error rate exceeds 5% over 5 minutes.

**Investigation:**
1. Check API logs for the dominant error type:
   ```bash
   docker logs inmidst-api --tail 200 | grep -i error
   ```
2. Look at which routes are failing:
   ```bash
   # Prometheus query
   topk(5, sum by (route) (rate(http_requests_total{status_code=~"5.."}[5m])))
   ```
3. Check if a recent deployment caused the spike (correlate with deploy timestamps).
4. Verify database and Redis connectivity.

**Remediation:**
- If a specific route is failing: check the corresponding service logic and DB queries.
- If all routes are failing: likely a dependency issue (DB, Redis, external API).
- If correlated with a deploy: consider rollback via `kubectl rollout undo deployment/inmidst-api`.

---

### High API Latency

**Alert:** `HighAPILatency` — P95 request latency exceeds 1 second.

**Investigation:**
1. Identify slow routes:
   ```
   topk(5, histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m]))))
   ```
2. Check database query latency:
   ```
   histogram_quantile(0.95, sum by (le, table) (rate(db_query_duration_seconds_bucket[5m])))
   ```
3. Check active connections (high count may indicate connection pool exhaustion):
   ```
   active_connections{type="http"}
   ```
4. Check Node.js event loop lag (if custom metrics are available).

**Remediation:**
- Slow DB queries: check for missing indexes, add `EXPLAIN ANALYZE` on suspect queries.
- Connection pool exhaustion: increase pool size or fix connection leaks.
- High load: scale API replicas if autoscaling isn't triggered yet.

---

### API Down

**Alert:** `APIDown` — No successful (2xx) responses for 2 minutes.

**Investigation:**
1. Check pod/container status:
   ```bash
   kubectl get pods -l app=inmidst-api
   # or
   docker ps | grep inmidst-api
   ```
2. Check liveness/readiness probe failures:
   ```bash
   kubectl describe pod <pod-name> | grep -A5 "Conditions"
   ```
3. Check if dependencies (PostgreSQL, Redis) are healthy.
4. Check for OOMKilled events:
   ```bash
   kubectl get events --sort-by=.metadata.creationTimestamp | grep OOM
   ```

**Remediation:**
- If pods are crash-looping: check logs for startup errors, env var issues, or missing migrations.
- If OOMKilled: increase memory limits in Helm values.
- If dependencies down: resolve dependency alerts first.

---

## Database Alerts

### High Database Connections

**Alert:** `HighDatabaseConnections` — Connection count exceeds 80% of `max_connections`.

**Investigation:**
1. Check active vs idle connections:
   ```sql
   SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
   ```
2. Check for long-running transactions:
   ```sql
   SELECT pid, now() - xact_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND xact_start IS NOT NULL
   ORDER BY duration DESC LIMIT 10;
   ```
3. Check which application is consuming the most connections:
   ```sql
   SELECT application_name, count(*) FROM pg_stat_activity GROUP BY application_name;
   ```

**Remediation:**
- Kill idle-in-transaction connections older than 10 minutes:
  ```sql
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle in transaction' AND xact_start < now() - interval '10 minutes';
  ```
- If API connection pool is too large: reduce `max` in Pool config.
- If legitimate load: increase `max_connections` in PostgreSQL config.

---

### Slow Database Queries

**Alert:** `SlowDatabaseQueries` — P95 query duration exceeds 500ms.

**Investigation:**
1. Check which tables/operations are slow (from Prometheus labels).
2. Run `EXPLAIN ANALYZE` on suspect queries.
3. Check for table bloat:
   ```sql
   SELECT relname, n_dead_tup, n_live_tup
   FROM pg_stat_user_tables
   ORDER BY n_dead_tup DESC LIMIT 10;
   ```
4. Check if autovacuum is running.

**Remediation:**
- Add missing indexes based on `EXPLAIN` output.
- Run `VACUUM ANALYZE` on bloated tables.
- For complex queries: consider query refactoring or materialized views.

---

### PostgreSQL Down

**Alert:** `PostgreSQLDown` — Exporter cannot reach the database.

**Investigation:**
1. Check container/pod status:
   ```bash
   docker ps | grep inmidst-postgres
   kubectl get pods -l app=inmidst-postgres
   ```
2. Check disk space (PostgreSQL stops accepting writes when disk is full):
   ```bash
   docker exec inmidst-postgres df -h /var/lib/postgresql/data
   ```
3. Check PostgreSQL logs:
   ```bash
   docker logs inmidst-postgres --tail 100
   ```

**Remediation:**
- If disk full: free space, then restart. Consider increasing PVC size.
- If crash: check logs for corruption, restore from backup if needed.
- If OOMKilled: increase memory limits.

---

## Redis Alerts

### High Redis Memory

**Alert:** `HighRedisMemory` — Memory usage exceeds 90% of `maxmemory`.

**Investigation:**
1. Check memory breakdown:
   ```bash
   docker exec inmidst-redis redis-cli info memory
   ```
2. Check key count and largest keys:
   ```bash
   docker exec inmidst-redis redis-cli dbsize
   docker exec inmidst-redis redis-cli --bigkeys
   ```
3. Check eviction policy:
   ```bash
   docker exec inmidst-redis redis-cli config get maxmemory-policy
   ```

**Remediation:**
- If task queue is bloated: check if orchestrator workers are consuming jobs.
- If cache keys are accumulating: reduce TTL or add `maxmemory-policy allkeys-lru`.
- Increase `maxmemory` if legitimate growth.

---

### Redis Down

**Alert:** `RedisDown` — Exporter cannot reach Redis.

**Investigation:**
1. Check container/pod status.
2. Check for AOF corruption:
   ```bash
   docker exec inmidst-redis redis-check-aof --fix /data/appendonly.aof
   ```
3. Check Redis logs:
   ```bash
   docker logs inmidst-redis --tail 100
   ```

**Remediation:**
- Restart the container/pod.
- If AOF corrupted: repair with `redis-check-aof --fix`, then restart.
- The API and orchestrator should degrade gracefully (rate limiting falls back to in-memory store).

---

### Slow Redis Operations

**Alert:** `SlowRedisOperations` — P95 operation latency exceeds 100ms.

**Investigation:**
1. Check for large keys causing slow operations:
   ```bash
   docker exec inmidst-redis redis-cli --bigkeys
   ```
2. Check slow log:
   ```bash
   docker exec inmidst-redis redis-cli slowlog get 10
   ```
3. Check if `KEYS` or other O(N) commands are being used.

**Remediation:**
- Replace O(N) commands with cursor-based alternatives (`SCAN` instead of `KEYS`).
- Break up large keys into smaller structures.
- If under heavy load: consider Redis Cluster or read replicas.

---

## Infrastructure Alerts

### High Active Connections

**Alert:** `HighActiveConnections` — More than 500 active HTTP connections.

**Investigation:**
1. Check if traffic is legitimately high or if connections are leaking.
2. Check client-side connection pooling (are keep-alive connections accumulating?).
3. Check for slow routes that hold connections open.

**Remediation:**
- If connection leak: identify the leaking endpoint and fix response handling.
- If legitimate traffic: scale API replicas.
- Add connection timeout to Fastify if not already configured.

---

### Low Cache Hit Ratio

**Alert:** `LowCacheHitRatio` — Cache hit ratio below 50% over 15 minutes.

**Investigation:**
1. Check if cache was recently flushed (deploy, Redis restart).
2. Check cache key patterns — are keys too specific (low reuse)?
3. Check TTL values — are they too short?

**Remediation:**
- After a cold start: wait for cache to warm up (this alert has a 15-minute `for` window).
- If TTL too short: increase cache duration for stable data.
- If keys too specific: review cache key generation logic.

---

### Target Down

**Alert:** `TargetDown` — A Prometheus scrape target is unreachable.

**Investigation:**
1. Check which target is down from the alert labels (`job`, `instance`).
2. Check container/pod status for that service.
3. Check if the metrics endpoint is responding:
   ```bash
   curl -s http://localhost:<port>/metrics | head -5
   ```

**Remediation:**
- Restart the affected service.
- If the metrics port changed: update `prometheus.yml` scrape config.
- If the service itself is down: follow the service-specific runbook section.

---

## Escalation

1. **Warning alerts**: Investigate within 30 minutes during business hours.
2. **Critical alerts**: Investigate immediately. If not resolved within 15 minutes, escalate.
3. **Multiple critical alerts**: Likely a systemic issue (infrastructure, dependency). Focus on root cause.

## Useful Links

- **Grafana**: http://localhost:3003 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Jaeger (traces)**: http://localhost:16686
- **API health**: http://localhost:3001/health
- **API metrics**: http://localhost:3001/metrics

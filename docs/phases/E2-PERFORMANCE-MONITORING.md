# E2: Performance & Monitoring Implementation

## Overview

This document describes the comprehensive performance monitoring, optimization, and load testing infrastructure implemented for the In Midst My Life platform.

## Components Implemented

### 1. Monitoring Stack (Prometheus + Grafana)

**Docker Compose Services:**
- Prometheus (port 9090): Metrics collection and storage
- Grafana (port 3003): Visualization and dashboards
- Jaeger (port 16686): Distributed tracing UI
- Redis Exporter (port 9121): Redis metrics
- PostgreSQL Exporter (port 9187): Database metrics

**Configuration Files:**
- `infra/prometheus/prometheus.yml`: Prometheus scrape configuration
- `infra/grafana/provisioning/`: Grafana datasources and dashboard provisioning
- `infra/grafana/dashboards/`: Performance dashboard definitions

### 2. OpenTelemetry Distributed Tracing

**Instrumentation (`apps/api/src/tracing.ts`):**
- Auto-instrumentation for HTTP, PostgreSQL, Redis
- OTLP exporter to Jaeger
- Service name and version tagging
- Production-safe configuration

**Integration:**
- Initialized at application startup
- Automatically traces all HTTP requests
- Captures database query spans
- Records Redis operation spans

### 3. Prometheus Metrics

**Custom Metrics (`apps/api/src/metrics.ts`):**

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, route, status |
| `http_request_duration_seconds` | Histogram | Request latency with P50/P95/P99 |
| `db_queries_total` | Counter | Database queries by operation and table |
| `db_query_duration_seconds` | Histogram | Query execution time |
| `redis_operations_total` | Counter | Redis operations by type |
| `redis_operation_duration_seconds` | Histogram | Redis operation latency |
| `cache_hits_total` | Counter | Cache hit count by cache type |
| `cache_misses_total` | Counter | Cache miss count by cache type |
| `active_connections` | Gauge | Active connection count by type |

**Metrics Server:**
- Dedicated port 9464 for Prometheus scraping
- Separate from main API traffic
- Health endpoint for monitoring

### 4. Grafana Dashboards

**API Performance Dashboard** (`api-performance.json`):
- Request latency percentiles (P50, P95, P99) by route
- Request rate and throughput
- Error rates and status code distribution
- Database query performance
- Redis operation metrics
- Cache hit rates

**Database & Redis Dashboard** (`database-redis.json`):
- PostgreSQL connection pool metrics
- Transaction rates (commits/rollbacks)
- Cache hit ratio
- Row activity and query patterns
- Redis memory usage
- Redis command throughput
- Keyspace hit rates

### 5. Load Testing (k6)

**Test Suites:**

1. **Smoke Test** (`smoke-test.js`):
   - Duration: ~1 minute
   - Max VUs: 100
   - Purpose: Quick validation

2. **API Load Test** (`api-load-test.js`):
   - Duration: 7 minutes
   - Max VUs: 1000
   - Sustained: 2 minutes at 1000 req/s
   - Thresholds:
     - P95 latency < 500ms
     - P99 latency < 1000ms
     - Error rate < 5%

3. **Stress Test** (`stress-test.js`):
   - Duration: 20 minutes
   - Max VUs: 2000
   - Purpose: Find breaking points

**Scenarios:**
- 40% health checks
- 30% profile listings
- 15% profile details
- 10% taxonomy queries
- 5% readiness checks

### 6. Database Optimization

**Performance Indexes** (`migrations/009_performance_indexes.sql`):
- Composite indexes for common query patterns
- Created with `CONCURRENTLY` to avoid locking
- Covering indexes for frequently accessed columns
- Optimized for:
  - Profile lookups by email, date ranges
  - Mask/CV queries by profile_id
  - Job application status filtering
  - Subscription tier checks
  - Rate limiting composite keys

**Analysis Tool** (`scripts/analyze-db-performance.ts`):
- Slowest queries identification
- Index usage statistics
- Unused index detection
- Sequential scan analysis
- Cache hit ratio monitoring
- Actionable recommendations

### 7. Redis Caching Strategy

**Enhanced Cache Service** (`apps/api/src/services/cache.ts`):

**Features:**
- Dual implementation: Memory (fallback) and Redis
- Integrated Prometheus metrics
- Automatic cache invalidation
- Pattern-based key deletion
- TTL management

**Cache TTLs:**
- Taxonomy data: 1 hour (stable data)
- Profile data: 10 minutes
- Timeline data: 5 minutes
- Narrative blocks: 3 minutes
- User-specific data: 1 minute

**Cache Keys:**
```
masks:list:{offset}:{limit}:{ontology?}
mask:{id}
epochs:list:{offset}:{limit}
epoch:{id}
stages:list:{offset}:{limit}:{epochId?}
stage:{id}
```

### 8. Error Tracking (Sentry)

**Integration** (`apps/api/src/sentry.ts`):
- Automatic error capture
- Request context enrichment
- Environment-specific sampling rates
- Graceful degradation when unavailable

**Configuration:**
- Development: 100% trace sampling
- Production: 10% trace sampling
- Captures uncaught exceptions
- Captures unhandled rejections

### 9. CI/CD Performance Budgets

**Performance Check Script** (`scripts/check-performance-budget.sh`):
- Automated load test execution
- P95 latency validation (< 500ms)
- Error rate validation (< 5%)
- JSON results parsing
- CI-friendly exit codes

**GitHub Actions Workflow** (`.github/workflows/performance.yml`):

**Jobs:**
1. **performance-tests** (on every push/PR):
   - Smoke tests
   - Performance budget validation
   - Database analysis
   - Metrics collection

2. **stress-test** (scheduled daily):
   - Extended stress testing
   - Breaking point identification
   - Regression detection

**Artifacts:**
- Performance test results (30-day retention)
- Database analysis reports
- Prometheus metrics snapshots

## Usage

### Local Development

1. **Start monitoring stack:**
```bash
docker-compose up -d prometheus grafana jaeger redis-exporter postgres-exporter
```

2. **Access dashboards:**
- Grafana: http://localhost:3003 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686

3. **Run load tests:**
```bash
# Smoke test
k6 run scripts/load-test/smoke-test.js

# Full load test
API_BASE_URL=http://localhost:3001 k6 run scripts/load-test/api-load-test.js

# Stress test
k6 run scripts/load-test/stress-test.js
```

4. **Analyze database performance:**
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/midst tsx scripts/analyze-db-performance.ts
```

5. **Check performance budget:**
```bash
./scripts/check-performance-budget.sh
```

### Production Deployment

1. **Environment Variables:**
```bash
# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_SERVICE_NAME=api

# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production

# Redis (for caching)
REDIS_URL=redis://redis:6379

# Metrics
METRICS_PORT=9464
```

2. **Apply database indexes:**
```bash
pnpm --filter @in-midst-my-life/api migrate
```

3. **Configure Prometheus scraping:**
- API metrics: `http://api:3001/metrics`
- Dedicated metrics: `http://api:9464/metrics`

4. **Import Grafana dashboards:**
- Import from `infra/grafana/dashboards/*.json`
- Or auto-provision via volume mount

### Monitoring Best Practices

1. **Alert on:**
   - P95 latency > 500ms for 5 minutes
   - Error rate > 5% for 5 minutes
   - Database connection pool > 80% for 5 minutes
   - Redis memory > 90% for 5 minutes
   - Cache hit rate < 70% for 10 minutes

2. **Regular checks:**
   - Weekly database performance analysis
   - Monthly stress testing
   - Quarterly capacity planning review

3. **Optimization workflow:**
   - Identify slow queries in Grafana
   - Run EXPLAIN ANALYZE on queries
   - Add indexes or optimize queries
   - Validate with load tests
   - Monitor in production

## Performance Budgets

| Metric | Target | Threshold | Action on Violation |
|--------|--------|-----------|---------------------|
| P95 Latency | < 300ms | < 500ms | CI fails |
| P99 Latency | < 500ms | < 1000ms | Warning |
| Error Rate | < 1% | < 5% | CI fails |
| Cache Hit Rate | > 85% | > 70% | Alert |
| DB Cache Hit | > 95% | > 90% | Alert |
| Throughput | > 1000 req/s | > 500 req/s | Warning |

## Optimization Checklist

- [x] Prometheus + Grafana setup
- [x] OpenTelemetry distributed tracing
- [x] Custom application metrics
- [x] Performance dashboards
- [x] k6 load tests (1000 req/s)
- [x] Database indexes optimization
- [x] Redis caching strategy
- [x] Sentry error tracking
- [x] CI/CD performance checks
- [x] Performance budget enforcement

## Key Metrics to Monitor

**Golden Signals:**
1. **Latency**: P50, P95, P99 request duration
2. **Traffic**: Requests per second
3. **Errors**: Error rate and 5xx responses
4. **Saturation**: CPU, memory, connection pools

**Custom Metrics:**
1. Cache hit rates (Redis and application)
2. Database query performance
3. Connection pool utilization
4. Queue depths (if applicable)

## Troubleshooting

**High Latency:**
1. Check Grafana "API Performance" dashboard
2. Identify slow routes/queries
3. Run database performance analysis
4. Review indexes and query plans
5. Check cache hit rates

**High Error Rate:**
1. Check Sentry for error details
2. Review application logs
3. Check database connection pool
4. Verify service dependencies (Redis, Postgres)

**Database Performance:**
1. Run `tsx scripts/analyze-db-performance.ts`
2. Identify missing indexes
3. Check for sequential scans on large tables
4. Review slow queries in pg_stat_statements
5. Optimize or add caching

**Redis Issues:**
1. Check Redis dashboard in Grafana
2. Monitor memory usage
3. Review keyspace hit rate
4. Check for evictions
5. Verify TTL settings

## Dependencies

A1, A2, C1 must be stable for accurate performance testing:
- Database schema complete (A1)
- API endpoints functional (A2)
- Authentication working (C1)

## References

- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- k6: https://k6.io/docs/
- OpenTelemetry: https://opentelemetry.io/docs/
- Sentry: https://docs.sentry.io/

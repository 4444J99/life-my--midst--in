# Performance & Monitoring Quick Reference

## 🚀 Quick Start

Start the full monitoring stack:
```bash
docker-compose up -d
```

## 📊 Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3003 | admin/admin |
| Prometheus | http://localhost:9090 | none |
| Jaeger | http://localhost:16686 | none |
| API Metrics | http://localhost:3001/metrics | none |
| API Metrics (Prom) | http://localhost:9464/metrics | none |

## 🧪 Load Testing

```bash
# Install k6 (macOS)
brew install k6

# Smoke test (1 min, validate basic functionality)
k6 run scripts/load-test/smoke-test.js

# Standard load test (7 min, 1000 req/s sustained)
API_BASE_URL=http://localhost:3001 k6 run scripts/load-test/api-load-test.js

# Stress test (20 min, 2000 VUs)
k6 run scripts/load-test/stress-test.js

# Check performance budget (CI-style)
./scripts/check-performance-budget.sh
```

## 🔍 Database Analysis

```bash
# Analyze database performance
DATABASE_URL=postgresql://user:pass@localhost:5432/midst \
  tsx scripts/analyze-db-performance.ts

# Apply performance indexes
pnpm --filter @in-midst-my-life/api migrate
```

## 📈 Key Metrics

**Golden Signals:**
- **Latency:** P50/P95/P99 request duration
- **Traffic:** Requests per second  
- **Errors:** Error rate and 5xx responses
- **Saturation:** Connection pools, CPU, memory

**Performance Budgets:**
- P95 latency: < 500ms (CI fails if exceeded)
- P99 latency: < 1000ms
- Error rate: < 5% (CI fails if exceeded)
- Cache hit rate: > 70%
- DB cache hit: > 90%

## 🛠️ Environment Variables

```bash
# OpenTelemetry Tracing
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
OTEL_SERVICE_NAME=api

# Error Tracking
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production

# Caching
REDIS_URL=redis://redis:6379

# Metrics
METRICS_PORT=9464
```

## 🐛 Troubleshooting

**High Latency?**
1. Check Grafana API Performance dashboard
2. Run: `tsx scripts/analyze-db-performance.ts`
3. Review slow queries and add indexes
4. Check cache hit rates

**High Error Rate?**
1. Check Sentry for error details
2. Review Grafana Error Rate panel
3. Check database connection pool
4. Verify Redis/Postgres health

**Database Slow?**
1. Run performance analysis script
2. Check for missing indexes
3. Look for sequential scans
4. Review `pg_stat_statements`

## 📚 Documentation

- Full guide: [`docs/E2-PERFORMANCE-MONITORING.md`](docs/E2-PERFORMANCE-MONITORING.md)
- Load testing: [`scripts/load-test/README.md`](scripts/load-test/README.md)
- Summary: [`E2-IMPLEMENTATION-SUMMARY.md`](E2-IMPLEMENTATION-SUMMARY.md)

## 🎯 CI/CD

GitHub Actions automatically runs:
- Smoke tests on every push
- Performance budget validation
- Database analysis
- Daily stress tests (scheduled)

Performance budget violations will fail CI builds.

## 📦 What's Included

- ✅ Prometheus + Grafana monitoring
- ✅ OpenTelemetry distributed tracing
- ✅ Custom application metrics
- ✅ k6 load tests (1000 req/s)
- ✅ Database optimization indexes
- ✅ Redis caching with metrics
- ✅ Sentry error tracking
- ✅ CI/CD performance checks
- ✅ Performance budget enforcement

---

For detailed implementation, see [E2-IMPLEMENTATION-SUMMARY.md](E2-IMPLEMENTATION-SUMMARY.md)

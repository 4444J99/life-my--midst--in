# Load Testing Scripts

This directory contains k6 load testing scripts for the In Midst My Life API.

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6:latest
```

## Test Scripts

### 1. Smoke Test (`smoke-test.js`)
Quick validation test with low load to verify basic functionality.

**Duration:** ~1 minute  
**Max VUs:** 100  
**Purpose:** Verify endpoints respond correctly under minimal load

```bash
k6 run scripts/load-test/smoke-test.js
```

### 2. API Load Test (`api-load-test.js`)
Standard load test simulating realistic traffic patterns.

**Duration:** ~7 minutes  
**Max VUs:** 1000  
**Ramp-up:** Gradual increase to 1000 req/s  
**Purpose:** Validate system handles expected production load

**Thresholds:**
- P95 latency < 500ms
- P99 latency < 1000ms
- Error rate < 5%

```bash
k6 run scripts/load-test/api-load-test.js
```

**With custom base URL:**
```bash
API_BASE_URL=http://api.example.com k6 run scripts/load-test/api-load-test.js
```

### 3. Stress Test (`stress-test.js`)
High-load stress test to find system breaking points.

**Duration:** ~20 minutes  
**Max VUs:** 2000  
**Purpose:** Identify performance degradation and failure thresholds

```bash
k6 run scripts/load-test/stress-test.js
```

## Running in Docker

```bash
docker run --rm -i --network=host \
  -e API_BASE_URL=http://localhost:3001 \
  grafana/k6:latest run - < scripts/load-test/api-load-test.js
```

## Output Formats

### Summary to JSON
```bash
k6 run --out json=results.json scripts/load-test/api-load-test.js
```

### Real-time metrics to InfluxDB
```bash
k6 run --out influxdb=http://localhost:8086/k6 scripts/load-test/api-load-test.js
```

### Send results to Grafana Cloud
```bash
K6_CLOUD_TOKEN=<token> k6 run --out cloud scripts/load-test/api-load-test.js
```

## Interpreting Results

### Key Metrics
- **http_req_duration:** Request latency (p95, p99, avg, max)
- **http_req_failed:** Failed request rate
- **http_reqs:** Total requests per second
- **vus:** Virtual users (concurrent connections)
- **errors:** Custom error rate metric

### Success Criteria
- ✅ P95 latency < 500ms
- ✅ P99 latency < 1000ms  
- ✅ Error rate < 5%
- ✅ Sustained 1000 req/s for 2+ minutes

### Warning Signs
- ⚠️ P95 latency > 500ms → Database optimization needed
- ⚠️ Error rate > 5% → Application errors or capacity issues
- ⚠️ Increasing latency over time → Memory leak or resource exhaustion

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Run Load Tests
  run: |
    docker-compose up -d api postgres redis
    sleep 30
    k6 run --quiet scripts/load-test/api-load-test.js
    if [ $? -ne 0 ]; then
      echo "Load test failed: P95 latency exceeds 500ms threshold"
      exit 1
    fi
```

## Monitoring During Tests

1. **Prometheus/Grafana:**
   - http://localhost:3003 (Grafana)
   - View real-time metrics during load tests

2. **k6 Web Dashboard:**
   ```bash
   k6 run --out web-dashboard scripts/load-test/api-load-test.js
   ```

3. **System Resources:**
   ```bash
   docker stats
   ```

## Optimization Tips

Based on test results:

1. **High latency on `/profiles`** → Add database indexes, implement caching
2. **Redis bottleneck** → Increase connection pool, add read replicas
3. **High memory usage** → Check for memory leaks, optimize query sizes
4. **Connection errors** → Increase connection limits, add load balancing

## Advanced Usage

### Custom Scenarios
Edit `api-load-test.js` to adjust:
- `stages`: Ramp-up pattern
- `scenarios`: Weight distribution between endpoints
- `thresholds`: Performance requirements

### Database Seeding
Ensure database has realistic data before testing:
```bash
pnpm --filter @in-midst-my-life/api seed
k6 run scripts/load-test/api-load-test.js
```

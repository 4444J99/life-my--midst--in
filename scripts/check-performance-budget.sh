#!/usr/bin/env bash
set -euo pipefail

# Performance Budget CI/CD Check
# Validates that P95 latency remains under 500ms threshold

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

API_URL="${API_URL:-http://localhost:3001}"
THRESHOLD_P95_MS="${THRESHOLD_P95_MS:-500}"
THRESHOLD_ERROR_RATE="${THRESHOLD_ERROR_RATE:-0.05}"
K6_BINARY="${K6_BINARY:-k6}"

echo "🎯 Performance Budget Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API URL: $API_URL"
echo "P95 Threshold: ${THRESHOLD_P95_MS}ms"
echo "Error Rate Threshold: ${THRESHOLD_ERROR_RATE}%"
echo ""

# Check if k6 is installed
if ! command -v "$K6_BINARY" &> /dev/null; then
    echo "❌ k6 is not installed. Install it with:"
    echo "   brew install k6  # macOS"
    echo "   sudo snap install k6  # Linux"
    echo "   choco install k6  # Windows"
    exit 1
fi

# Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
for i in {1..30}; do
    if curl -sf "$API_URL/health" > /dev/null 2>&1; then
        echo "✅ API is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ API failed to become ready after 30 seconds"
        exit 1
    fi
    sleep 1
done

echo ""
echo "🚀 Running load test..."
echo ""

# Run k6 load test with JSON output
RESULTS_FILE=$(mktemp)
API_BASE_URL="$API_URL" "$K6_BINARY" run \
    --out json="$RESULTS_FILE" \
    --quiet \
    "$PROJECT_ROOT/scripts/load-test/api-load-test.js" || TEST_EXIT_CODE=$?

# Parse results
echo ""
echo "📊 Analyzing results..."
echo ""

# Extract P95 latency from k6 JSON output
P95_LATENCY=$(jq -r '
  select(.type == "Point" and .metric == "http_req_duration" and .data.tags.expected_response == "true") 
  | .data.value
' "$RESULTS_FILE" | sort -n | awk '
  BEGIN { count=0 }
  { values[count++] = $1 }
  END {
    if (count == 0) { print "0"; exit }
    p95_index = int(count * 0.95)
    print values[p95_index]
  }
')

# Extract error rate
TOTAL_REQUESTS=$(jq -r '
  select(.type == "Point" and .metric == "http_reqs")
  | .data.value
' "$RESULTS_FILE" | awk '{ sum+=$1 } END { print sum }')

ERROR_COUNT=$(jq -r '
  select(.type == "Point" and .metric == "http_req_failed" and .data.value == 1)
  | 1
' "$RESULTS_FILE" | wc -l | tr -d ' ')

if [ "$TOTAL_REQUESTS" -gt 0 ]; then
    ERROR_RATE=$(echo "scale=4; $ERROR_COUNT / $TOTAL_REQUESTS" | bc)
else
    ERROR_RATE="0"
fi

# Cleanup
rm -f "$RESULTS_FILE"

# Report results
echo "Results:"
echo "  P95 Latency: ${P95_LATENCY}ms (threshold: ${THRESHOLD_P95_MS}ms)"
echo "  Error Rate: ${ERROR_RATE} (threshold: ${THRESHOLD_ERROR_RATE})"
echo "  Total Requests: $TOTAL_REQUESTS"
echo "  Failed Requests: $ERROR_COUNT"
echo ""

# Check thresholds
FAILED=0

if (( $(echo "$P95_LATENCY > $THRESHOLD_P95_MS" | bc -l) )); then
    echo "❌ P95 latency (${P95_LATENCY}ms) exceeds threshold (${THRESHOLD_P95_MS}ms)"
    FAILED=1
else
    echo "✅ P95 latency within budget"
fi

if (( $(echo "$ERROR_RATE > $THRESHOLD_ERROR_RATE" | bc -l) )); then
    echo "❌ Error rate ($ERROR_RATE) exceeds threshold ($THRESHOLD_ERROR_RATE)"
    FAILED=1
else
    echo "✅ Error rate within budget"
fi

echo ""

if [ $FAILED -eq 1 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❌ Performance budget check FAILED"
    echo ""
    echo "🔍 Troubleshooting steps:"
    echo "  1. Check Grafana dashboards: http://localhost:3003"
    echo "  2. Run: tsx scripts/analyze-db-performance.ts"
    echo "  3. Review slow queries and add indexes"
    echo "  4. Check Redis cache hit rate"
    echo "  5. Review error logs for bottlenecks"
    exit 1
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Performance budget check PASSED"
    exit 0
fi

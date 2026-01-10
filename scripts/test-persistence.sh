#!/bin/bash
set -e

if [[ "${PERSISTENCE_TEST:-}" != "1" ]]; then
  echo "Refusing to run: set PERSISTENCE_TEST=1 to confirm this is a test-only environment."
  exit 1
fi

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-midst-persistence-test}"
COMPOSE_ARGS=(-f docker-compose.prod.yml -p "${PROJECT_NAME}")

echo "🧪 Starting Persistence Test (project: ${PROJECT_NAME})..."

# 1. Start Postgres only
echo "Starting DB..."
docker compose "${COMPOSE_ARGS[@]}" up -d postgres
sleep 5

# 2. Write Data
echo "Writing test data..."
docker compose "${COMPOSE_ARGS[@]}" exec postgres psql -U midstsvc -d midst -c "CREATE TABLE IF NOT EXISTS persistence_test (id serial primary key, val text);"
docker compose "${COMPOSE_ARGS[@]}" exec postgres psql -U midstsvc -d midst -c "INSERT INTO persistence_test (val) VALUES ('survived');"

# 3. Stop DB
echo "Stopping DB..."
docker compose "${COMPOSE_ARGS[@]}" stop postgres
docker compose "${COMPOSE_ARGS[@]}" rm -f postgres

# 4. Restart DB
echo "Restarting DB..."
docker compose "${COMPOSE_ARGS[@]}" up -d postgres
sleep 5

# 5. Verify Data
echo "Verifying data..."
RESULT=$(docker compose "${COMPOSE_ARGS[@]}" exec postgres psql -U midstsvc -d midst -t -c "SELECT val FROM persistence_test WHERE val = 'survived';")

if [[ $RESULT == *"survived"* ]]; then
  echo "✅ Persistence Test PASSED: Data survived restart."
  # Cleanup
  docker compose "${COMPOSE_ARGS[@]}" exec postgres psql -U midstsvc -d midst -c "DROP TABLE persistence_test;"
else
  echo "❌ Persistence Test FAILED: Data lost."
  exit 1
fi

echo "Test Complete."

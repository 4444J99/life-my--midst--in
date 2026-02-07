#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting Postgres and Redis via docker-compose..."
docker-compose -f "$REPO_ROOT/infra/docker-compose.yml" up -d

db_host="${POSTGRES_HOST:-localhost}"
db_port="${POSTGRES_PORT:-5432}"
db_user="${POSTGRES_USER:-midstsvc}"
db_name="${POSTGRES_DB:-midst}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  masked_db_url="$(echo "$DATABASE_URL" | sed -E 's#(://[^:]+):[^@]+@#\1:****@#')"
  echo "Postgres URL: ${masked_db_url}"
else
  echo "Postgres URL: postgresql://${db_user}:<password>@${db_host}:${db_port}/${db_name}"
  echo "Set DATABASE_URL or POSTGRES_* via 1Password to avoid plaintext secrets."
fi

echo "Redis URL: ${REDIS_URL:-redis://localhost:6379}"

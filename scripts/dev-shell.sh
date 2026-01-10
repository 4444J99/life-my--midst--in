#!/usr/bin/env bash
set -euo pipefail

service="${1:-postgres}"

if [[ "$service" == "postgres" ]]; then
  db_user="${POSTGRES_USER:-midstsvc}"
  db_name="${POSTGRES_DB:-midst}"
  docker exec -it inmidst-postgres psql -U "${db_user}" -d "${db_name}"
elif [[ "$service" == "redis" ]]; then
  docker exec -it inmidst-redis redis-cli
else
  echo "Usage: $0 [postgres|redis]" >&2
  exit 1
fi

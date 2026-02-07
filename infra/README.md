# Infrastructure

Infrastructure-as-code and deployment configuration:
- `terraform/` – Cloud resources
- `helm/`      – Helm chart scaffold (`values.yaml` holds env overrides)
- `k6/`        – Load testing scenarios (see [k6/README.md](k6/README.md))
- `grafana/`   – Dashboards and provisioning configuration
- `prometheus/` – Prometheus scrape configuration
- `docker-compose.yml` – Local dev stack (Postgres, Redis, API, Orchestrator, Web)
- `docker-compose.prod.yml` – Production Compose configuration
- `Dockerfile` – Root web application image (multi-stage Node 22 Alpine)
- `railway.json` / `render.yaml` / `vercel.json` – PaaS deployment configs
- `.env.example` / `.env.integration.example` / `.env.production.example` – Environment templates

## Migrations & Seeds
- Local: `docker-compose -f infra/docker-compose.yml run --rm migrations` (profile `init`) runs API + Orchestrator migrations/seeds against compose Postgres.
- CI: `.github/workflows/test.yml` runs migrations before tests; integration jobs bring their own Postgres/Redis.
- Helm: `values.yaml` includes `migrations.env`; `templates/migrations-job.yaml` installs as a `pre-install,pre-upgrade` hook and runs `pnpm --filter @in-midst-my-life/api migrate && pnpm --filter @in-midst-my-life/orchestrator migrate`.

## Environments
- API: `DATABASE_URL`/`POSTGRES_URL` required when using Postgres repos.
- Orchestrator: `DATABASE_URL` + `ORCH_TASK_STORE=postgres`, `TASK_QUEUE=redis`, `REDIS_URL`.
- Web: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_ORCH_BASE_URL`.

Keep dev/test/integration databases distinct (e.g., `midst_dev`, `midst_test`, `midst_integration`). Seeds are idempotent (`ON CONFLICT DO NOTHING`).

## Load Testing

Performance testing is done with [k6](https://k6.io/). See [`k6/README.md`](k6/README.md) for detailed instructions.

Quick start:
```bash
# Install k6 (macOS)
brew install k6

# Run smoke test (quick validation)
k6 run infra/k6/scenarios/smoke.js

# Run baseline test (normal load)
k6 run infra/k6/scenarios/baseline.js

# Run stress test (find breaking point)
k6 run --env SCENARIO=stress infra/k6/scenarios/baseline.js
```

## Monitoring

Grafana dashboards are in `grafana/dashboards/`:
- `api-metrics.json` – Comprehensive API metrics (latency, throughput, errors)
- `api-performance.json` – Performance-focused view
- `database-redis.json` – Database and cache metrics
- `system-overview.json` – System-level metrics

Import dashboards via Grafana UI or use the provisioning files in `grafana/provisioning/`.

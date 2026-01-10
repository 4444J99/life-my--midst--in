# Security Checklist

- **Secrets hygiene**: keep `.env`/`.env.local` out of git; never commit API keys or tokens. Prefer `vault`/`1Password` for sharing; set `DATABASE_URL`, `REDIS_URL`, webhook secrets, and any optional hosted-provider keys at deploy time.
- **Ingress protection**: gate `/metrics` and `/openapi.yaml` behind auth in prod (basic auth, OIDC, or IP allowlists). Avoid exposing `/webhooks/github` publicly without signature validation.
- **DB/queue isolation**: use distinct Postgres DBs (`midst_dev`, `midst_test`, `midst_integration`, `midst_prod`) and Redis DBs/namespaces per environment. Rotate credentials when sharing.
- **Dependency surface**: run `pnpm audit` before releases; prefer pinned minor versions and rebuild images after updates.
- **Logging/PII**: avoid logging access tokens or raw webhook payloads; redact in orchestrator worker logs and API middleware where added.
- **Least privilege**: create scoped DB users for app access (no superuser) and restrict network paths between services to only Postgres/Redis/API ports.
- **Secret scans**: run `gitleaks detect` (or similar) before releasing; CI should fail on committed secrets.

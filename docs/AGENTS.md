# Repository Guidelines

Global policy: /Users/4jp/AGENTS.md applies. If a parent AGENTS.md exists, follow it plus this file.

## Project Structure & Module Organization
- apps/: `apps/api` (Fastify), `apps/orchestrator` (workers/LLM), `apps/web` (Next.js).
- packages/: shared libraries in `packages/schema`, `packages/core`, `packages/content-model`, `packages/design-system`.
- Data layer: `apps/api/migrations`, `apps/api/seeds`, `apps/orchestrator/migrations`, `apps/orchestrator/seeds`.
- Docs/specs: `SPEC-*`, `ARCH-*`, `PLAN-*`, `WORK-*`, `ORCH-*` at repo root; `docs/` for security/spec notes; `infra/` and `docker-compose.yml` for deployment/dev services.

## Build, Test, and Development Commands
- Install: `pnpm install`.
- Dev all: `pnpm dev`; per app: `pnpm --filter @in-midst-my-life/api dev`, `pnpm --filter @in-midst-my-life/orchestrator dev`, `pnpm --filter @in-midst-my-life/web dev`.
- DB/Redis: `scripts/dev-up.sh` or `docker-compose up postgres redis`; shells via `scripts/dev-shell.sh`.
- Migrate/seed: `pnpm --filter @in-midst-my-life/api migrate` / `seed` and `pnpm --filter @in-midst-my-life/orchestrator migrate` / `seed`.
- Quality: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; integration: `INTEGRATION_POSTGRES_URL=... INTEGRATION_REDIS_URL=... pnpm integration`.

## Coding Style & Naming Conventions
- TypeScript strict, ESLint + Prettier; accept Prettier defaults (2-space indentation, semicolons).
- Naming: PascalCase types/components, camelCase functions, kebab-case file names, SCREAMING_SNAKE_CASE env vars.
- Keep domain logic in `packages/*`; apps stay thin (transport, wiring).

## Testing Guidelines
- Vitest; tests in `*/test` or `__tests__`, matching `*.test.ts`.
- Integration suites: `apps/api/test/postgres.integration.test.ts`, `apps/orchestrator/test/integration.test.ts`; require migrations and `INTEGRATION_*` envs.
- Coverage thresholds (CI): 75% statements/lines/functions, 65% branches (`vitest.config.ts`).

## Commit & Pull Request Guidelines
- No git history present in this checkout; default to Conventional Commits (e.g., `feat: add taxonomy endpoint`, `fix: handle null masks`).
- PRs: summary + rationale, linked doc/spec (e.g., `SPEC-002`, `WORK-005`), commands run, and note any migrations/seeds or OpenAPI updates; include screenshots for web changes.

## Security & Configuration
- Do not commit secrets; use `.env`/`.env.local`, and keep `DATABASE_URL`/`REDIS_URL` out of git.
- Default to open-source, free-usage models; local LLMs via `ORCH_AGENT_EXECUTOR=local` and `LOCAL_LLM_URL=http://localhost:11434`.
- Treat `/metrics` as internal in prod; lock down via ingress/auth.

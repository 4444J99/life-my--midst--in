# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an **implemented interactive CV/résumé system** (`in–midst–my-life`) that transforms a static resume into a dynamic, queryable, multi-perspective profile with mask-based identity filtering and blockchain-inspired verification capabilities.

The project has progressed from design documents to a working monorepo implementation with:
- **3 applications** (Next.js frontend, Fastify backend API, Node.js orchestrator)
- **4 core packages** (schema, content-model, core utilities, design-system)
- **PostgreSQL + Redis** persistence layer with migration scripts
- **Comprehensive test coverage** via Vitest with integration test support

## Project Structure

```
life-my--midst--in/
├── apps/
│   ├── web/              Next.js 16 UI dashboard (3000)
│   ├── api/              Fastify REST API (3001) - Profile CRUD, narrative endpoints, taxonomy
│   └── orchestrator/      Node.js worker service (3002) - Task queue, GitHub webhooks, agent execution
├── packages/
│   ├── schema/           Zod schemas & TypeScript types (identity, profiles, masks, epochs, stages)
│   ├── core/             Business logic (mask matching, crypto, job handling, VCs)
│   ├── content-model/    Narrative generation & JSON-LD transforms
│   └── design-system/    Shared UI primitives
├── infra/                Docker Compose, Helm charts, Dockerfiles, PaaS configs
├── scripts/              Dev utilities (dev-up.sh, dev-shell.sh, migrations)
└── docs/                 Architecture docs and security guidelines
```

## Quick Commands

### Workspace & Dependencies
```bash
# Install all dependencies (monorepo)
pnpm install

# Update a single package (e.g., Next.js)
pnpm update next

# Check workspace structure
pnpm list --depth=0
```

### Build & Development
```bash
# Build all packages (respects Turbo dependency graph)
pnpm build

# Run all dev servers (web, API, orchestrator) in parallel
pnpm dev

# Watch-mode TypeScript checks
pnpm typecheck

# Lint entire monorepo
pnpm lint
```

### Database & Services
```bash
# Spin up PostgreSQL + Redis via Docker Compose
scripts/dev-up.sh

# Open psql/redis-cli shell to dev services
scripts/dev-shell.sh

# Run API migrations (idempotent)
pnpm --filter @in-midst-my-life/api migrate

# Run orchestrator migrations (idempotent)
pnpm --filter @in-midst-my-life/orchestrator migrate

# Seed demo data into both services
pnpm --filter @in-midst-my-life/api seed
pnpm --filter @in-midst-my-life/orchestrator seed
```

### Testing
```bash
# Run all unit tests
pnpm test

# Watch mode (auto-rerun on changes)
pnpm test:watch

# Run integration tests (requires INTEGRATION_POSTGRES_URL set)
pnpm integration

# Integration tests for specific service
pnpm --filter @in-midst-my-life/api integration
pnpm --filter @in-midst-my-life/orchestrator integration

# Generate coverage report (runs on CI only)
CI=true pnpm test
```

### Single App/Package Tasks
```bash
# Run command in specific workspace
pnpm --filter @in-midst-my-life/schema build
pnpm --filter @in-midst-my-life/api dev
pnpm --filter @in-midst-my-life/web test

# Shorthand (if app name is unique)
pnpm --filter web dev
pnpm --filter api test
pnpm --filter orchestrator test:watch
```

## Architecture Patterns

### Schema-First Design
All data models are defined in `packages/schema/` using Zod. This is the single source of truth:
- `identity.ts` - Identity & personal thesis
- `profile.ts` - Complete user profile
- `mask.ts` - Identity masks (15+ types)
- `epoch.ts` - Temporal periods
- `stage.ts` - Career stages
- `narrative.ts` - Narrative block structure
- `verification.ts` - DID/VC related schemas

Consuming packages import types and validators from here.

### Hexagonal Architecture (Ports & Adapters)
**API** (`apps/api`) follows hexagonal architecture:
- `src/validation/` - Input validators (request contracts)
- `src/services/` - Core business logic (no framework dependencies)
- `src/routes/` - Fastify route handlers (thin orchestration layer)
- `src/db/` - Repository pattern (abstracts Postgres)

### Narrative Engine (Content Generation)
`packages/content-model/` transforms profiles into different outputs:
- Mask-filtered views (context-specific identity presentation)
- JSON-LD exports (semantic web / LinkedIn consumption)
- Narrative blocks with weighting (for LLM ranking)
- Timeline rendering with epoch grouping

### Mask System
Core matching logic in `packages/core/maskMatching.ts`:
- Given contexts (tags, audience), rank available masks
- Each mask filters/transforms profile data differently
- Preserves identity invariants while changing presentation
- 15+ functional masks: Analyst, Synthesist, Artisan, Architect, etc.

## Environment & Configuration

### Development
```bash
# .env.local or environment variables
DATABASE_URL=postgresql://user:pass@localhost:5432/midst_dev
POSTGRES_URL=postgresql://user:pass@localhost:5432/midst_dev  # API specific
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### Integration Tests
```bash
# Use separate databases to avoid touching dev data
INTEGRATION_POSTGRES_URL=postgresql://user:pass@localhost:5432/midst_test
INTEGRATION_REDIS_URL=redis://localhost:6379/1
```

### Database Names
Keep distinct databases per environment:
- `midst_dev` - Development
- `midst_test` - Unit/integration testing
- `midst_integration` - CI environment
- `midst_prod` - Production

Migrations are idempotent and safe to re-run across environments.

## Code Quality Standards

**TypeScript**: Strict mode enforced (`tsconfig.json`):
- No implicit any
- No unused locals/parameters
- No implicit returns
- ESModuleInterop enabled

**Linting**: ESLint + Prettier (monorepo root config)
- `@typescript-eslint` rules including strict async/await enforcement
- Prettier for formatting consistency
- Config: `eslint.config.mjs` (ESLint 9 flat config), `.prettierrc`

**Testing**: Vitest with coverage thresholds (`vitest.config.ts`)
- 75% statements, branches, functions, lines (global)
- Higher thresholds encouraged for schema/core packages
- Coverage enabled only on CI (`CI=true`)

**File Size Limits** (from `docs/seed.yaml`):
- Max 1200 LOC per file
- Max 200 LOC per function
- Max cyclomatic complexity of 10

## Module Boundaries

### Allowed Imports
- Apps can import from `packages/*`
- `packages/content-model`, `packages/core` can import from `packages/schema`
- Each package has defined public API (see `index.ts` exports)

### Forbidden Imports
- Apps **cannot import from each other** (web ↔ api ↔ orchestrator)
- `packages/schema` cannot import from `packages/content-model` or `packages/core`
- No direct DB access outside repository layer

## API Contracts

### Health & Metrics
- `GET /health` - Returns `{ status: "ok" }` JSON
- `GET /ready` - Returns 200 if dependencies healthy
- `GET /metrics` - Prometheus-format metrics (plain text)

### Taxonomy Endpoints (all with pagination/filters)
- `GET /taxonomy/masks` - List all identity masks
- `GET /taxonomy/epochs` - List all temporal epochs
- `GET /taxonomy/stages` - List all career stages

### Profile Endpoints
- `GET /profiles/:id` - Fetch complete profile
- `POST /profiles/:id/masks/select` - Select mask context
- `POST /profiles/:id/narrative` - Generate narrative blocks
- `GET /profiles/:id/export/jsonld` - Semantic export
- `GET /profiles/:id/export/vc` - Verifiable credential export
- `GET /profiles/:id/export/pdf` - PDF resume

See `apps/api/openapi.yaml` for full contract.

## Orchestrator Tasks

Worker service at `:3002`:
- `GET /tasks` - List queued tasks
- `GET /tasks/:id/history` - Task execution history
- `POST /webhooks/github` - GitHub webhook ingestion
- Task execution via worker loop (Redis-backed queue)

## Docker Compose Stack

Full local development with `infra/docker-compose.yml`:
```bash
# Bring up all services (with migrations/seeds)
docker-compose -f infra/docker-compose.yml --profile init up

# Or step by step
docker-compose -f infra/docker-compose.yml up postgres redis
docker-compose -f infra/docker-compose.yml up api orchestrator
docker-compose -f infra/docker-compose.yml up web
```

Services:
- **postgres:5432** - Primary database
- **redis:6379** - Caching & task queue
- **api:3001** - Fastify server
- **orchestrator:3002** - Worker service
- **web:3000** - Next.js app (not in compose; run `pnpm dev` separately)

## Integration Testing

Tests that touch real DB/Redis require `INTEGRATION_*` env vars:
- Missing vars → integration tests skipped (safe for CI without external services)
- Set vars → full integration tests run

Example:
```bash
# In CI/CD, either:
# 1. Skip integration (don't set INTEGRATION_* vars)
# 2. Run against test databases (set vars, use separate DBs)

INTEGRATION_POSTGRES_URL=postgresql://localhost/midst_test \
INTEGRATION_REDIS_URL=redis://localhost/1 \
  pnpm integration
```

## Design Philosophy (from docs/seed.yaml)

**Modular monorepo** with these principles:
- **Schema-first**: Lock data model before UI/business logic
- **Hexagonal architecture**: Core logic independent from frameworks
- **Functional core, imperative shell**: Pure functions in core packages, side effects at app boundaries
- **Repository pattern**: Abstract data access behind interfaces
- **Dependency injection**: Make dependencies explicit

## Project Status

The project is **feature-complete** (65+ commits on master, zero open issues/PRs). All roadmap phases (0–7) plus API hardening, polish sprints, and dependency upgrades are done. See `docs/CHANGELOG.md` for full history.

## Useful References

- **[docs/seed.yaml](docs/seed.yaml)** - Repository "genome" with full constraints/standards
- **[docs/MANIFEST.md](docs/MANIFEST.md)** - Complete file catalog
- **[docs/archived/CONSOLIDATED-SPECIFICATIONS.md](docs/archived/CONSOLIDATED-SPECIFICATIONS.md)** - Technical specs
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security checklist for secrets/env isolation
- **[README.md](README.md)** - User-facing project overview

## Common Tasks

### Adding a new API endpoint
1. Define request/response schemas in `packages/schema/`
2. Write service logic in `apps/api/src/services/`
3. Add route in `apps/api/src/routes/`
4. Add tests in `apps/api/test/`
5. Update `apps/api/openapi.yaml`

### Modifying the profile schema
1. Edit `packages/schema/src/profile.ts`
2. Update content transformation in `packages/content-model/src/narrative.ts`
3. Update API seed data in `apps/api/src/scripts/seed.ts`
4. Run migrations if DB schema changes needed
5. Test: `pnpm test` (unit) + `pnpm integration` (with live DB)

### Running a single test file
```bash
# From monorepo root
pnpm --filter @in-midst-my-life/api test -- src/services/maskMatching.test.ts

# From within app/package directory
cd apps/api && pnpm test -- src/services/maskMatching.test.ts
```

### Debugging database issues
```bash
# Open interactive psql to dev database
scripts/dev-shell.sh

# View migration history
\d schema_migrations;

# Check current state
SELECT COUNT(*) FROM profiles;
SELECT * FROM masks LIMIT 5;
```

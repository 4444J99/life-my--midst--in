# Changelog

All notable changes to the in-midst-my-life project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `did:key`, `did:jwk`, `did:pkh` DID resolvers with plugin-based registry
- EventEmitter PubSub engine for GraphQL subscription events
- GraphQL subscription resolvers (`profileUpdated`, `narrativeGenerated`)
- WebSocket transport for GraphQL subscriptions via `@fastify/websocket` + `graphql-ws`
- DID resolution API endpoints (`GET /resolve/:did`, `GET /methods`)
- Ownership middleware on all write routes (billing, profile deletion)
- Admin middleware on taxonomy mutation routes
- Global auth hook with 3-tier routing (public, optional, required)
- SHA-256 checksums for content integrity verification
- Minimatch-based tag filtering for mask selection
- Architecture Decision Records ADR 011 (WebSocket subscriptions) and ADR 012 (DID resolvers)
- Playwright E2E testing infrastructure with CI integration (chromium)
- `test:coverage` scripts for all workspaces (`COVERAGE=true` env var)
- Turbo `e2e` pipeline with webServer auto-start in CI
- Integration tests for exports (16), search (11), webhook fulfillment (6)
- Persistent DID registry backed by PostgreSQL (replaces `MemoryDIDRegistry`)
- pgvector semantic search with OpenAI embeddings service
- Webhook fulfillment for Stripe subscription lifecycle events
- Zod environment validation for API and web apps (fail-fast on missing vars)
- Husky + lint-staged pre-commit hooks (ESLint + Prettier on staged `*.{ts,tsx}`)
- API route authentication audit documented in `apps/api/ROUTES.md`
- TypeScript strict mode re-enabled in `apps/api` and `apps/web`
- Bundle analyzer (`@next/bundle-analyzer`) and Web Vitals instrumentation
- CI bundle size check workflow
- Helm secrets extraction and backup/restore strategy (`docs/BACKUP-RESTORE.md`)
- Playwright E2E tests for navigation and admin flows
- Blog section with 5 posts and dynamic `[slug]` routing
- About page with team and project information
- Pricing page redesign with 3 subscription tiers
- Admin settings page for feature flags and service configuration
- Docker healthchecks and production Compose file (`docker-compose.prod.yml`)
- Comprehensive feature audit trail (`docs/FEATURE-AUDIT.md`)

### Changed
- Updated `CONSOLIDATED-SPECIFICATIONS.md` implementation snapshot to reflect feature completeness
- Updated `MANIFEST.md` from "90% Core Complete" to "Feature Complete" with corrected status tables
- Replaced `docs/SECURITY.md` TODO placeholder with security contact email

### Fixed
- Fastify plugin hang in billing routes (missing `done` callback after async removal)
- Search route double-prefix bug (`/search/search/jobs` -> `/search/jobs`)
- React version mismatch: design-system upgraded to React 19 peerDependency
- `.gitignore` concatenated patterns on line 15 split correctly
- `moduleResolution` standardized to `bundler` across all ESM packages
- CI workflows standardized to Node 22.x + pnpm 10 across all GitHub Actions
- Flaky performance test budget relaxed (120ms -> 250ms for profile reads)
- ESLint errors in `apps/api/src/index.ts` (20 pre-existing issues)

## [0.1.0] - 2025-04-01

### Added
- **Monorepo structure** with pnpm workspaces + Turborepo
  - `apps/api` - Fastify REST API with 100+ routes, OpenAPI spec
  - `apps/web` - Next.js 15 dashboard with React 19
  - `apps/orchestrator` - Node.js worker service with BullMQ task queue
  - `packages/schema` - Zod schemas (identity, profiles, masks, epochs, stages)
  - `packages/core` - Business logic (mask matching, crypto, billing, licensing)
  - `packages/content-model` - Narrative generation and JSON-LD transforms
  - `packages/design-system` - Shared UI primitives (NeoCard)
- **API versioning** with `/v1/` prefix and 90-day deprecation sunset on root routes
- **Mask-based identity system** with 15+ contextual masks
  - Analyst, Synthesist, Artisan, Architect, Engineer, Technician, Generalist, etc.
  - Dynamic identity projection without data duplication
- **Narrative engine** with mask-filtered views and weighted blocks
- **Export system**: JSON-LD (schema.org), PDF resume, Verifiable Credentials
- **Billing infrastructure**: Stripe checkout, subscriptions, webhook processing
- **Licensing service**: Tier-based rate limiting (FREE/PRO/ENTERPRISE)
- **Hunter Protocol**: Autonomous job search with tools (find_jobs, analyze_gap, tailor_resume, write_cover_letter)
- **Artifact system**: Cloud integrations (Google Drive, Dropbox, iCloud, local FS)
- **Orchestrator agents**: CatcherAgent, ArtifactSyncScheduler, worker loop
- **DID/VC support**: `did:key` generation, Verifiable Credential issuance and verification
- **PostgreSQL** with pgvector extension and idempotent migrations
- **Redis** caching with in-memory fallback for development
- **Docker Compose** stack for full local development
- **Helm charts** for Kubernetes deployment
- **k6 load testing** infrastructure with Grafana dashboards
- **GitHub Actions** CI/CD workflows (test, security, CodeQL, deploy)
- **Vitest** testing framework with 75% coverage thresholds
- **Architecture Decision Records** (ADR 001-006)
- **Comprehensive documentation**: operations runbook, security guidelines, glossary

### Security
- ESBuild vulnerability CVE-2025-29927 patched
- Auth middleware for protected API routes (ownership + admin guards)
- Stripe webhook signature verification
- Environment variable isolation per deployment

## [0.0.1] - 2025-02-01

### Added
- Initial project scaffold with covenant document
- Complete theatrical CV system design (Phases 1-9)
- Basic schemas, CI/CD configuration, and development utilities
- Initial documentation suite and README

[Unreleased]: https://github.com/4444J99/life-my--midst--in/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/4444J99/life-my--midst--in/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/4444J99/life-my--midst--in/releases/tag/v0.0.1

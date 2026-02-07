# PROJECT MANIFEST
## in–midst–my-life: Interactive CV/Résumé System

**Version**: 2.0
**Last Updated**: 2026-02-06
**Implementation Status**: Feature Complete

---

## Executive Summary

This repository contains the **implemented** interactive CV/résumé system "in–midst–my-life" — a programmable, multi-layered, agent-driven identity architecture. The system transforms a static resume into a dynamic, queryable, multi-perspective profile with mask-based identity filtering and blockchain-inspired verification capabilities.

**Core Innovation**: Treating a CV as a verifiable, append-only ledger (analogous to blockchain) from which multiple résumé "views" can be derived as contextual, mask-filtered snapshots.

**Origin**: Compiled from 33 ChatGPT conversations, now evolved into a working monorepo implementation.

---

## Implementation Status

> All originally specified features have been implemented. See `docs/FEATURE-AUDIT.md` for the complete spec→implementation mapping.

### Core Platform

| Component | Status | Details |
|-----------|--------|---------|
| **Monorepo Structure** | ✅ Complete | 3 apps, 4 packages, pnpm workspaces + Turborepo |
| **Schema Package** | ✅ Complete | 24 Zod schemas for all entities |
| **API Service** | ✅ Complete | 50+ endpoints, GraphQL subscriptions, OpenAPI |
| **Orchestrator Service** | ✅ Complete | 10 agents, DLQ, scheduler, GitHub webhooks |
| **Web Frontend** | ✅ Complete | 55+ components, dashboard, admin, blog, pricing |
| **Database Layer** | ✅ Complete | Postgres + pgvector + Redis, 15+ migrations |
| **Test Infrastructure** | ✅ Complete | Vitest + Playwright, 75% coverage threshold |
| **Content Model** | ✅ Complete | Narrative generation, 16 masks, 8 epochs |
| **Core Business Logic** | ✅ Complete | Mask matching, 4 DID resolvers, VC layer |

### Extended Features

| Component | Status | Details |
|-----------|--------|---------|
| **Hunter Protocol** | ✅ Complete | Search/analyze/tailor/apply routes, agent tools |
| **Theatrical UI Polish** | ✅ Complete | 55+ components, Framer Motion v11 animations |
| **Monetization** | ✅ Complete | Stripe checkout/webhooks/portal, 3 tiers, feature gates |
| **Infrastructure** | ✅ Complete | Helm charts, Docker, 6 CI/CD workflows, secrets management |
| **Marketing** | ✅ Complete | Landing page, about, pricing, 5 blog posts, README |

---

## Repository Structure

```
life-my--midst--in/
│
├── 📁 apps/                          # Deployable applications
│   ├── web/                          # Next.js 16 dashboard (:3000)
│   ├── api/                          # Fastify REST API (:3001)
│   └── orchestrator/                 # Node.js worker service (:3002)
│
├── 📁 packages/                      # Shared libraries
│   ├── schema/                       # Zod schemas & TypeScript types
│   ├── core/                         # Business logic, mask matching
│   ├── content-model/                # Narrative generation, JSON-LD
│   └── design-system/                # UI primitives
│
├── 📁 infra/                         # Infrastructure
│   ├── docker-compose.yml            # Local development stack
│   ├── Dockerfile                    # Container build
│   └── helm/                         # Kubernetes charts (scaffold)
│
├── 📁 docs/                          # Documentation
│   ├── SECURITY.md                   # Security guidelines
│   ├── adr/                          # Architecture Decision Records (001-012)
│   ├── archived/                     # Stale design docs moved from root
│   └── [operational docs]
│
├── 📁 scripts/                       # Development utilities
│   ├── dev-up.sh                     # Start Docker services
│   └── dev-shell.sh                  # Open DB shells
│
├── 📄 Configuration Files
│   ├── seed.yaml                     # Repository "genome"
│   ├── turbo.json                    # Build orchestration
│   ├── pnpm-workspace.yaml           # Workspace config
│   └── tsconfig.json                 # TypeScript config
│
└── 📄 Documentation (docs/)
    ├── MANIFEST.md                   # This file
    ├── DEFINITIONS.md                # Unified glossary
    ├── DECISION-LOG.md               # Architecture decisions
    └── archived/CONSOLIDATED-SPECIFICATIONS.md # Technical specs
```

---

## Document Classification System

> **Note**: Design documents (FOUND-*, SPEC-*, ARCH-*, PLAN-*, WORK-*, ORCH-*, META-*) have been
> archived to `docs/archived/`. They remain accessible for reference but are no longer actively
> maintained. Architecture decisions are now tracked in `docs/adr/` (ADR 001-012).

### Category Codes (Archived)
- **[FOUND]** - Foundational Concepts & Philosophy (5 files) → `docs/archived/`
- **[SPEC]** - Core Specifications & Schemas (4 files) → `docs/archived/`
- **[ARCH]** - Architecture & Technical Design (5 files) → `docs/archived/`
- **[PLAN]** - Planning, Roadmaps & Strategy (6 files) → `docs/archived/`
- **[WORK]** - Workflows & Automation (5 files) → `docs/archived/`
- **[ORCH]** - Integration & Orchestration (5 files) → `docs/archived/`
- **[META]** - Meta-Organization & Documentation (4 files) → `docs/archived/`

---

## Dependency Graph

### Module Dependencies

```
packages/schema          ← Foundation (no deps)
       ↓
packages/core           ← Business logic
packages/content-model  ← Narrative generation
       ↓
apps/api               ← REST API
apps/orchestrator      ← Worker service
apps/web               ← Frontend
```

### Build Order
```
schema → core → content-model → api → orchestrator → web
```

### Critical Path
```
FOUND-001 (Blockchain analogy)
    → SPEC-001 (Schema)
    → ARCH-001 (Architecture)
    → Implementation (Current)
    → Deployment (Next)
```

---

## Key Artifacts by Priority

### Tier 1: Essential for Development
1. **CLAUDE.md** - Development guidelines (AI and human)
2. **DEFINITIONS.md** - Unified terminology glossary
3. **DECISION-LOG.md** - Architecture decision records
4. **packages/schema/** - Data model source of truth
5. **seed.yaml** - Repository constraints

### Tier 2: Implementation Reference
6. **CONSOLIDATED-SPECIFICATIONS.md** - Technical specs
7. **docs/PHASE-ROADMAP.md** - Complete roadmap
8. **apps/api/openapi.yaml** - API contract
9. **docs/features/hunter-protocol/HUNTER-PROTOCOL.md** - Job search system

### Tier 3: Historical Context
10. **META-001-project-bible.md** - Original design vision
11. **FOUND-*.md** files - Philosophical foundation
12. **ARCH-*.md** files - Original architecture discussions

---

## Current Phase: Maintenance & Iteration

All roadmap phases (0–7) and post-roadmap polish sprints are complete. The project is feature-complete and in maintenance mode.

### Completed Phases
- **Phase 0**: Critical blockers resolved (6 commits)
- **Phase 1**: Quality infrastructure (ESLint strict, Husky, coverage)
- **Phase 2**: Data & functional completeness (schemas, migrations, seeds)
- **Phase 3**: Testing infrastructure (Playwright, 33 integration tests)
- **Phase 4**: Documentation & DX (CHANGELOG, CONTRIBUTING, ADRs, Storybook)
- **Phase 5**: Deployment & operations (Helm, Prometheus, release-please, Dependabot)
- **Phase 6**: Enhancements & polish (design system, PDF templates, DLQ)
- **Phase 7**: Backlog (DID resolvers, PubSub, WebSocket subscriptions)
- **API Hardening**: Auth hooks, ownership/admin middleware, checksums
- **Polish Sprint**: Bundle analyzer, web vitals, e2e tests, blog, about page

See `docs/PHASE-ROADMAP.md` for the original 140 EU roadmap.

---

## Key Innovations

### 1. Blockchain-Inspired CV Architecture
CV as immutable ledger, résumé as derived proof object.

### 2. Identity Mask System
16 non-branded functional masks (Analyst, Synthesist, Artisan, etc.) that filter the same underlying truth.

### 3. Temporal Epoch Architecture
Career divided into meaningful periods (Initiation → Mastery → Legacy) for biographical narrative.

### 4. Autonomous Agent System
Multi-agent crew (Architect, Implementer, Reviewer, Tester, Maintainer) for assisted development.

### 5. Energy-Based Planning
Abstract effort units instead of calendar time for pressure-free planning.

---

## Quick Commands

```bash
# Install dependencies
pnpm install

# Start development services
scripts/dev-up.sh      # PostgreSQL + Redis
pnpm dev               # All apps in parallel

# Testing
pnpm test              # Unit tests
pnpm integration       # Integration tests (needs env vars)
pnpm typecheck         # TypeScript validation
pnpm lint              # ESLint

# Database
scripts/dev-shell.sh   # Interactive psql
pnpm --filter api migrate
pnpm --filter api seed
```

---

## Integration Points

| System | Status | Purpose |
|--------|--------|---------|
| PostgreSQL | ✅ Implemented | Primary data store (+ pgvector for semantic search) |
| Redis | ✅ Implemented | Cache & task queue |
| W3C VCs | ✅ Implemented | Credential issuance & verification |
| W3C DIDs | ✅ Implemented | did:web, did:key, did:jwk, did:pkh resolvers |
| Serper API | ✅ Implemented | Job search (Hunter Protocol) |
| Stripe | ✅ Implemented | Checkout, subscriptions, webhooks, customer portal |
| GitHub Actions | ✅ Implemented | 6 CI/CD workflows (test, security, CodeQL, deploy, size, release) |
| Helm / K8s | ✅ Implemented | Kubernetes deployment charts with secrets management |

---

## Glossary Quick Reference

| Term | Definition |
|------|------------|
| **CV** | Complete professional history (blockchain ledger) |
| **Résumé** | Context-specific view (state snapshot) |
| **Mask** | Identity filter for context-specific presentation |
| **Epoch** | Temporal period in professional evolution |
| **Scaenae** | Theatrical stages/contexts |
| **EU** | Energy Unit (abstract effort measure) |

See **[DEFINITIONS.md](DEFINITIONS.md)** for complete glossary.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [README.md](../README.md) | User-facing overview |
| [CLAUDE.md](../CLAUDE.md) | Development guidance |
| [DEFINITIONS.md](DEFINITIONS.md) | Terminology glossary |
| [DECISION-LOG.md](DECISION-LOG.md) | Architecture decisions |
| [seed.yaml](../seed.yaml) | Repository constraints |
| [SECURITY.md](SECURITY.md) | Security guidelines |
| [PHASE-ROADMAP.md](phases/PHASE-ROADMAP.md) | Complete roadmap |

---

**Document Authority**: This manifest provides the high-level view of project status and organization. For detailed specifications, consult the referenced documents.

**Last Reconciliation**: 2026-02-06. All originally specified features are implemented. See `docs/FEATURE-AUDIT.md` for the comprehensive spec→implementation audit trail.

# Spec-to-Code Coverage Audit

Date: 2025-12-28
Scope: SPEC-001..004, ARCH-001..005, WORK-001..005 vs apps/* and packages/*.

## Implemented highlights
- Core apps exist: `apps/web` (dashboard with timeline/graph/gallery + admin studio), `apps/api` (Fastify REST), `apps/orchestrator` (Fastify + worker).
- Core packages exist: `packages/schema` (zod schemas for Identity/Profile/Mask/Stage/Epoch/CV entities/AgentResponse), `packages/content-model` (taxonomy + narrative/meta outputs), `packages/core` (mask matching), `packages/design-system` (minimal UI).
- Data stores: Postgres for profiles/masks/epochs/stages/CV entities/credentials/graph edges, Redis for orchestrator queue; file-store fallback for profiles and in-memory fallbacks for CV/taxonomy when Postgres is absent.
- API coverage: profiles CRUD + narrative endpoints, CV entity CRUD, credentials/attestations, graph/revisions, taxonomy CRUD for masks/epochs/stages, export endpoints (JSON-LD/VC/PDF), health/ready/metrics, OpenAPI stubs.
- Orchestrator coverage: task queue, Postgres task store, Redis queue, GitHub webhook parsing, LLM executor wiring with OSS defaults, agent registry manifest.
- UX coverage: graph view, gallery + immersive mode, admin editor (drag-and-drop relationships + taxonomy editing), export buttons wired to API.
- CV extensions now implemented: custom sections, timeline events, and verification logs with schemas, repositories, and API routes.
- Backup/import coverage: JSON-LD import + snapshot restore flows with API routes and tests.

## Gaps by specification

### SPEC-001 Data Schema
Implemented:
- Identity/Profile schemas and storage (`packages/schema`, `apps/api/migrations`, `apps/api/src/repositories`).
- Mask/Stage/Epoch schemas and taxonomy storage (`packages/schema`, `packages/content-model`, `apps/api/seeds`).
- ExternalId + ProfileSettings/section ordering.
- CV entities (Experience, Education, Project, Skill, Publication, Award, Certification, SocialLink).
- VerifiableCredential/AttestationLink types.
- Relationship graph + revision storage for content.
- Custom sections + timeline events + verification logs.
Missing:
- None.

### SPEC-002 System Design
Implemented:
- Mask filtering, narrative templates + meta outputs, weighted selection, and timeline rendering.
- REST APIs and web dashboard with graph view, gallery/immersive mode, admin editor, export pipeline, JSON-LD import/backup/restore, and perf budgets/tests.
Missing:
- Advanced asset pipeline (WebGL/canvas renderer; current graph is SVG with optional D3 force layout).

### SPEC-003 Mask Taxonomy
Implemented:
- Mask list, stage taxonomy, epoch periods, and basic personality mapping in `packages/content-model`.
- Settings taxonomy, explicit personality schema, and relations (mask-personality, stage-setting, period-modulates-mask).

### SPEC-004 JSON Schemas
Implemented:
- Agent response schema (output contract) in `packages/schema/src/agent.ts`.
- Agent registry/manifest JSON and validation schema for agent definitions.

## Gaps by architecture docs

### ARCH-001 System Architecture
Implemented:
- Single API + orchestrator services with Postgres and Redis.
Missing:
- Edge/CDN/auth gateway, microservices split, graph/vector/search stores, media service, VC issuance/verification.

### ARCH-002 Repository Layout
Implemented:
- Monorepo layout with `apps/*` and `packages/*` matches doc.

### ARCH-003 CI/CD Pipeline
Implemented:
- GitHub Actions pipeline in `.github/workflows/ci.yml` (migrations, build/test, integration, artifacts).

### ARCH-004 Monorepo Alternatives
Doc-only.

### ARCH-005 Monorepo Generator
Implemented:
- `generate-monorepo.py` exists; not wired into build scripts.

## Gaps by workflow docs

### WORK-001 Content Pipeline
Partial:
- Narrative rendering exists; no ingestion/curation pipeline or artifact processing.

### WORK-002 Automation Spec
Partial:
- Orchestrator has run tracking + scheduler loop; still missing CI-triggered cycles and PR automation.

### WORK-003 BPMN Diagrams
Doc-only.

### WORK-004 Orchestration Graphs
Doc-only; no graph runtime.

### WORK-005 Autonomous Code Growth
Partial:
- Agents, prompts, task queue, run persistence, scheduler loop, GitHub webhook parsing, and LLM adapters exist.
- Missing CI-triggered cycles, reviewer/tester gating, auto-PR creation, merge governance.

# Action Items Backlog (from AUDIT-001)

Updated: 2025-12-29  
Source: `AUDIT-001-spec-coverage.md`

## P0 - Data model and API parity
Status: completed in repo (schemas, migrations, repos, routes, tests, plus custom sections/timeline events/verification logs) on 2025-12-29.
1. Add missing CV entities (Experience, Education, Project, Skill, Publication, Award, Certification, SocialLink) with DB migrations, zod schemas, repositories, CRUD endpoints, and tests.
2. Add ExternalId + ProfileSettings (section ordering/visibility) to storage and API.
3. Add verifiable credential + attestation link models and endpoints to attach evidence to CV items.
4. Introduce content relationship graph + versioning for profile items (edges, revisions, queries).
5. Implement agent registry/manifest JSON + validation schema (SPEC-004) and config loader.

## P0 Sprint Checklist (owners + acceptance)
1. Extend `packages/schema` with CV entity types + zod schemas (Experience/Education/Project/Skill/Publication/Award/Certification/SocialLink). Owner: Data. Acceptance: schemas exported and referenced by API validators with unit coverage.
2. Add Postgres migrations for new CV entity tables. Owner: Data. Acceptance: migrations run clean on empty DB via `pnpm --filter @in-midst-my-life/api migrate`.
3. Implement repositories for CV entities with CRUD + paginated list queries. Owner: Backend. Acceptance: integration tests cover create/read/update/delete/list with ordering.
4. Add API routes for CV entities + OpenAPI updates. Owner: API. Acceptance: endpoints return expected status codes and OpenAPI matches validators.
5. Add ExternalId + ProfileSettings schema fields + migrations. Owner: Data. Acceptance: profile read/write round-trips include `externalIds` and `sectionOrder`.
6. Add API handlers for ExternalId/ProfileSettings updates. Owner: API. Acceptance: validation failures return 400 and tests cover update paths.
7. Add VerifiableCredential + AttestationLink tables and models. Owner: Data. Acceptance: FK constraints enforce links to CV entities.
8. Add VC/attestation repository + endpoints. Owner: Backend. Acceptance: attach/detach endpoints return evidence with the target entity.
9. Add content relationship graph + versioning tables. Owner: Data. Acceptance: edges + revisions tables exist with basic query coverage.
10. Add graph/versioning API endpoints. Owner: API. Acceptance: list edges by profile and fetch revision history with pagination.
11. Implement agent registry/manifest JSON + validation schema + loader. Owner: Orchestrator. Acceptance: invalid manifests fail validation with clear errors.

## P1 - Content model and narrative
Status: completed in repo (taxonomy relations, narrative meta, weighted timeline rendering) on 2025-12-29.
1. Complete mask settings taxonomy + personality schema; add mask-personality relations.
2. Add stage-setting and period-modulates-mask relations; expose them in content-model outputs.
3. Expand timeline rendering with multi-epoch weighting, narrative blocks, and inclusion/exclusion rules.
4. Align API response contracts to include narrative blocks and content-model outputs.

## P1 - UX deliverables
Status: completed in repo (dashboard + exports + admin studio) on 2025-12-28.
1. Build graph view and timeline UI with filters; add gallery/immersive mode.
2. Add export pipeline (PDF, JSON-LD, VC bundle) with API endpoints.
3. Add admin editor with drag-and-drop relationships, taxonomy editing, and preview.

## P2 - Automation and orchestration
1. Implement CI/GitHub-triggered agent runs with reviewer/tester gating and persistent run history. (partial: run persistence + run endpoints + scheduler loop + GitHub webhook ingestion in orchestrator; pending CI triggers + gating + PR automation)
2. Add auto-PR creation + merge governance rules and audit logging.
3. Implement orchestration graph runtime (WORK-004) and scheduling policies. (partial: scheduler loop exists; graph runtime still missing)

## P2 - Ops and reliability
1. Add CI workflows for lint/typecheck/test/build (ARCH-003). (completed 2025-12-29)
2. Add backup/restore flows and JSON-LD import/export utilities. (completed 2025-12-29)
3. Document performance targets and add basic perf checks (spec + tests). (completed 2025-12-29)

## P3 - Future architecture options
1. Plan edge/CDN/auth gateway and media service integration (ARCH-001).
2. Evaluate graph/search/vector stores if scale or UX demands it.

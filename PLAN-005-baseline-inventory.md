# Baseline Inventory (API + Orchestrator)

Updated: 2025-12-28  
Scope: schema, repos, routes, OpenAPI, migrations, seeds, tests.

## Schema (packages/schema)
- Implemented: Profile, Identity, Mask, Stage, Epoch, CV entities, ExternalId/ProfileSettings, VC/Attestation, content graph types, AgentResponse, agent registry schema.
- Missing: Custom sections, timeline events, verification logs.

## API data layer (apps/api)
- Repos: profiles (file + Postgres JSONB), masks/epochs/stages (memory + Postgres tables), CV entities + credentials + graph (memory + Postgres tables).
- Migrations: `001_init_profiles.sql`, `002_masks_epochs_stages.sql`, `003_cv_entities.sql`, `004_credentials_graph.sql`.
- Seeds: `profiles.sql`, `masks_epochs_stages.sql`, `z_cv_entities.sql`.
- Routes: `/profiles`, `/profiles/{id}`, `/profiles/{id}/masks/select`, `/profiles/{id}/narrative`, CV entity CRUD, credentials/attestations, graph/revisions, taxonomy for masks/epochs/stages.
- OpenAPI: `apps/api/openapi.yaml` mirrors profile/mask/taxonomy/CV endpoints.

## Orchestrator data layer (apps/orchestrator)
- Task store: memory/file/Postgres in `src/persistence.ts`.
- Migrations: `001_init_tasks.sql`, `002_tasks_metadata.sql`, `003_tasks_llm.sql`.
- Seeds: `tasks.sql`.
- Routes: `/tasks`, `/tasks/{id}`, `/tasks/{id}/history`, `/tasks/{id}/metadata`, `/tasks/dispatch`, `/webhooks/github`, `/health`, `/ready`, `/metrics`.
- OpenAPI: `apps/orchestrator/openapi.yaml` matches current routes.
- Agent registry: `apps/orchestrator/agent-registry.json` with loader + schema validation.

## Tests
- API unit/integration: `apps/api/test/*.test.ts` and `postgres.integration.test.ts`.
- Orchestrator unit/integration: `apps/orchestrator/test/*` including `integration.test.ts`.
- Missing (P0): coverage for new CV entities, VC/attestation, graph/versioning, manifest validation.

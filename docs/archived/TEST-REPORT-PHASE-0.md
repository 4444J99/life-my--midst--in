# Phase 0 Integration Test Report

> **⚠️ ARCHIVED — HISTORICAL SNAPSHOT**
> This is a mid-Phase-0 snapshot showing partial test results. Phase 0
> completed successfully — see `TEST-REPORT-PHASE-0-FINAL.md` for final
> results and [`docs/FEATURE-AUDIT.md`](../FEATURE-AUDIT.md) for
> current state.

**Date**: 2026-01-13
**Executor**: AI (Gemini)
**Scope**: Hunter Protocol, Curriculum Vitae, Aetas, Narratives

## 1. Executive Summary
**Status**: ⚠️ **PARTIAL FAILURE**
While the core backend logic for the Hunter Protocol and other Phase 0 components is implemented, the integration test suite is currently failing due to two primary issues:
1.  **Schema Validation Error**: The API fails to register Hunter Protocol routes due to a Zod-to-JSON-Schema conversion error (`data/required must be array`).
2.  **Database Concurrency**: Tests running against the shared `midst_test` database are encountering `duplicate key` violations during table/type initialization (`ensureTables`), even when running sequentially.

## 2. Component Status

| Component | Test Suite | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Hunter Protocol** | `orchestrator/test/hunter.test.ts` | ⚠️ Fail | `analyze_gap` tool failed assertion (returned `failed` instead of `completed`). Logic needs review. |
| | `api/routes/hunter-protocol` | ❌ Fail | Route registration failed due to Schema Error (`FST_ERR_SCH_VALIDATION_BUILD`). |
| **Curriculum Vitae** | `api/test/cv.test.ts` | ❌ Fail | Cascade failure from Schema Error. |
| **Aetas / Scaenae** | `api/test/masks.test.ts` | ❌ Fail | `duplicate key value violates unique constraint "pg_type_typname_nsp_index"`. Race condition in `ensureTables`. |
| **Profile / Identity** | `api/test/profiles.test.ts` | ❌ Fail | Cascade failure. |
| **Persistence** | `api/test/postgres.integration.test.ts` | ✅ **PASS** | Basic Postgres connectivity and Mask repository logic (after fixing `redaction` column) is working. |

## 3. Detailed Findings

### 3.1. Hunter Protocol Schema Error
The `registerHunterProtocolRoutes` function fails with:
`FastifyError: Failed building the validation schema for POST: /profiles/profiles/:id/hunter/search, due to error schema is invalid: data/required must be array`

**Root Cause**: The `HunterSearchFilterSchema` defined in `packages/core` (using Zod) likely exports an object structure that Fastify's schema compiler misinterprets when `required` fields are missing or strictly optional.

### 3.2. Orchestrator Hunter Agent
The `HunterAgent` in Orchestrator failed a logic test:
`AssertionError: expected 'failed' to be 'completed'` for `analyze_gap`.
This indicates the LLM or Mock provider interaction in `analyzeGap` threw an exception that was caught and returned as status `failed`.

### 3.3. Database Initialization Races
Multiple tests (`masks.test.ts`, `backups.test.ts`) fail with:
`error: duplicate key value violates unique constraint "pg_type_typname_nsp_index"`
This happens when `ensureTables()` tries to `CREATE TYPE` (e.g., `scaenae_taxonomy`) that already exists, or multiple tests try to create it simultaneously. Postgres `IF NOT EXISTS` for types is only supported in recent versions or requires a specific PL/pgSQL block which might be missing.

## 4. Coverage
**Coverage Collection**: Failed to complete due to test process exit.
**Estimated Coverage**:
- **API**: < 20% (due to early exits)
- **Orchestrator**: ~80% (passed most tests)
- **Core**: ~50% (inferred)

## 5. Remediation Plan
1.  **Fix Zod Schema**: Review `HunterSearchFilterSchema` in `packages/core/src/hunter/index.ts` and ensure it is compatible with Fastify's Zod provider.
2.  **Fix Database Init**: Refactor `ensureTables` in Repositories to be strictly idempotent using `DO $$ BEGIN ... END $$` blocks for Type creation.
3.  **Debug Hunter Agent**: Add logging to `HunterAgent.analyzeGap` to identify why it fails in test environment.
4.  **Sequential Tests**: Continue using `--no-file-parallelism` once DB init is fixed.

## 6. Conclusion
The "Hunter Protocol" is code-complete but not yet integration-ready. The system cannot be deployed safely until the Schema Validation error is resolved, as it prevents the API from starting.

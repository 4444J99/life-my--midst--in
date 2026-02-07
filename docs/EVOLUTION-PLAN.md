# Evolution Plan: From Prototype to Sovereign Identity Engine

This plan addresses the Blindspots, Shatter-points, and Evolutionary opportunities identified in the Phase 10 review.

## Track 1: Immediate Repairs (The "Shatter-Point" Fixes)
**Goal:** Prevent user abandonment and data corruption.

1.  [x] **Implement Ingestor Upsert Logic**
    *   **Context:** `apps/orchestrator/src/repositories/ingestion.ts`
    *   **Task:** Modify the ingestion routine to check for existing `Project` entities by `externalId` (e.g., `github_repo_12345`) before creating new ones. Update existing records instead of duplicating.
2.  [x] **Implement Key Export/Backup UI**
    *   **Context:** `apps/web/src/app/dashboard/settings`
    *   **Task:** Create a secure modal to export the user's `did:key` Private Key (as a JSON Web Key) so they can recover their identity if the browser storage/docker volume is cleared.
    *   **Requirements:** Re-auth before export; export only encrypted JWK by default (no plaintext); no server logging; explicit warning about irrecoverability; no auto-copy to clipboard.
3.  [x] **Add "Human-in-the-Loop" Review Step**
    *   **Context:** `apps/web/src/app/dashboard/narrative`
    *   **Task:** When the Orchestrator returns a generated narrative, save it as `draft`. Require a user action ("Approve" or "Edit") before it becomes visible on the public `/share` page.

## Track 2: Structural Reinforcements (The "Logos" & "Ethos" Fixes)
**Goal:** Harden the architecture and privacy model.

4.  [x] **Implement RAG / Context Window Management**
    *   **Context:** `packages/content-model/src/llm-provider.ts`
    *   **Task:** Before sending the `timeline` to the LLM, implement a `Summarizer` service. If token count approaches the model-specific budget (e.g., 80% of max context), collapse older/irrelevant events into high-level summaries to prevent context overflow.
5.  [x] **Create "Redaction" Mask Logic**
    *   **Context:** `packages/core/src/masks.ts`
    *   **Task:** Add a `private` or `redacted` field to the `Mask` schema. Allow masks to strictly *exclude* specific clients, dates, or sensitive project details from the rendered output, effectively creating "Public" vs. "Private" views.
    *   **Requirements:** Enforce redaction in API responses and share rendering (not just UI filtering); add tests to prevent leaks.
6.  [x] **Implement Rate Limiting & Cost Control**
    *   **Context:** `apps/orchestrator/src/server.ts`
    *   **Task:** Add a Redis-backed rate limiter for the `/tasks` endpoint. Prevent a user from triggering more than X generations per minute to control LLM costs (if using paid APIs).
    *   **Requirements:** Key by user ID with IP fallback; configure limits via env vars; log rate-limit events for audit.
7.  [x] **Verify Data Persistence Strategy**
    *   **Context:** `docker-compose.prod.yml`
    *   **Task:** Write a script `scripts/test-persistence.sh` that spins up the prod stack, writes data, tears it down, spins it up again, and asserts data presence.
    *   **Requirements:** Use isolated test volumes and explicit test env vars; fail fast if pointed at real prod endpoints.

## Track 3: Evolutionary Leaps (The "Bloom" & "Evolve" Features)
**Goal:** Transition from CV Tool to Agentic Home Base.

8.  [x] **Develop "Agent-to-Agent" Read API**
    *   **Context:** `apps/api/src/routes/agent-interface.ts`
    *   **Task:** Expose a standardized endpoint (`GET /agent/v1/query`) where *external* AI agents can query the user's profile using natural language (e.g., "Does this user have React experience?").
    *   **Requirements:** Explicit user opt-in; authenticated requests only; scoped access tokens; apply redaction/mask rules; rate limiting + audit logging.
9.  [x] **Implement "Visual Career Architecture" (Mermaid.js)**
    *   **Context:** `apps/web/src/app/share/[profileId]/visuals`
    *   **Task:** Create a renderer that takes the `Project` graph and generates a Mermaid.js flowchart or Gantt chart, visualizing the "Architecture of the Career."
10. [x] **Third-Party Attestation Protocol**
    *   **Context:** `packages/schema/src/verification.ts`
    *   **Task:** Design a schema for `AttestationBlock`. Allow a third party (e.g., a manager with their own key) to cryptographically sign a `Project` block, upgrading its status from "Self-Attested" to "Verified."

## Track 4: The "Cold Start" Solution
**Goal:** Frictionless onboarding.

11. [x] **Build "Resume Parser" Ingestor**
    *   **Context:** `apps/orchestrator/src/agents/ingestor.ts`
    *   **Task:** Add capability to the Ingestor agent to accept a raw text/PDF resume paste. Use the LLM to parse it into `Experience` and `Project` entities automatically, populating the empty ledger instantly.
    *   **Requirements:** Explicit user consent; do not store raw resume by default; PII-safe logging; support local-only LLM mode to keep data on device.

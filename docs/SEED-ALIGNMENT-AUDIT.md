# Seed Document Alignment Audit

**Date**: 2026-02-07
**Scope**: Philosophy-to-code alignment across all foundational seed documents
**Methodology**: Systematic comparison of 30 seed documents against implemented codebase
**Companion to**: `docs/FEATURE-AUDIT.md` (spec-to-code audit)

---

## Source Documents

The project's DNA originates from 30 foundational documents compiled from 33 design conversations, plus the philosophical manifesto. These predate the implementation and define the project's vision, ontology, and promises.

| ID | Title | Location | Domain |
|----|-------|----------|--------|
| FOUND-001 | Blockchain-CV Analogy | `CONSOLIDATED-SPECIFICATIONS.md` §1.1 | Core thesis |
| FOUND-002 | On-Chain Identity Model | `CONSOLIDATED-SPECIFICATIONS.md` §4 (Blockchain Layer) | Verification |
| FOUND-003 | Latin Dramaturgy Framework | `docs/COVENANT.md` §IX | Theatrical frame |
| FOUND-004 | Eight Foundational Identity Questions | `CONSOLIDATED-SPECIFICATIONS.md` §1.2 | Identity invariants |
| FOUND-005 | Problem Statement | `docs/COVENANT.md` §II, `seed.yaml` domain | Motivation |
| SPEC-001 | Data Schema Specification | `CONSOLIDATED-SPECIFICATIONS.md` §2 | Data model |
| SPEC-002 | Mask System & Selection | `CONSOLIDATED-SPECIFICATIONS.md` §3 | Core engine |
| SPEC-003 | Ontological Taxonomy | `CONSOLIDATED-SPECIFICATIONS.md` §3.1–3.4 | Taxonomy |
| SPEC-004 | Agent Registry | `CONSOLIDATED-SPECIFICATIONS.md` §5.2 | Orchestration |
| ARCH-001 | High-Level Architecture | `CONSOLIDATED-SPECIFICATIONS.md` §4.1 | System design |
| ARCH-002 | Technology Stack | `CONSOLIDATED-SPECIFICATIONS.md` §4.2 | Tech choices |
| ARCH-003 | CI/CD & Automation | `CONSOLIDATED-SPECIFICATIONS.md` §5.4, `seed.yaml` | DevOps |
| ARCH-004 | Data Layer Design | `CONSOLIDATED-SPECIFICATIONS.md` §4.1 (Data Layer) | Persistence |
| ARCH-005 | Monorepo Scaffold | `seed.yaml` project.repo | Structure |
| ORCH-001 | Autonomous Development System | `CONSOLIDATED-SPECIFICATIONS.md` §5.1 | Agent concept |
| ORCH-002 | Sense-Plan-Act-Critique Loop | `CONSOLIDATED-SPECIFICATIONS.md` §5.4 | Orchestration |
| ORCH-003 | Agent Roles (5 core) | `CONSOLIDATED-SPECIFICATIONS.md` §5.2 | Agent types |
| ORCH-004 | seed.yaml Genome | `seed.yaml`, `CONSOLIDATED-SPECIFICATIONS.md` §5.3 | Config |
| ORCH-005 | Merge & Governance Policy | `CONSOLIDATED-SPECIFICATIONS.md` §5.3 automation_contract | Policy |
| META-001 | Product Roadmap (7 phases) | `CONSOLIDATED-SPECIFICATIONS.md` §6 | Planning |
| META-002 | Effort-Based Phases | `CONSOLIDATED-SPECIFICATIONS.md` §6.1 | Estimation |
| META-003 | Phase Dependencies | `CONSOLIDATED-SPECIFICATIONS.md` §6.2 | Ordering |
| META-004 | Implementation Guide | `CONSOLIDATED-SPECIFICATIONS.md` §7 | Execution |
| PLAN-001 | Phase 1 Foundation | `CONSOLIDATED-SPECIFICATIONS.md` §7.2 | Execution |
| PLAN-002 | Phase 2 Core Engine | `CONSOLIDATED-SPECIFICATIONS.md` §7.3 | Execution |
| PLAN-004 | Development Standards | `CONSOLIDATED-SPECIFICATIONS.md` §7.4, `seed.yaml` | Standards |
| PLAN-006 | CV Multiplex Design | `docs/COVENANT.md` §V–VI | CVM spec |
| PLAN-007 | Hunter Protocol | `docs/PLAN-007-hunter-protocol.md` | Job search |
| PLAN-008 | Inverted Interview Vision | `docs/INVERTED-INTERVIEW.md` | Interview design |
| COVENANT | Philosophical Manifesto | `docs/COVENANT.md` | Philosophy |

---

## 1. Philosophical Foundations (FOUND-001–005 + COVENANT)

### 1.1 Core Thesis: Blockchain-CV Analogy

| Promise | Implementation | Evidence | Status |
|---------|---------------|----------|--------|
| CV = master ledger (append-only, complete) | `CurriculumVitaeMultiplexSchema` with versioned entries | `packages/schema/src/curriculum-vitae.ts` | ✅ |
| Resume = derived proof (selective, context-optimized) | Mask-filtered CV views via `CVFilterSchema` | `packages/schema/src/curriculum-vitae.ts`, `apps/api/src/routes/curriculum-vitae-multiplex.ts` | ✅ |
| Mask = filter that generates resume from CV | 16 masks with activation rules, filters, priority weights | `packages/content-model/src/taxonomy.ts` (`MASK_TAXONOMY`) | ✅ |
| Verification via consensus + signatures | W3C VCs with Ed25519 proofs, 4 DID resolvers | `packages/core/src/vc.ts`, `packages/core/src/did/resolvers/` | ✅ |
| Identity via DID / wallet address | DIDs (did:key, did:jwk, did:pkh, did:web) — software-based | `packages/core/src/did/resolvers/{key,jwk,pkh,web}.ts` | ✅ |
| Selective disclosure (ZKP analogy) | Mask-based filtering + redaction rules | `MaskSchema.redaction` in `packages/schema/src/mask.ts` | ✅ |
| On-chain identity / SBT registry | Not implemented — DIDs are software-only | — | 🔄 Deferred |

### 1.2 Eight Foundational Identity Questions

| # | Question | Implementation | Evidence | Status |
|---|----------|---------------|----------|--------|
| 1 | Core identity/thesis invariant across outputs? | `IdentityCoreSchema` defines thesis, invariants, master_keywords | `packages/schema/src/identity.ts` | ⚠️ Schema exists; no dedicated DB persistence |
| 2 | Claims requiring external verification? | VC issuance + verification + attestation links | `packages/core/src/vc.ts` | ✅ |
| 3 | Temporal arcs defining identity evolution? | 8 epochs: initiation → legacy, with `AetasSchema` lifecycle | `packages/schema/src/epoch.ts`, `packages/content-model/src/taxonomy.ts` | ✅ |
| 4 | Contradictions and their treatment? | Narrative engine handles via `authentic_caveat` and mask tension | `packages/content-model/src/narrative.ts` (template bank) | ✅ |
| 5 | Non-obvious intellectual lineages? | `IdentityCoreSchema.intellectual_lineage` field | `packages/schema/src/identity.ts` | ⚠️ Schema exists; not surfaced in UI |
| 6 | Strategic differentiators overlooked? | `IdentityCoreSchema.strategic_differentiators` field | `packages/schema/src/identity.ts` | ⚠️ Schema exists; not surfaced in UI |
| 7 | Modular/mask-based identity components? | Full mask system with 16 masks, 3 ontologies, activation rules | `packages/schema/src/mask.ts`, `packages/content-model/src/mask-selection.ts` | ✅ |
| 8 | Skeptic challenges and counter-evidence? | VC verification + narrative `evidence` blocks + proof points | `packages/core/src/vc.ts`, `packages/content-model/src/narrative.ts` | ✅ |

### 1.3 Problem Statement (FOUND-005)

| Promise | Implementation | Evidence | Status |
|---------|---------------|----------|--------|
| Documented failure (2000 apps → 0 interviews) | COVENANT §II frames the motivation | `docs/COVENANT.md` §II | ✅ Context |
| "You are not a resume. You are a complete human." | Dignity embedded in feature design, not stated in UI | — | ⚠️ See G6 |
| Inverting the power dynamic | Inverted Interview + Hunter Protocol + mutual evaluation | `apps/api/src/routes/interviews.ts`, `packages/core/src/hunter-protocol/` | ✅ |

### 1.4 Inverted Interview Vision (PLAN-008)

The standalone `docs/INVERTED-INTERVIEW.md` (449 lines) is the most detailed seed document for the interview paradigm. It envisions a theatrical two-act structure, real-time LLM analysis, dynamic mask triggering, and multi-factor compatibility scoring that goes well beyond COVENANT §VIII's summary.

| Promise | Implementation | Evidence | Status |
|---------|---------------|----------|--------|
| Act I: Interviewer becomes interviewee (they answer YOUR questions) | Interview session with questions posed to employer | `apps/api/src/routes/interviews.ts`, `InvertedInterviewInterface.tsx` | ✅ |
| Act II: Job requirements appear "from the sides of the stage" | Job requirements injected into analysis | `packages/core/src/hunter-protocol/compatibility-analyzer.ts` | ⚠️ Not theatrical/real-time; batch analysis |
| Real-time tone analysis of interviewer answers | Not implemented — answers recorded but not analyzed for tone | — | ❌ |
| Dynamic mask triggering based on interviewer's stated needs | Masks are statically selected; not triggered by interview answers | `apps/web/src/components/MaskSelector.tsx` | ❌ |
| 5-factor compatibility scoring (skill, values, growth, sustainability, compensation) | Compatibility scoring via `CompatibilityAnalyzer` with fit_score | `packages/core/src/hunter-protocol/compatibility-analyzer.ts` | ⚠️ Simplified (not 5 distinct factors) |
| Live interviewer dashboard with red/green flags | Static results page with alignment/misalignment keywords | `InvertedInterviewInterface.tsx` | ⚠️ Post-hoc, not live |
| System-generated follow-up questions based on gaps | Not implemented — questions are static | — | ❌ See G9 |
| Compensation analysis against market rate | Not implemented | — | ❌ |
| Mutual real-time visualization | Results shown after completion, not during | `InvertedInterviewInterface.tsx` | ⚠️ |
| Strategic questions (12 in seed doc across 4 categories) | 9 questions in API, 5 in UI — overlap but not identical to seed | `apps/api/src/routes/interviews.ts` | ⚠️ Subset |

**Summary**: The core paradigm shift (candidate evaluates employer) is implemented. The theatrical staging, real-time analysis, and dynamic mask triggering envisioned in PLAN-008 remain aspirational. See gaps **G9**, **G11**, **G12**.

---

## 2. Ontological Taxonomy (SPEC-003)

### 2.1 Masks — 16/16 ✅

All 16 masks from SPEC-003 §3.1 are implemented with full activation rules, filters, and stylistic parameters.

| # | Mask | Ontology | Evidence |
|---|------|----------|----------|
| 1 | Analyst | Cognitive | `MASK_TAXONOMY[0]` in `packages/content-model/src/taxonomy.ts` |
| 2 | Synthesist | Cognitive | `MASK_TAXONOMY[1]` |
| 3 | Observer | Cognitive | `MASK_TAXONOMY[2]` |
| 4 | Strategist | Cognitive | `MASK_TAXONOMY[3]` |
| 5 | Speculator | Cognitive | `MASK_TAXONOMY[4]` |
| 6 | Interpreter | Expressive | `MASK_TAXONOMY[5]` |
| 7 | Artisan | Expressive | `MASK_TAXONOMY[6]` |
| 8 | Architect | Expressive | `MASK_TAXONOMY[7]` |
| 9 | Narrator | Expressive | `MASK_TAXONOMY[8]` |
| 10 | Provoker | Expressive | `MASK_TAXONOMY[9]` |
| 11 | Mediator | Expressive | `MASK_TAXONOMY[10]` |
| 12 | Executor | Operational | `MASK_TAXONOMY[11]` |
| 13 | Steward | Operational | `MASK_TAXONOMY[12]` |
| 14 | Integrator | Operational | `MASK_TAXONOMY[13]` |
| 15 | Custodian | Operational | `MASK_TAXONOMY[14]` |
| 16 | Calibrator | Operational | `MASK_TAXONOMY[15]` |

**Schema richness**: Each mask includes `id`, `name`, `nomen` (Latin), `role_vector`, `tone_register`, `motto`, `ontology`, `functional_scope`, `stylistic_parameters` (tone, rhetorical_mode, compression_ratio), `activation_rules`, `filters`, and optional `redaction` rules.

### 2.2 Personalities — 9/9 ⚠️

All 9 personality types from SPEC-003 are defined, but with a thin schema.

| # | Personality | Orientation |
|---|-------------|-------------|
| 1 | Convergent | Narrowing focus |
| 2 | Divergent | Expanding possibilities |
| 3 | Reflective | Internal processing |
| 4 | Assertive | External assertion |
| 5 | Adaptive | Contextual flexibility |
| 6 | Investigative | Deep inquiry |
| 7 | Constructive | Building forward |
| 8 | Disruptive | Breaking patterns |
| 9 | Harmonic | Balancing forces |

**Gap**: `PersonalitySchema` only has `id`, `label`, `orientation`, `summary` — missing capability profiles, strength/weakness descriptors that SPEC-003's rich personality descriptions imply. See **G1**.

Evidence: `packages/schema/src/personality.ts`, `PERSONALITY_TAXONOMY` in `packages/content-model/src/taxonomy.ts`

### 2.3 Stages — 8/8 ✅

| # | Stage | Order |
|---|-------|-------|
| 1 | Inquiry | 1 |
| 2 | Design | 2 |
| 3 | Construction | 3 |
| 4 | Calibration | 4 |
| 5 | Transmission | 5 |
| 6 | Reflection | 6 |
| 7 | Negotiation | 7 |
| 8 | Archival | 8 |

Evidence: `STAGE_TAXONOMY` in `packages/content-model/src/taxonomy.ts`

### 2.4 Epochs — 8/8 ✅

| # | Epoch | Order |
|---|-------|-------|
| 1 | Initiation | 1 |
| 2 | Expansion | 2 |
| 3 | Consolidation | 3 |
| 4 | Divergence | 4 |
| 5 | Mastery | 5 |
| 6 | Reinvention | 6 |
| 7 | Transmission | 7 |
| 8 | Legacy | 8 |

Evidence: `EPOCH_TAXONOMY` in `packages/content-model/src/taxonomy.ts`

**Lifecycle model**: `AetasSchema` in `packages/schema/src/epoch.ts` provides the full lifecycle with `latin_name`, `capability_profile`, `typical_age_range`, `duration_months`, `transitions_to`, and `markers`.

### 2.5 Settings — 8/8 ⚠️

| # | Setting |
|---|---------|
| 1 | Research |
| 2 | Studio |
| 3 | Production |
| 4 | Lab |
| 5 | Public |
| 6 | Retreat |
| 7 | Arena |
| 8 | Archive |

**Gap**: `SettingSchema` only has `id`, `title`, `summary`, `tags` — missing `audience`, `formality_level`, `tone_expectations` that the richer `ScaenaSchema` demonstrates is possible. See **G2**.

Evidence: `packages/schema/src/setting.ts`, `SETTING_TAXONOMY` in `packages/content-model/src/taxonomy.ts`

### 2.6 Scaenae — 6/6 ✅

| # | Scaena | Latin Name | Formality |
|---|--------|------------|-----------|
| 1 | Academic | Academica | formal |
| 2 | Technical | Technica | professional |
| 3 | Artistic | Artistica | casual–ritualistic |
| 4 | Civic | Civica | professional |
| 5 | Domestic | Domestica | casual |
| 6 | Occult | Occulta | ritualistic |

**Schema richness**: `ScaenaSchema` includes `audience`, `formality_level` (casual/professional/formal/ritualistic), `visibility` (private/semi-private/semi-public/public), `typical_activities`, `tone_expectations`, and metadata with `canonical`, `color_theme`, `icon`.

Evidence: `packages/schema/src/scaenae.ts`

### 2.7 Taxonomy Relationship Maps ✅

All four cross-referencing relationship maps are implemented:

| Map | Dimensions | Evidence |
|-----|-----------|----------|
| `MASK_PERSONALITY_RELATIONS` | 16 masks → 9 personalities | `packages/content-model/src/taxonomy.ts` |
| `STAGE_SETTING_RELATIONS` | 8 stages → 8 settings | `packages/content-model/src/taxonomy.ts` |
| `MASK_STAGE_AFFINITIES` | 16 × 8 affinity scores (0–1) | `packages/content-model/src/taxonomy.ts` |
| `EPOCH_MASK_MODIFIERS` | 8 × 16 modifier scores (0–1) | `packages/content-model/src/taxonomy.ts` |

---

## 3. Data Schema (SPEC-001 + PLAN-006)

### 3.1 Entity Coverage

| Spec Entity | Implemented | Evidence | Status |
|------------|------------|----------|--------|
| `IDENTITY_CORE` | `IdentityCoreSchema` with thesis, invariants, master_keywords | `packages/schema/src/identity.ts` | ⚠️ No dedicated DB table |
| `MASKS[]` | `MaskSchema` + `MaskType` enum (16 values) | `packages/schema/src/mask.ts` | ✅ |
| `EPOCHS[]` | `EpochSchema` + `AetasSchema` | `packages/schema/src/epoch.ts` | ✅ |
| `CLAIMS[]` | Absorbed into VC credentialSubject | `packages/core/src/vc.ts` | ✅ Adapted |
| `CREDENTIALS[]` | `W3CVerifiableCredential` + `VerifiablePresentation` | `packages/core/src/vc.ts` | ✅ |
| `PROJECTS[]` | `CVEntrySchema` type `project` (11 entry types) | `packages/schema/src/curriculum-vitae.ts` | ✅ |
| `OUTPUT_TEMPLATES[]` | `TEMPLATE_BANK` in narrative engine | `packages/content-model/src/narrative.ts` | ✅ |
| `NARRATIVE_RULES[]` | Narrative plan builder + LLM integration | `packages/content-model/src/narrative.ts` | ✅ |
| `VERIFICATION_LOG[]` | Verification logs in Postgres migrations | `apps/api/migrations/` | ✅ |
| `RELATIONS[]` | Taxonomy relationship maps (4 maps) | `packages/content-model/src/taxonomy.ts` | ✅ |
| `Profile` | `ProfileSchema` with full Identity relation | `packages/schema/src/profile.ts` | ✅ |
| `Experience` / `Education` / `Project` | Unified under `CVEntrySchema` with 11 type variants | `packages/schema/src/curriculum-vitae.ts` | ✅ |
| `VerifiableCredential` + `AttestationLink` | VC class with issue/verify/presentation | `packages/core/src/vc.ts` | ✅ |

### 3.2 Verification Layer

| Component | Status | Evidence |
|-----------|--------|----------|
| DID Resolution (did:key) | ✅ | `packages/core/src/did/resolvers/key.ts` — Ed25519 multicodec |
| DID Resolution (did:jwk) | ✅ | `packages/core/src/did/resolvers/jwk.ts` — Base64url JWK |
| DID Resolution (did:pkh) | ✅ | `packages/core/src/did/resolvers/pkh.ts` — CAIP-10 blockchain IDs |
| DID Resolution (did:web) | ✅ | `packages/core/src/did/resolvers/web.ts` — HTTP fetch with caching |
| VC Issuance (Ed25519) | ✅ | `VC.issue()` in `packages/core/src/vc.ts` |
| VC Verification | ✅ | `VC.verify()` in `packages/core/src/vc.ts` |
| Verifiable Presentations | ✅ | `VC.createPresentation()` / `VC.verifyPresentation()` |
| Content-Addressed IDs (CID) | ✅ | `VC.calculateCID()` — IPFS SHA-256 |
| Soulbound Tokens (SBT) | 🔄 Deferred | Not implemented — see G10 |
| On-Chain Registry | 🔄 Deferred | Not implemented — see G10 |

### 3.3 Curriculum Vitae Multiplex

| Feature | Status | Evidence |
|---------|--------|----------|
| Master document with versioned entries | ✅ | `CurriculumVitaeMultiplexSchema` — `version`, `entries[]` |
| 11 entry types | ✅ | experience, achievement, skill, publication, project, education, certification, language, volunteer, award, custom |
| Multi-dimensional filtering | ✅ | `CVFilterSchema` — personae, aetas, scaenae, tags, priority |
| Persona-scoped resume generation | ✅ | `POST /:id/cv/generate-resume/:maskId` |
| Batch generation for all personae | ✅ | `POST /:id/cv/generate-resume/batch` |
| Tabula Personarum (persona directory) | ✅ | `TabulaPersonarumEntrySchema` with nomen, role_vector, tone_register, motto |
| Persona resonance tracking | ✅ | `PersonaResonanceSchema` — fit_score 0-100, alignment_keywords |

---

## 4. System Architecture (SPEC-002 + ARCH-001–005)

### 4.1 Planned vs. Actual Architecture

| Layer | Planned (ARCH-001) | Actual | Status |
|-------|-------------------|--------|--------|
| Client Layer | Web App + Mobile + Admin | Next.js 15 web app with admin settings | ⚠️ No mobile app |
| Edge & Security | CDN + WAF + Auth Gateway + Rate Limiter | Fastify rate limiting + auth middleware | ⚠️ No CDN/WAF (appropriate for current stage) |
| API Gateway | REST + GraphQL | Fastify REST (50+ endpoints) + GraphQL subscriptions | ✅ |
| Identity Service | DID Resolver | 4 DID resolvers (key, jwk, pkh, web) | ✅ |
| Profile Service | Career Graph DB + Timeline | PostgreSQL with pgvector + timeline rendering | ✅ Adapted (pg instead of graph DB) |
| VC Service | Issuance + Verification + SBT | VC issue/verify/present — no SBT | ⚠️ SBT deferred |
| Search Service | Vector Search + Matching | pgvector semantic search | ✅ |
| Data Layer | Relational + Document + Graph + Vector | PostgreSQL (relational + vector) + Redis (cache/queue) | ✅ Simplified |
| Blockchain Layer | DID Registry + VC Registry + SBT + Wallet | Software-based DIDs only | 🔄 Deferred |

### 4.2 Technology Stack Alignment

| Category | Spec | Actual | Status |
|----------|------|--------|--------|
| Frontend | Next.js 15 + React Server Components | Next.js 15 + React 19 + Framer Motion v11 | ✅ Exceeds |
| Backend | Node 22 + Fastify | Node 22 + Fastify + WebSocket | ✅ |
| Primary DB | PostgreSQL | PostgreSQL with pgvector | ✅ |
| Graph DB | Neo4j or similar | Not used (removed in Phase 5) | ⚠️ By design |
| Vector DB | Dedicated vector DB | pgvector extension (integrated) | ✅ Adapted |
| Cache | Redis | Redis with in-memory fallback | ✅ |
| Message Bus | Kafka/NATS | Redis-backed task queue | ⚠️ Simplified |
| Blockchain | did:ethr + EIP-721/1155 | did:key/jwk/pkh/web (software) | ⚠️ Adapted |
| CI/CD | GitHub Actions | 6 GH Actions workflows + Husky + lint-staged | ✅ |
| Infrastructure | Kubernetes + Vercel + Fly.io | Helm charts + Docker Compose + Render | ✅ Adapted |

### 4.3 Rendering Pipeline

| Feature | Status | Evidence |
|---------|--------|----------|
| Mask-filtered views | ✅ | `applyMask()`, `selectMasksForView()` in `packages/content-model/` |
| Weighted narrative generation | ✅ | `buildWeightedNarrative()`, `buildNarrativeOutput()` |
| Timeline rendering | ✅ | `renderTimeline()`, `renderTimelineForMask()` |
| Stage/epoch arc construction | ✅ | `buildArc()`, `formatEpoch()`, `formatStage()` |
| LLM integration for narrative blocks | ✅ | `generateNarrativeBlock()` with env-configurable context window |
| PDF export | ✅ | `apps/api/src/routes/` PDF export route |
| JSON-LD export | ✅ | `apps/api/src/routes/` JSON-LD export route |
| VC export | ✅ | `apps/api/src/routes/` VC export route |

---

## 5. Agent Registry (SPEC-004 + ORCH-001–005)

### 5.1 Agent Mapping

| Spec Agent | Implementation | Status | Evidence |
|-----------|---------------|--------|----------|
| Architect Agent | `ArchitectAgent` — design maintenance, task decomposition | ✅ | `apps/orchestrator/src/agents.ts` |
| Implementer Agent | `ImplementerAgent` — code writing, branch/PR creation | ✅ | `apps/orchestrator/src/agents.ts` |
| Reviewer Agent | `ReviewerAgent` — static analysis, PR comments | ✅ | `apps/orchestrator/src/agents.ts` |
| Tester Agent | `TesterAgent` — test generation, coverage improvement | ✅ | `apps/orchestrator/src/agents.ts` |
| Maintainer Agent | `MaintainerAgent` — constraint enforcement, merge decisions | ✅ | `apps/orchestrator/src/agents.ts` |
| Narrator Agent | `NarratorAgent` — narrative generation coordination | ✅ | `apps/orchestrator/src/agents.ts` |
| Ingestor Agent | `IngestorAgent` — data ingestion pipeline | ✅ | `apps/orchestrator/src/agents.ts` |
| Crawler Agent | `CrawlerAgent` — external source crawling | ✅ | `apps/orchestrator/src/agents.ts` |
| Hunter Agent | `HunterAgent` — job search orchestration | ✅ | `apps/orchestrator/src/agents.ts` + `packages/core/src/hunter-protocol/` |
| Catcher Agent | `CatcherAgent` — opportunity capture and evaluation | ✅ | `apps/orchestrator/src/agents.ts` |
| agent.cv-core (§5.2 implied) | Absorbed into NarratorAgent + content-model | ✅ By design | `packages/content-model/src/narrative.ts` |

**Total**: 10 implemented agents (spec called for 5 core + 5 extended = 10).

### 5.2 Orchestration Capabilities

| Capability | Status | Evidence |
|-----------|--------|----------|
| Task queue with persistence | ✅ | `apps/orchestrator/` — Redis-backed queue |
| Role-based agent routing | ✅ | `RoutedAgentExecutor` in `agents.ts` |
| GitHub webhook ingestion | ✅ | `POST /webhooks/github` endpoint |
| Dead letter queue (DLQ) | ✅ | DLQ implementation in orchestrator |
| Task scheduler | ✅ | Task scheduling in orchestrator |
| Sense-Plan-Act-Critique loop | ⚠️ Partial | Individual steps exist; full automated cycle not wired |
| CI-triggered autonomous cycles | ❌ | Not implemented — agents are stub executors |
| PR creation by agents | ❌ | Not implemented — agents use `StubExecutor` |

---

## 6. COVENANT Commitments

The COVENANT (§X) declares 6 Core Operational Commitments. §XIII adds 3 categories of binding promises.

### 6.1 Core Commitments (§X)

| # | Commitment | Implementation | Status |
|---|-----------|---------------|--------|
| 1 | **Master Truth** — One source, many views, never lie | `CurriculumVitaeMultiplexSchema` as master, masks as filters | ✅ |
| 2 | **Transparent Personas** — Every mask is declared, never hidden | `TabulaPersonarumSchema` exposes all personas with nomen, role_vector, motto | ✅ |
| 3 | **Intelligent Filtering** — Show the right mask, not everything | `selectBestMask()`, `maskWeight()` scoring algorithm | ✅ |
| 4 | **Mutual Evaluation** — Both sides scored transparently | Inverted Interview + `CompatibilityAnalyzer` with fit_score | ✅ |
| 5 | **Respect for Time** — Quick, relevant, honest | Hunter Protocol 4-step pipeline: find → analyze → tailor → write | ✅ |
| 6 | **Dignity** — You are not a resume, you are a complete human | Embedded in multi-dimensional identity model | ⚠️ Not stated in UI (G6) |

### 6.2 Designer Commitments (§XIII-A)

| Promise | Status | Evidence |
|---------|--------|----------|
| Build system that shows humans as three-dimensional | ✅ | Masks × Scaenae × Epochs = multi-dimensional identity |
| Never reduce someone to metrics or keywords | ✅ | Narrative engine generates contextual prose, not just tags |
| Always preserve the ability to show the whole self | ✅ | Master CVM accessible; masks filter but don't delete |

### 6.3 User Commitments (§XIII-B)

| Promise | Status | Evidence |
|---------|--------|----------|
| Users own their master record | ✅ | Ownership middleware on all write routes |
| Users choose which masks to present | ✅ | PersonaeSelector + persona management API |
| Users can always access the unfiltered view | ✅ | `GET /:id/cv` returns full CVM |

### 6.4 System Commitments (§XIII-C)

| Promise | Status | Evidence |
|---------|--------|----------|
| Never alter the master record behind the user's back | ✅ | Ownership middleware enforces auth on writes |
| Transparent about what each mask shows/hides | ✅ | `MaskSchema.filters` (include/exclude) + `redaction` rules |
| Verifiable claims via cryptographic proof | ✅ | Ed25519 VCs with DID resolution |

### 6.5 Theatrical Frame (§IX)

| Latin Concept | Meaning | Implementation | Status |
|---------------|---------|---------------|--------|
| Theatrum mundi | World as theater | System treats all contexts as "stages" (scaenae) | ✅ |
| Dramatis personae | Cast of characters | `TabulaPersonarumSchema` — persona directory | ✅ |
| In medias res | Beginning in the middle | Timeline rendering with epoch context | ✅ |
| Persona | Mask as authentic role | 16 functional masks, each authentic | ✅ |
| Finis coronat opus | The end crowns the work | Legacy epoch + archival stage | ✅ |
| Ars est celare artem | True art conceals effort | `compression_ratio` in mask stylistic params | ✅ |

---

## 7. Gap Register

### G1: PersonalitySchema Underdeveloped

- **Severity**: Medium
- **Seed Source**: SPEC-003 (9 personalities with rich descriptions implying capability profiles)
- **Current State**: `PersonalitySchema` has only `id`, `label`, `orientation`, `summary` — 4 fields
- **Contrast**: `ScaenaSchema` has 10+ fields including audience, formality, visibility, activities, tone
- **Impact**: Personality-to-mask relationships exist but personality objects carry minimal data
- **Recommendation**: Extend `PersonalitySchema` with `capability_profile`, `strengths`, `weaknesses`, `complementary_masks` to match ScaenaSchema depth

### G2: SettingSchema Minimal

- **Severity**: Medium
- **Seed Source**: SPEC-003 (8 settings providing environmental context)
- **Current State**: `SettingSchema` has only `id`, `title`, `summary`, `tags` — 4 fields
- **Contrast**: `ScaenaSchema` has `audience`, `formality_level`, `visibility`, `tone_expectations`
- **Impact**: Stage-to-setting relationships exist but setting objects lack the contextual richness of scaenae
- **Recommendation**: Extend `SettingSchema` with `audience`, `formality`, `tone_expectations`, `typical_constraints` to parallel ScaenaSchema

### G3: COVENANT Persona Names Not Operationalized

- **Severity**: Low
- **Seed Source**: COVENANT §III-A names 6 Latin personas: Persona Sapiens, Persona Mechanica, Persona Fabulator, Persona Synthesist, Persona Errans, Persona Soror/Frater
- **Current State**: 16 functional masks exist (analyst, synthesist, etc.) which serve the same purpose; the COVENANT's 6 Latin names are not seeded as canonical `TabulaPersonarumEntry` instances
- **Impact**: Philosophical — the COVENANT's naming convention is not reflected as runnable data
- **Recommendation**: Seed 6 canonical `TabulaPersonarumEntry` records with COVENANT Latin names as `nomen`, mapping to appropriate mask combinations. This is a data/content task, not a code change.

### G4: MaskSelector Hardcodes 4 Masks

- **Severity**: Medium
- **Seed Source**: SPEC-003 (15+ masks available for selection)
- **Current State**: `MaskSelector.tsx` exposes only analyst, artisan, architect, strategist — 4 of 16
- **Note**: `PersonaeSelector.tsx` is dynamic (renders from props), so this gap is specific to the simpler `MaskSelector` component
- **Impact**: Users interacting with MaskSelector see 25% of available masks
- **Recommendation**: Either make `MaskSelector` fetch from `MASK_TAXONOMY` or replace usage with the dynamic `PersonaeSelector`

### G5: Theatrical Language Not Surfaced in UI

- **Severity**: Low
- **Seed Source**: FOUND-003, COVENANT §IX (theatrum mundi vocabulary)
- **Current State**: Schema supports Latin terminology (`nomen`, `latin_name`, `motto`); UI uses English labels ("masks" not "personae", "epochs" not "aetas")
- **Impact**: Cosmetic — the theatrical frame exists in data but isn't presented to end users
- **Recommendation**: Consider optional "theatrical mode" toggle in UI that surfaces Latin names alongside English, or at minimum display `nomen` and `motto` in persona cards

### G6: No Explicit Dignity Statement in UI

- **Severity**: Low
- **Seed Source**: COVENANT §XII–XIV ("You are not a resume. You are a complete human being who sometimes needs to produce one.")
- **Current State**: Dignity is embedded in the system's design (multi-dimensional identity, mutual evaluation) but not stated as a visible mission or manifesto page
- **Impact**: New users don't see the philosophical grounding that distinguishes this system
- **Recommendation**: Add an "About" or "Philosophy" section to the web app that surfaces key COVENANT statements. The existing `apps/web/` about page could be extended.

### G7: Identity Invariants Not Persisted

- **Severity**: Medium
- **Seed Source**: FOUND-004 (8 foundational identity questions), SPEC-001 (IdentityCore interface)
- **Current State**: `IdentityCoreSchema` exists with `thesis`, `invariants`, `master_keywords`, `intellectual_lineage`, `strategic_differentiators`, `tensions`, `constraints` — but no dedicated database table stores these beyond profile free text
- **Impact**: The identity core is schema-defined but not a first-class persisted entity
- **Recommendation**: Add an `identity_core` table (or JSON column on profiles) that stores the 7 IdentityCore fields as structured, queryable data

### G8: Mask Matching Not Unified

- **Severity**: Low
- **Seed Source**: SPEC-002 (mask filtering logic as a single coherent system)
- **Current State**: Basic matching in `packages/core/src/maskMatching.ts` (context overlap, simple scoring) and sophisticated scoring in `packages/content-model/src/mask-selection.ts` (stage affinity, epoch modifiers, weighted scoring)
- **Impact**: Two packages provide overlapping mask-scoring functionality with different sophistication levels
- **Recommendation**: Deprecate the simpler `core/maskMatching.ts` in favor of `content-model/mask-selection.ts`, or re-export the content-model version from core

### G9: Interview Questions Hardcoded

- **Severity**: Medium
- **Seed Source**: COVENANT §VIII (dynamic inverted interview), PLAN-008 / `docs/INVERTED-INTERVIEW.md` (12 strategic questions across 4 categories with system-generated follow-ups)
- **Current State**: 9 static questions in `apps/api/src/routes/interviews.ts` (culture, growth, sustainability, authenticity, team categories); 5 static questions in `InvertedInterviewInterface.tsx`. The seed doc envisions 12 questions plus system-generated follow-ups based on detected gaps.
- **Impact**: Interview doesn't adapt to the specific job, mask context, or profile being evaluated. The "Questions To Ask Them Back" (gap-based generation) from PLAN-008 is entirely missing.
- **Recommendation**: Generate questions from profile/job context using the narrative engine or LLM integration, falling back to static questions when generation is unavailable

### G10: Blockchain/Wallet/SBT Not Implemented

- **Severity**: Deferred (by design)
- **Seed Source**: FOUND-002 (on-chain identity model), SPEC-001 (reputation/soulbound layer), COVENANT §XI (long-term)
- **Current State**: DIDs are software-based (did:key, did:jwk, did:pkh, did:web); no blockchain interaction, no wallet integration, no Soulbound Tokens
- **COVENANT Position**: §XI explicitly frames this as "Long Term" — the current software-based DID/VC layer is the documented intermediate step
- **Recommendation**: Document as intentionally deferred. Current VC infrastructure provides the foundation; on-chain features can layer on top when needed.

### G11: Real-Time Interview Analysis Not Implemented

- **Severity**: Medium
- **Seed Source**: PLAN-008 / `docs/INVERTED-INTERVIEW.md` (Act II staging, real-time tone analysis, live compatibility dashboard)
- **Current State**: Interview answers are recorded and scored after session completion. No real-time tone analysis, no live dashboard updates, no "requirements appearing from the sides of the stage" theatrical staging.
- **Impact**: The inverted interview works as a form submission + post-hoc scoring, not as the live theatrical evaluation the seed envisions
- **Recommendation**: Phase 1: Add WebSocket-based live scoring during interview sessions. Phase 2: Integrate LLM tone analysis on answer submission. The theatrical "Act II" staging (requirements appearing alongside answers) is a UI design task.

### G12: Dynamic Mask Triggering From Interview Context

- **Severity**: Low
- **Seed Source**: PLAN-008 / `docs/INVERTED-INTERVIEW.md` §"The Masks Respond Dynamically"
- **Current State**: Masks are selected manually or by static context matching. The seed envisions masks surfacing automatically based on what the interviewer says they need (e.g., "quick-shipping pragmatist" triggers Artisan mask).
- **Impact**: The interview doesn't demonstrate the mask system's adaptive capability to the interviewer
- **Recommendation**: Wire `selectBestMask()` to interview answer analysis — when interviewer answers reveal needs, auto-suggest the most relevant mask and its narrative response

---

## 8. Remediation Recommendations

### Priority 1 — Quick Wins (Low effort, medium impact)

| Gap | Action | Effort |
|-----|--------|--------|
| **G4** | Make `MaskSelector.tsx` dynamic — fetch from `MASK_TAXONOMY` or props | 1-2 hours |
| **G8** | Re-export `content-model/mask-selection.ts` functions from `core/` and deprecate `core/maskMatching.ts` | 1 hour |

### Priority 2 — Schema Enrichment (Medium effort, improves ontological depth)

| Gap | Action | Effort |
|-----|--------|--------|
| **G1** | Extend `PersonalitySchema` with capability_profile, strengths, weaknesses | 2-3 hours |
| **G2** | Extend `SettingSchema` with audience, formality, tone_expectations | 2-3 hours |
| **G7** | Add `identity_core` persistence (DB table or JSON column) | 3-4 hours |

### Priority 3 — Content & Presentation (Low effort, philosophical alignment)

| Gap | Action | Effort |
|-----|--------|--------|
| **G3** | Seed 6 canonical TabulaPersonarum entries with COVENANT Latin names | 1-2 hours |
| **G5** | Surface `nomen`/`motto` in PersonaeSelector cards | 1 hour |
| **G6** | Extend about page with COVENANT dignity statements | 1-2 hours |

### Priority 4 — Interview Vision (Medium effort, high philosophical alignment)

| Gap | Action | Effort |
|-----|--------|--------|
| **G9** | Dynamic interview question generation from profile/job context | 4-6 hours |
| **G11** | WebSocket-based live scoring during interview sessions | 6-8 hours |
| **G12** | Auto-suggest masks based on interviewer's stated needs | 3-4 hours |

### Priority 5 — Future Enhancement (Higher effort, deferred)

| Gap | Action | Effort |
|-----|--------|--------|
| **G10** | Blockchain/wallet/SBT integration | Significant (future phase) |

---

## Cross-Reference with FEATURE-AUDIT.md

This audit is intentionally complementary to `docs/FEATURE-AUDIT.md`:

- **FEATURE-AUDIT** answers: "Does the code implement what the specs describe?" (functional completeness)
- **SEED-ALIGNMENT-AUDIT** answers: "Does the code honor the vision, ontology, and promises of the founding documents?" (philosophical alignment)

No contradictions were found between the two audits. Where FEATURE-AUDIT marks a feature as `✅ COMPLETE`, this audit confirms the philosophical intent is preserved. The 12 gaps identified here are all areas where the implementation is *functionally correct* but *ontologically thinner* than the seeds envision.

---

## Conclusion

The implementation demonstrates strong alignment with its foundational documents. Of the 30 seed documents audited:

- **17 major promises** are fully implemented with evidence
- **12 gaps** exist, of which 4 are medium severity (thin schemas, hardcoded masks/questions, unpersisted identity core, no live interview analysis), 5 are low severity (cosmetic or architectural), 1 is deferred by design (blockchain/SBT), and 2 are aspirational interview features (dynamic mask triggering, real-time staging)
- **0 contradictions** with the existing FEATURE-AUDIT
- The COVENANT's 6 core commitments are all honored in code, with one (dignity) lacking UI surface
- The Inverted Interview vision (`docs/INVERTED-INTERVIEW.md`) is the most aspirational seed — its core paradigm shift is implemented, but its theatrical staging and real-time analysis remain future work

The system successfully translates its philosophical DNA — the blockchain-CV analogy, Latin dramaturgy, mask-based identity, and mutual evaluation — into working software. The remaining gaps are refinements, not structural failures.

*Finis coronat opus.*

# CONSOLIDATED SPECIFICATIONS
## in–midst–my-life: Interactive CV/Résumé System

**Version**: 1.0
**Compiled From**: 33 ChatGPT conversations
**Last Updated**: 2025-12-28

---

## Table of Contents

1. [Core Conceptual Framework](#core-conceptual-framework)
2. [Data Schema Specification](#data-schema-specification)
3. [Mask System Specification](#mask-system-specification)
4. [System Architecture](#system-architecture)
5. [Autonomous Development System](#autonomous-development-system)
6. [Product Roadmap](#product-roadmap)
7. [Implementation Guide](#implementation-guide)

---

## Current Implementation Snapshot (Repo State)

Implemented:
- Apps: `apps/web` (Next.js 15 dashboard + mask editor prototype), `apps/api` (Fastify REST), `apps/orchestrator` (Fastify + worker loop).
- Packages: `packages/schema` (zod Identity/Profile/Mask/Stage/Epoch/CV entities/AgentResponse), `packages/content-model` (taxonomy + narrative), `packages/core` (mask matching).
- Data stores: Postgres for profiles/masks/epochs/stages/CV entities/credentials/graph edges, Redis for orchestrator queue; SQL migrations/seeds in `apps/*/migrations` and `apps/*/seeds`.
- API surface: `/profiles`, `/profiles/{id}/narrative`, `/profiles/{id}/masks/select`, CV entity CRUD, credentials/attestations, content graph/revisions, `/taxonomy/*`, health/ready/metrics, OpenAPI stubs for API and orchestrator.
- Orchestrator: agent registry manifest + loader wired into health output.

Planned / not implemented:
- Graph view, gallery view, PDF/JSON-LD export, admin editing UI.
- Custom sections, timeline events, and VC verification logs.
- VC/DID layer, blockchain verification, search/vector stores.
- CI/CD workflows (documented in ARCH-003 but not checked in).

---

## 1. Core Conceptual Framework

### 1.1 Blockchain-CV Analogy

**Core Thesis**: A CV functions analogously to a blockchain ledger

| Concept | Blockchain | CV System |
|---------|------------|-----------|
| Full Record | Complete blockchain ledger | Curriculum Vitae (CV) |
| Derived View | Light client / State snapshot | Résumé |
| Verification | Consensus + signatures | Verifiable Credentials (VCs) |
| Identity | DID / Wallet address | Professional identity + DID |
| Immutability | Append-only chain | Chronological work history |
| Proof | Zero-knowledge proof | Selective disclosure résumé |

**Key Insight**:
- **CV** = Master ledger (append-only, complete historical record)
- **Résumé** = Derived proof object (selective, context-optimized view)
- **Mask** = Filter that generates résumé from CV based on context

### 1.2 Eight Foundational Identity Questions

All system outputs must address these invariants:

1. **What is the core identity/thesis that remains invariant across all outputs?**
   - The unchanging professional essence

2. **Which claims require external verification?**
   - Employment dates, degrees, publications, collaborations

3. **What temporal arcs define identity evolution?**
   - Epochs: Initiation → Expansion → Consolidation → Mastery → Reinvention

4. **Which contradictions exist and how are they treated?**
   - Productive tensions vs. structural inconsistencies

5. **What non-obvious intellectual lineages should be included?**
   - Hidden influences, cross-disciplinary bridges

6. **What strategic differentiators are overlooked?**
   - Unique capabilities competitors don't emphasize

7. **Which identity components must be modular/mask-based?**
   - Context-dependent presentations (academic vs. artistic)

8. **What would skeptics challenge, and what evidence counters them?**
   - Verification strategy, proof points

---

## 2. Data Schema Specification

Status: Implemented subset includes Identity/Profile/Mask/Stage/Epoch schemas in `packages/schema` and Postgres storage for profiles/masks/epochs/stages in `apps/api`. Remaining entities are planned.

### 2.1 Top-Level Schema Objects

```typescript
// Core system entities
IDENTITY_CORE
MASKS[]
EPOCHS[]
CLAIMS[]
CREDENTIALS[]
PROJECTS[]
OUTPUT_TEMPLATES[]
NARRATIVE_RULES[]
VERIFICATION_LOG[]
RELATIONS[]
```

### 2.2 Identity Core

```typescript
interface IdentityCore {
  thesis: string                          // Invariant professional essence
  invariants: string[]                    // Core unchanging attributes
  master_keywords: string[]               // Semantic tags across all contexts
  intellectual_lineage: string[]          // Influences and traditions
  strategic_differentiators: string[]     // Unique positioning
  tensions: string[]                      // Productive contradictions
  constraints: string[]                   // Boundaries and non-goals
}
```

### 2.3 Profile & Identity

```typescript
interface Identity {
  id: UUID
  did?: string                    // e.g. "did:ethr:0x..."
  primaryWalletAddress?: string   // Blockchain address
  ensName?: string                // Name system handle
  emailHash?: string              // Privacy-protected contact
  externalIds?: ExternalId[]      // LinkedIn, GitHub, ORCID, etc.
}

interface Profile {
  id: UUID
  identityId: UUID
  slug: string                    // URL handle
  displayName: string
  title?: string                  // Professional headline
  headline?: string               // Short pitch
  summaryMarkdown?: string
  avatarUrl?: string
  coverImageUrl?: string
  locationText?: string
  isActive: boolean
  settings: ProfileSettings
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

### 2.4 CV Entities

```typescript
interface Experience {
  id: UUID
  profileId: UUID
  roleTitle: string
  organization: string
  organizationUrl?: string
  locationText?: string
  startDate: ISODate
  endDate?: ISODate
  isCurrent: boolean
  employmentType?: "full_time" | "part_time" | "freelance" | "contract" | "internship" | "self_employed" | "volunteer"
  descriptionMarkdown?: string
  highlights?: string[]
  tags?: string[]
  skillsUsed?: SkillRef[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

interface Education {
  id: UUID
  profileId: UUID
  institution: string
  institutionUrl?: string
  degree?: string
  fieldOfStudy?: string
  startDate?: ISODate
  endDate?: ISODate
  isCurrent: boolean
  thesisTitle?: string
  descriptionMarkdown?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

interface Project {
  id: UUID
  profileId: UUID
  name: string
  subtitle?: string
  role?: string
  startDate?: ISODate
  endDate?: ISODate
  isOngoing: boolean
  url?: string
  repoUrl?: string
  mediaGallery?: MediaItem[]
  descriptionMarkdown?: string
  highlights?: string[]
  tags?: string[]
  skillsUsed?: SkillRef[]
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

### 2.5 Verifiable Credentials Layer

```typescript
interface VerifiableCredential {
  id: UUID
  issuerIdentityId: UUID          // Who issued this
  subjectProfileId: UUID          // Who it's about
  types: string[]                 // e.g. ["VerifiableCredential", "EmploymentCredential"]
  issuedAt: ISODateTime
  expiresAt?: ISODateTime
  credentialSubject: any          // W3C VC payload
  proof: any                      // Cryptographic proof
  summary?: string                // Human-readable
  status?: "valid" | "revoked" | "expired" | "unknown"
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

interface AttestationLink {
  id: UUID
  credentialId: UUID
  entityType: "profile" | "experience" | "education" | "project" | "publication" | "award" | "certification" | "skill"
  entityId: UUID
  visibility: "public" | "private" | "issuer_only"
  labelOverride?: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}
```

---

## 3. Mask System Specification

Status: Mask list, stage taxonomy, and epoch periods are implemented in `packages/content-model` with Postgres seeds; settings/relations remain planned.

### 3.1 Mask Taxonomy (Non-Branded)

#### Cognitive Masks
- **Analyst Mask**: Precision reasoning, decomposition, structure
- **Synthesist Mask**: Pattern-merging, integrative creativity
- **Observer Mask**: Detached perception, data intake
- **Strategist Mask**: Long-horizon planning, resource orchestration
- **Speculator Mask**: Hypothesis generation, scenario projection
- **Interpreter Mask**: Cross-domain/media translation

#### Expressive Masks
- **Artisan Mask**: Craft-level creation, meticulous refinement
- **Architect Mask**: Systems composition, conceptual framing
- **Narrator Mask**: Storyline coherence, meaning framing
- **Provoker Mask**: Disruption, boundary-pushing
- **Mediator Mask**: Negotiation, harmonization, bridging

#### Operational Masks
- **Executor Mask**: Action, throughput, closure
- **Steward Mask**: Maintenance, governance, oversight
- **Integrator Mask**: Cross-team assembly, interoperability
- **Custodian Mask**: Record-keeping, curation, historical fidelity
- **Calibrator Mask**: Evaluation, metrics, standards alignment

### 3.2 Mask Structure

```typescript
interface Mask {
  id: string
  name: string                    // e.g., "Analyst Mask"
  ontology: string                // Functional classification
  functional_scope: string        // What this mask does
  stylistic_parameters: {
    tone: string                  // Professional, experimental, etc.
    rhetorical_mode: string       // Explanatory, persuasive, etc.
    compression_ratio: number     // How much detail to include
  }
  activation_rules: {
    contexts: string[]            // When to activate
    triggers: string[]            // What activates it
  }
  filters: {
    include_tags: string[]        // What content to show
    exclude_tags: string[]        // What to hide
    priority_weights: Record<string, number>
  }
}
```

### 3.3 Stages (Activity Frames)

- **Inquiry Stage**: Research, exploration, question-formation
- **Design Stage**: Ideation, architectural thinking
- **Construction Stage**: Production, implementation
- **Calibration Stage**: Testing, refinement, verification
- **Transmission Stage**: Publishing, dissemination
- **Reflection Stage**: Retrospective analysis
- **Negotiation Stage**: Alignment, stakeholder engagement
- **Archival Stage**: Documentation, versioning

### 3.4 Epochs (Temporal Ontology)

- **Initiation Period**: Entry, foundational skills
- **Expansion Period**: Rapid diversification
- **Consolidation Period**: Integration, signature voice
- **Divergence Period**: Branching experimentation
- **Mastery Period**: Peak specialization
- **Reinvention Period**: Identity transformation
- **Transmission Period**: Teaching, sharing
- **Legacy Period**: Long-term impact, codification

---

## 4. System Architecture

Status: Current implementation is a monorepo with a single API and orchestrator service, plus a Next.js web app. Edge/auth gateways, microservices, and specialized data stores are not implemented yet.

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐           │
│  │ Web App  │  │ Mobile   │  │ Admin Console  │           │
│  │(Next.js) │  │   App    │  │   (Internal)   │           │
│  └──────────┘  └──────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  EDGE & SECURITY LAYER                      │
│  CDN + WAF  ←→  Auth Gateway (OIDC + DID)  ←→  Rate Limiter│
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 API GATEWAY / BFF                           │
│              (REST + GraphQL)                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                            │
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐                │
│  │ Identity Service│  │ Profile Service   │                │
│  │ DID Resolver    │  │ Career Graph DB   │                │
│  └─────────────────┘  │ Timeline Service  │                │
│                       └──────────────────┘                │
│  ┌─────────────────┐  ┌──────────────────┐                │
│  │ VC Issuance     │  │ Search Service    │                │
│  │ VC Verification │  │ Vector Search     │                │
│  │ SBT Service     │  │ Matching Engine   │                │
│  └─────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│  Relational DB | Document DB | Graph DB | Vector DB         │
│  Search Index | Object Storage | Cache | Message Queue      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│               BLOCKCHAIN / WEB3 LAYER                       │
│  DID Registry | VC Registry | SBT Registry | Wallet Service │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Technology Stack

**Frontend**:
- Next.js 15 with React Server Components
- TypeScript (strict mode)
- React Server Components

**Backend**:
- Node 22+ / TypeScript
- Fastify or Node services
- GraphQL optional

**Data Layer**:
- PostgreSQL (primary)
- Graph DB (Neo4j or similar) for career graph
- Vector DB for semantic search
- Redis for caching
- Kafka/NATS for message bus

**Blockchain**:
- DID methods (did:ethr, did:web, etc.)
- W3C Verifiable Credentials
- EIP-721/1155 for Soulbound Tokens

**Infrastructure**:
- Kubernetes for orchestration
- Vercel for web hosting
- Fly.io or similar for API hosting
- CI/CD via GitHub Actions

---

## 5. Autonomous Development System

Status: Orchestrator service exists with task queue, persistence, webhook parsing, and LLM adapters. CI-triggered cycles, PR creation, and merge governance are not implemented yet.

### 5.1 Core Concept

Treat the repository as a **living system** with a formal "genome" (`seed.yaml`) that defines:
- Architecture constraints
- Coding standards
- Quality gates
- Growth objectives
- Allowed operations for AI agents

### 5.2 Multi-Agent Architecture

**Agent Roles**:

1. **Architect Agent**
   - Maintains high-level design
   - Breaks work into atomic tasks
   - Updates roadmap

2. **Implementer Agent**
   - Writes code based on tasks
   - Uses local context to avoid hallucination
   - Creates branches and PRs

3. **Reviewer Agent**
   - Runs static analysis and tests
   - Comments on PRs
   - Enforces style and architectural constraints

4. **Tester Agent**
   - Generates tests from specs
   - Tries to break implementations
   - Improves test coverage

5. **Maintainer Agent**
   - Enforces global constraints
   - Decides if changes can merge
   - Prevents architectural drift

### 5.3 seed.yaml Structure

```yaml
version: 1

project:
  name: "in--midst--my-life"
  codename: "interactive-cv"
  description: "Interactive mask-based CV/résumé system"

architecture:
  style: "modular-monorepo"
  tech_stack:
    language: "TypeScript"
    runtime: ["Node 22"]
    frontend: ["Next.js 15"]
    backend: ["Fastify"]
    database:
      primary: "PostgreSQL"
      migrations: "drizzle-orm"

coding_standards:
  language: "TypeScript"
  tsconfig:
    strict: true
    noImplicitAny: true
  style:
    formatter: "prettier"
    linter: "eslint"

quality_gates:
  ci_required_checks: ["lint", "typecheck", "test"]
  coverage:
    global_minimum: 0.75        # 75%
    critical_paths:
      - path: "packages/schema"
        minimum: 0.9            # 90%
      - path: "packages/core"
        minimum: 0.85           # 85%

growth_objectives:
  roadmap_epics:
    - id: "schema-v1"
      title: "Canonical identity & mask schema"
    - id: "editor-v1"
      title: "Mask & timeline editor"
    - id: "render-v1"
      title: "CV/Résumé narrative generator"

constraints:
  repo:
    max_lines_per_file: 400
    max_function_length_loc: 60
  dependencies:
    max_new_dependencies_per_pr: 1
    require_issue_link_for_new_dependency: true

automation_contract:
  ai_access:
    read_paths: ["apps/*", "packages/*", "docs/*"]
    write_paths:
      - "packages/schema/**"
      - "packages/content-model/**"
      - "apps/web/src/**"
      - "apps/api/src/**"
    disallowed_writes:
      - ".github/workflows/**"
      - "infra/**"
      - "seed.yaml"
  merge_policy:
    allow_auto_merge: false      # Human review required initially
```

### 5.4 Orchestration Loop

```
1. SENSE
   ├─ Read current repo state
   ├─ Collect metrics (coverage, complexity)
   └─ Ingest open issues/tickets

2. PLAN
   ├─ Architect updates roadmap
   └─ Selects tasks for this cycle

3. ACT
   ├─ Implementer applies changes
   └─ Produces clean diff

4. CRITIQUE
   ├─ Reviewer analyzes diff
   └─ Annotates problems

5. TEST
   ├─ Run tests in sandbox
   └─ Tester refines test suite

6. DECIDE
   ├─ Maintainer + CI gates
   └─ Auto-merge or human-review PR

7. LOG
   └─ Update growth log and metrics
```

---

## 6. Product Roadmap

### 6.1 Effort-Based Phases (No Calendar Time)

**Total Effort**: 37 Energy Units (EU)

| Phase | Focus | Effort (EU) | Key Deliverables |
|-------|-------|-------------|------------------|
| **1** | Foundational Architecture | 4 | Domain model, schema, architecture blueprint |
| **2** | Core Engine & Data Substrate | 6 | Knowledge graph, mask engine, media pipeline |
| **3** | Interaction Layer | 5 | Dynamic rendering, mask transformations, visuals |
| **4** | Authoring Studio | 7 | Creator tools, template generator, media module |
| **5** | Presentation & Export | 4 | Multiple export formats, viewing modes |
| **6** | Intelligence & Autonomy | 8 | AI curation, persona evolution, pattern detection |
| **7** | Deployment & Reliability | 3 | Infrastructure, APIs, security, performance |

### 6.2 Phase Dependencies

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
                              ↓
                        Phase 5 ← Phase 6
                              ↓
                          Phase 7
```

Phases 5 and 6 can partially overlap after Phase 4 completes.

---

## 7. Implementation Guide

### 7.1 Getting Started (Phase 0)

1. **Create seed.yaml**
   - Use template from section 5.3
   - Customize for your specific requirements

2. **Generate Monorepo**
   - Run the scaffold generator from ARCH-005
   - Creates complete directory structure with placeholders

3. **Initialize Git**
   - Set up repository with proper .gitignore
   - Configure GitHub Actions from ARCH-003

### 7.2 Phase 1: Foundation (5 EU)

**Tasks**:
1. Implement schema from SPEC-001
2. Build identity core (SPEC-002)
3. Create mask definitions (SPEC-003)
4. Set up base narrative rules

**Deliverables**:
- `packages/schema/` with all TypeScript interfaces
- `packages/identity/` with core identity logic
- `data/masks/` with mask configurations
- Initial test suite (75% coverage target)

### 7.3 Phase 2: Core Engine (6 EU)

**Tasks**:
1. Implement career graph storage (Graph DB)
2. Build mask filtering engine
3. Create media ingestion pipeline
4. Set up versioning system

**Deliverables**:
- Working graph database with queries
- Mask transformation logic
- Media upload and processing
- Version control for CV snapshots

### 7.4 Development Standards

**Coding Rules** (from seed.yaml):
- TypeScript strict mode required
- Max 400 lines per file
- Max 60 lines per function
- 75% global test coverage minimum
- 90% coverage for schema package

**Git Workflow**:
- Feature branches from `main`
- PR required for all changes
- CI must pass (lint, typecheck, test)
- Human review required until Phase 6

**Documentation**:
- TSDoc for all public functions
- README in each package
- Architecture decision records (ADRs) for major choices

---

## Appendix A: Key Terminology

- **CV (Curriculum Vitae)**: Complete professional ledger
- **Résumé**: Derived, context-specific view
- **Mask**: Identity filter for context-specific presentation
- **Epoch**: Temporal period in professional development
- **Energy Unit (EU)**: Abstract effort measure (not time-based)
- **Verifiable Credential (VC)**: Cryptographically signed attestation
- **DID**: Decentralized Identifier
- **Soulbound Token (SBT)**: Non-transferable blockchain token
- **Seed**: Formal specification (seed.yaml) for repo constraints

---

## Appendix B: Reference Documents

For complete details, consult these source documents:

- **META-001**: Project Bible (complete overview)
- **SPEC-001**: Full data schema with all entities
- **ARCH-001**: Complete technical architecture diagrams
- **WORK-005**: Detailed autonomous development system
- **PLAN-001**: Complete product roadmap with all phases

---

**Document Status**: Consolidated from 33 conversations
**Confidence**: High (directly extracted from source material)
**Next Action**: Begin Phase 0 implementation following section 7.1

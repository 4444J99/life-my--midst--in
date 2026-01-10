# PROJECT MANIFEST
## in–midst–my-life: Interactive CV/Résumé System

**Version**: 1.0
**Last Updated**: 2025-12-28
**Total Conversations**: 33

---

## Executive Summary

This repository contains the complete design, architecture, and planning artifacts for "in–midst–my-life", an interactive CV/résumé system that functions as a programmable, multi-layered, agent-driven identity architecture. The monorepo also includes a working API/orchestrator, a Next.js dashboard with timeline/graph/gallery views and an admin studio, plus export endpoints for JSON-LD/VC/PDF.

**Core Innovation**: Treating a CV as a verifiable, append-only ledger (analogous to blockchain) from which multiple résumé "views" can be derived as contextual, mask-filtered snapshots.

---

## Document Classification System

All conversations are organized into 7 primary categories with standardized naming:

### Category Codes
- **[FOUND]** - Foundational Concepts & Philosophy
- **[SPEC]** - Core Specifications & Schemas
- **[ARCH]** - Architecture & Technical Design
- **[PLAN]** - Planning, Roadmaps & Strategy
- **[WORK]** - Workflows & Automation
- **[ORCH]** - Integration & Orchestration
- **[META]** - Meta-Organization & Documentation

---

## Complete File Index

### FOUNDATIONAL CONCEPTS [FOUND] - 5 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Blockchain as CV analogy.md | FOUND-001 | Blockchain-CV Mapping | CV as append-only ledger, résumé as state snapshot |
| ChatGPT-Blockchain as CV!resume.md | FOUND-002 | CV vs Résumé Distinction | Full ledger vs. pruned view, verification analogy |
| ChatGPT-Meta Latin in drama.md | FOUND-003 | Etymology & Semantics | Linguistic roots of CV/résumé, theatrical metaphors |
| ChatGPT-Identity and narrative questions.md | FOUND-004 | Identity Invariants | 8 core questions for identity architecture |
| ChatGPT-Prospecting questions development.md | FOUND-005 | Research Prompts | Domain-specific deep research question sets |

**Synopsis**: Establishes the philosophical and conceptual foundation. The blockchain analogy provides the core architectural metaphor: CV as immutable historical record, résumé as derived proof object. Identity questions define invariants that must persist across all masks and epochs.

---

### CORE SPECIFICATIONS [SPEC] - 4 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Create schema specification.md | SPEC-001 | Data Schema | TypeScript interfaces for Profile, Experience, Credentials, VC layer |
| ChatGPT-Draft design specification.md | SPEC-002 | System Design | Masks, content graph, interaction patterns, exports |
| ChatGPT-Mask name draft.md | SPEC-003 | Mask Taxonomy | Cognitive/Expressive/Operational masks, personalities, stages |
| ChatGPT-Generate JSON definition.md | SPEC-004 | JSON Schemas | Machine-readable schema definitions |

**Synopsis**: Defines the data models, ontologies, and structural specifications. SPEC-001 provides TypeScript/JSON schema for all entities. SPEC-003 establishes the mask system with non-branded, functional names (Analyst, Synthesist, Artisan, etc.). Together they form the canonical data architecture.

---

### ARCHITECTURE & TECHNICAL [ARCH] - 5 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Technical architecture diagram.md | ARCH-001 | System Architecture | Microservices, DID resolution, VC verification, graph DB |
| ChatGPT-Git repository structure.md | ARCH-002 | Repository Layout | Monorepo structure with docs/, src/, data/, tests/ |
| ChatGPT-GitHub Actions CI!CD.md | ARCH-003 | CI/CD Pipeline | Automated testing, deployment workflows |
| ChatGPT-Monorepo alternative structure.md | ARCH-004 | Alt Organization | Alternative repo organization patterns |
| ChatGPT-Generate monorepo structure.md | ARCH-005 | Scaffold Generator | Python script to generate complete monorepo |

**Synopsis**: Technical implementation architecture. ARCH-001 provides the comprehensive system diagram with all layers (client, edge, services, data, blockchain, infrastructure). ARCH-005 delivers an executable Python script to scaffold the entire monorepo structure with placeholders.

---

### PLANNING & ROADMAP [PLAN] - 4 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Product roadmap creation.md | PLAN-001 | Product Roadmap | 7 phases, 37 energy units (not time-based) |
| ChatGPT-Project plan with effort units.md | PLAN-002 | Effort Planning | Energy-based timeline, no calendar dates |
| ChatGPT-Next steps for system.md | PLAN-003 | Action Items | Immediate operational next steps |
| ChatGPT-Engineering task mapping.md | PLAN-004 | Task Breakdown | Engineering tasks mapped to roadmap phases |

**Synopsis**: Strategic planning using energy/effort units instead of calendar time. PLAN-001 defines 7 phases from Foundational Architecture (4 EU) through Intelligence & Autonomy Layer (8 EU). This allows timeline-agnostic planning focused on effort investment rather than deadlines.

---

### WORKFLOWS & AUTOMATION [WORK] - 5 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Content development workflow.md | WORK-001 | Content Pipeline | Content creation and curation workflows |
| ChatGPT-Automatable workflow version.md | WORK-002 | Automation Spec | Machine-executable workflow definitions |
| ChatGPT-BPMN workflow diagram.md | WORK-003 | Process Modeling | Business process diagrams for workflows |
| ChatGPT-Orchestration graph generation.md | WORK-004 | Graph Orchestration | LangGraph + CrewAI orchestration specs |
| ChatGPT-Automating Code Growth.md | WORK-005 | Autonomous Development | Self-growing codebase via multi-agent system |

**Synopsis**: Automation and workflow systems. WORK-005 is particularly significant - it describes a revolutionary approach where AI agents (Architect, Implementer, Reviewer, Tester, Maintainer) autonomously generate and maintain code through GitHub Actions triggers. Uses "seed.yaml" as genome for repo growth.

---

### INTEGRATION & ORCHESTRATION [ORCH] - 5 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Autonomous agent meta-prompt.md | ORCH-001 | Agent Instructions | System prompt for autonomous agents |
| ChatGPT-Technical execution plan.md | ORCH-002 | Execution Strategy | Technical implementation sequencing |
| ChatGPT-Role-based resource distribution.md | ORCH-003 | Resource Allocation | Role assignments and resource mapping |
| ChatGPT-Templated scaffold generation.md | ORCH-004 | Template System | Code generation templates |
| ChatGPT-Generate master index.md | ORCH-005 | Index System | Thread registry and artifact index |

**Synopsis**: Integration layer and agent coordination. ORCH-001 defines the meta-prompt that ensures all autonomous agents use consistent identity logic, schema references, and behavioral constraints. ORCH-005 provides the master indexing system for cross-referencing all artifacts.

---

### META-ORGANIZATION [META] - 5 files

| Current Filename | Recommended ID | Topic | Key Concepts |
|-----------------|----------------|-------|--------------|
| ChatGPT-Consolidate project bible.md | META-001 | Project Bible | Complete consolidated design document |
| ChatGPT-Thread count inquiry.md | META-002 | Thread Enumeration | Conversation counting and tracking |
| ChatGPT-Inter-thread dependency graph.md | META-003 | Dependency Mapping | How conversations depend on each other |
| ChatGPT-Concept deck creation.md | META-004 | Vision Deck | External-facing presentation materials |

**Synopsis**: Meta-level organization and documentation. META-001 is the single most important document - it consolidates ALL prior threads into one authoritative "project bible" covering purpose, system overview, schema, architecture, roadmap, masks, and deliverables.

---

## Dependency Graph

The conversations have these primary dependencies:

```
FOUNDATIONAL CONCEPTS (FOUND)
  ↓
CORE SPECIFICATIONS (SPEC) ← depends on FOUND-004 (Identity Questions)
  ↓
ARCHITECTURE & TECHNICAL (ARCH) ← depends on SPEC-001 (Schema)
  ↓
PLANNING & ROADMAP (PLAN) ← depends on ARCH-001 (Architecture)
  ↓
WORKFLOWS & AUTOMATION (WORK) ← depends on PLAN-001 (Roadmap)
  ↓
INTEGRATION & ORCHESTRATION (ORCH) ← depends on WORK-004 (Orchestration)
  ↓
META-ORGANIZATION (META) ← consolidates ALL categories
```

**Critical Path**:
FOUND-001 → SPEC-001 → ARCH-001 → PLAN-001 → WORK-005 → META-001

---

## Key Artifacts by Priority

### Tier 1: Essential Reading
1. **META-001** (Project Bible) - Complete system overview
2. **SPEC-001** (Schema) - Data model foundation
3. **ARCH-001** (Architecture) - Technical system design
4. **WORK-005** (Autonomous Code Growth) - Revolutionary development approach
5. **PLAN-001** (Roadmap) - Strategic phases and effort allocation

### Tier 2: Implementation Details
6. **SPEC-003** (Mask Taxonomy) - Identity projection system
7. **ARCH-005** (Monorepo Generator) - Executable scaffold script
8. **WORK-004** (Orchestration Graph) - LangGraph/CrewAI implementation
9. **ORCH-005** (Master Index) - Cross-referencing system
10. **META-003** (Dependency Graph) - Inter-thread relationships

### Tier 3: Supporting Context
11-33. Remaining files provide supporting context, alternative approaches, and detailed expansions

---

## Recommended New File Names

All files should be renamed using the pattern: `[CATEGORY]-[NUMBER]-[SLUG].md`

Examples:
- `FOUND-001-blockchain-cv-analogy.md`
- `SPEC-001-data-schema.md`
- `ARCH-001-system-architecture.md`
- `PLAN-001-product-roadmap.md`
- `WORK-005-autonomous-code-growth.md`
- `META-001-project-bible.md`

This allows:
- Alphabetical sorting by category
- Numerical ordering within category
- Clear topic identification from filename
- Easy cross-referencing in documentation

---

## Implementation Priorities

Based on the consolidated specifications, the recommended implementation order is:

### Phase 0: Foundation (Now)
1. Create `seed.yaml` from WORK-005 specifications
2. Generate monorepo structure using ARCH-005 script
3. Establish git repository with structure from ARCH-002

### Phase 1: Core System (5 Energy Units)
4. Implement schema from SPEC-001
5. Build identity core and mask system from SPEC-003
6. Create base narrative rules from SPEC-002

### Phase 2: Architecture & Agents (7 Energy Units)
7. Implement orchestrator from WORK-004
8. Build multi-agent system from WORK-005
9. Set up GitHub Actions from ARCH-003

### Phase 3-7: Follow PLAN-001 roadmap

---

## Key Insights & Innovations

### 1. Blockchain-Inspired CV Architecture
- CV = immutable append-only ledger of professional history
- Résumé = derived state snapshot with selective disclosure
- Verifiable credentials = cryptographic attestations
- Similar to: full blockchain vs. light client

### 2. Identity Mask System
- Non-branded, functional masks (Analyst, Synthesist, Artisan, etc.)
- Each mask filters and recombines same underlying data
- Masks preserve identity invariants while changing presentation
- Enables context-specific views (academic, artistic, technical)

### 3. Temporal Epoch Architecture
- Career divided into meaningful periods (Initiation, Expansion, Consolidation, etc.)
- Non-chronological, functional time-blocks
- Enables biographical, longitudinal narrative
- Maps identity evolution over time

### 4. Autonomous Code Growth System
- Treat repository as "living system" with formal genome (seed.yaml)
- Multi-agent crew: Architect → Implementer → Reviewer → Tester → Maintainer
- Agents correct each other through PR review process
- GitHub webhooks trigger agent workflows
- System grows autonomously within defined constraints

### 5. Energy-Based Timeline
- Planning uses abstract "effort units" not calendar time
- Avoids deadline pressure, focuses on capacity investment
- 37 total energy units across 7 phases
- Allows flexible pacing based on available resources

---

## Integration Points

The system integrates with:
- **W3C Verifiable Credentials** (DID, VC standards)
- **Blockchain** (DID registry, credential hashes, soulbound tokens)
- **LangGraph / CrewAI** (agent orchestration)
- **GitHub Actions** (CI/CD, autonomous development)
- **Next.js 15** (frontend)
- **PostgreSQL + Graph DB** (data layer)
- **Vector DB** (semantic search)

---

## Next Actions

1. **Rename all files** according to new taxonomy
2. **Create consolidated specs/** directory with extracted specifications
3. **Generate seed.yaml** from WORK-005 template
4. **Run monorepo generator** from ARCH-005
5. **Begin Phase 1 implementation** following PLAN-001

---

## Glossary

- **CV (Curriculum Vitae)**: Complete professional history, analogous to blockchain ledger
- **Résumé**: Selective summary for specific purpose, analogous to state snapshot
- **Mask**: Context-specific identity filter (e.g., Academic Mask, Artistic Mask)
- **Epoch**: Temporal period in professional evolution
- **Energy Unit (EU)**: Abstract measure of development effort (not time-based)
- **VC**: Verifiable Credential - cryptographically signed attestation
- **DID**: Decentralized Identifier - blockchain-based identity anchor
- **Orchestrator**: Multi-agent workflow coordination system
- **Seed**: Formal specification (seed.yaml) that defines repo growth constraints

---

**Document Authority**: This manifest consolidates and organizes all 33 ChatGPT conversations. For detailed specifications, consult individual files by their recommended ID.

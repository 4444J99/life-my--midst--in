# in–midst–my–life 🎭

> **Theatrical Identity Operating System**: A blockchain-inspired CV system with mask-based professional identity, autonomous job search, and philosophical depth

[![CI](https://github.com/4444J99/life-my--midst--in/actions/workflows/test.yml/badge.svg)](https://github.com/4444J99/life-my--midst--in/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/4444J99/life-my--midst--in/branch/main/graph/badge.svg)](https://codecov.io/gh/4444J99/life-my--midst--in)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Architecture](https://img.shields.io/badge/architecture-hexagonal-purple)]()

### Deploy Your Own Instance

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/4444J99/life-my--midst--in)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/4444J99/life-my--midst--in)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/4444J99/life-my--midst--in)

---

## 🎯 The Idea (In 60 Seconds)

Your professional identity isn't one-dimensional. You're:
- **Analyst** in boardrooms (data-driven, metrics-focused)
- **Artisan** in creative projects (process-obsessed, quality-sensitive)
- **Architect** in systems thinking (patterns, abstraction)
- **Narrator** explaining to executives (story-driven, impact-focused)

But your CV is **singular, static, context-blind**. It fails to capture multiplicity, temporal evolution, or identity invariants.

**in–midst–my–life** is an **identity operating system** that:

1. **Stores your CV as a blockchain ledger** - Immutable, append-only work history
2. **Generates context-specific résumés as state snapshots** - Different masks for different stages
3. **Enables temporal navigation** - Professional epochs from Initiation → Mastery → Legacy
4. **Provides verification** - W3C Verifiable Credentials, DID integration, attestation blocks
5. **Powers autonomous job search** - Hunter Protocol finds jobs, analyzes gaps, tailors résumés, writes cover letters
6. **Respects identity invariants** - Core thesis, values, competencies remain consistent across all masks

**The Philosophical Covenant**: This is NOT "just another resume builder." It's an identity architecture innovation bounded by non-negotiable principles.

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                    THEATRICAL METAPHOR                   │
├─────────────────────────────────────────────────────────┤
│ CV ≈ Blockchain Ledger    │ Résumé ≈ State Snapshot     │
│ Masks ≈ Identity Filters  │ Epochs ≈ Life Stages        │
│ Scaenae ≈ Stages          │ Tabula Personarum ≈ Registry │
└─────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│                    FULL-STACK SYSTEM                      │
├──────────────────────────────────────────────────────────┤
│ 📱 Frontend (Next.js 15)    │ 🔌 API (Fastify)            │
│   - Profile Dashboard       │   - Profile CRUD            │
│   - Mask Editor             │   - Narrative Generation    │
│   - Timeline Visualization  │   - Multi-format Export     │
│   - Hunter Console          │   - Verification Layer      │
├──────────────────────────────────────────────────────────┤
│ 🤖 Orchestrator (Node.js)      │ 💾 Data Layer             │
│   - 9 Agent Roles             │   - PostgreSQL (ledger)    │
│   - Job Search Automation     │   - Redis (cache/queue)    │
│   - GitHub Webhooks          │   - JSON-LD (semantic web) │
│   - Task Queue Management    │   - DID/VC (verification)  │
└──────────────────────────────────────────────────────────┘
```

**Technology Stack**:
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS, D3.js
- **Backend**: Fastify, Node.js 22+, TypeScript
- **Data**: PostgreSQL + Redis, JSON-LD, Zod schemas
- **Infrastructure**: Docker Compose, Vercel, GitHub Actions
- **Verification**: W3C DIDs, Verifiable Credentials

---

## 📊 Current Status

| Component | Status | Coverage |
|-----------|--------|----------|
| **Theatrical Framework** | ✅ COMPLETE | 21 schemas (identity, masks, epochs, narratives, etc.) |
| **Core Engine** | ✅ COMPLETE | Mask matching, narrative generation, verification |
| **Full-Stack Implementation** | ✅ COMPLETE | API (50+ endpoints), Frontend (40+ components), Orchestrator (9 agents) |
| **Advanced Features** | ✅ COMPLETE | Multi-agent orchestration, GitHub integration, caching, testing |
| **Hunter Protocol** | 🟡 60% | Search provider partial, agent tools partial, integration partial |
| **Theatrical UI Polish** | 🟡 70% | Components built, animations/polish incomplete |
| **Monetization** | ❌ 0% | Stripe, feature gates, billing infrastructure needed |
| **Deployment** | ❌ 0% | Vercel, Neon, Upstash, CI/CD infrastructure needed |
| **Marketing & Portfolio** | ❌ 0% | Landing page, docs, demo, blog, case studies needed |

**Overall Progress**: **90% Implementation** (theatrical vision) + **0% Commercialization** → **Target: 100%+ (all phases complete)**

---

## 🚀 Quick Start for Different Audiences

### 👨‍💻 For Developers (Want to Code?)

```bash
# 1. Clone and explore
git clone https://github.com/4jp/life-my--midst--in.git
cd life-my--midst--in

# 2. Read the essentials first
cat CLAUDE.md                          # AI guidance
cat EXECUTION-SUMMARY.md               # Overview + Phase 0
cat docs/phases/PHASE-ROADMAP.md              # Full 140 EU roadmap
cat docs/phases/PARALLEL-EXECUTION-GUIDE.md   # How to work in parallel

# 3. Install and run
pnpm install
scripts/dev-up.sh                      # Start PostgreSQL + Redis
pnpm dev                               # Start all services (web:3000, api:3001, orchestrator:3002)

# 4. Check the database and test endpoints
scripts/dev-shell.sh                   # Open psql interactive shell
curl http://localhost:3001/health      # Test API
curl http://localhost:3001/taxonomy/masks # View all masks

# 5. Explore the codebase
ls -la apps/web/src/components/        # Frontend components
ls -la apps/api/src/routes/            # API endpoints
ls -la packages/schema/src/             # Data models
```

### 🎯 For 3-5 AI Assistants (Working in Parallel)

**You're reading this because you're about to work on Phase 0, 1, or 2.**

1. **Read these first** (order matters):
   - `EXECUTION-SUMMARY.md` ← Start here for context + Phase 0 priorities
   - `docs/phases/PHASE-ROADMAP.md` ← Full 140 EU unified roadmap with philosophy
   - `docs/phases/PARALLEL-EXECUTION-GUIDE.md` ← Your work streams and dependencies
   - `CLAUDE.md` ← Development guidelines and patterns

2. **Find your role**:
   - **AI #1 (Backend/Core/DevOps)**: Streams 0A, 1A, 2A/B/C/D, etc. → See parallel guide
   - **AI #2 (Frontend/Product)**: Streams 0B, 1D, 3A/C, etc. → See parallel guide
   - **AI #3 (Schema/Content/Research)**: Streams 1B, 2C, 3B/D, etc. → See parallel guide

3. **Understand dependencies**:
   - Phase 0 must complete before others start (Week 1-2)
   - Stripe (1A) must complete before Billing UI (1D)
   - See `/docs/phases/PARALLEL-EXECUTION-GUIDE.md` for full matrix

4. **Start with Phase 0** (next 2 weeks):
   - **0A - Hunter Protocol**: Implement search provider, wire agent tools
   - **0B - Theatrical UI**: Build mask editor, scaenae filters, timeline

5. **Daily standup**:
   - Update progress in `/DAILY-STANDUP.md` (create this file daily)
   - Flag blockers immediately
   - Integration test after each phase

### 📚 For Researchers/Philosophers (Want to Understand the Vision?)

Read in this order:

1. **docs/archived/foundations/FOUND-001-blockchain-cv-analogy.md** - Core metaphor
2. **docs/archived/meta/META-001-project-bible.md** - Comprehensive design vision
3. **COVENANT.md** (or EVOLUTION-PLAN.md) - Philosophical boundaries
4. **docs/archived/foundations/FOUND-004-identity-narrative-questions.md** - 8 foundational identity questions
5. **docs/phases/PHASE-ROADMAP.md** → Section "The Philosophical Foundation"

These documents explain WHY the system is designed this way.

---

## 🎭 The Theatrical Metaphor (Core Philosophy)

This is **non-negotiable**. Every implementation decision must honor this covenant.

### Core Analogies

| Concept | Blockchain | CV System | Meaning |
|---------|-----------|-----------|---------|
| **Ledger** | Complete transaction history | Curriculum Vitae (full work history) | Immutable, append-only source of truth |
| **State Snapshot** | Merkle root at a block height | Résumé (context-filtered) | Derived view optimized for a moment/audience |
| **Verification** | Cryptographic signatures | Verifiable Credentials (W3C) | Proof of claims without revealing all data |
| **Identity** | Wallet address / DID | Professional identity | Unique, persistent, publicly verifiable |
| **Authenticity** | Non-repudiation | Attestation blocks | Third-party verification of claims |

### The 16 Functional Masks

Not personalities—**professional lenses** that filter the same underlying truth:

**Cognitive Masks** (How you think):
- **Analyst** - Data-driven, metrics-focused, empirical
- **Synthesist** - Pattern-finder, connector, systems-thinker
- **Observer** - Reflective, metacognitive, quality-aware
- **Strategist** - Forward-looking, goal-oriented, tactical
- **Speculator** - Creative, hypothetical, exploratory
- **Interpreter** - Meaning-maker, communicator, translator

**Expressive Masks** (How you express):
- **Artisan** - Quality-obsessed, process-driven, detail-oriented
- **Architect** - Design-focused, abstraction-oriented, structural
- **Narrator** - Story-driven, context-aware, explanatory
- **Provoker** - Provocative, challenging, opinion-driven
- **Mediator** - Diplomatic, consensus-seeking, bridge-building

**Operational Masks** (How you execute):
- **Executor** - Fast, decisive, action-oriented
- **Steward** - Caring, responsible, ethical
- **Integrator** - Holistic, connecting silos, coherent
- **Custodian** - Protective, preserving, maintaining
- **Calibrator** - Balancing, optimizing, fine-tuning

**Each mask is real—not a lie, but a perspective on the same truth.**

### Epochs (Temporal Arcs)

Professional identity evolves:

```
Initiation → Emergence → Consolidation → Divergence →
Mastery → Reinvention → Transmission → Legacy
```

Each epoch has:
- **Time period** (actual dates)
- **Identity evolution** (how you changed)
- **Key milestones** (what you accomplished)
- **Inflection points** (what changed you)

### Scaenae (Theatrical Stages)

Different contexts demand different masks:

- **Academica** - Educational, research-driven
- **Technica** - Technical, engineering-focused
- **Artistica** - Creative, expressive
- **Civica** - Public, civic engagement
- **Domestica** - Personal, intimate
- **Occulta** - Private, hidden (fully redacted)

Each stage has visibility rules:
- Which masks are visible?
- Which projects are highlighted?
- What tone/voice?

### Tabula Personarum (Mask Registry)

Complete catalog of your professional personas with:
- **Descriptive name** (e.g., "The Problem Solver")
- **Core traits** (what defines this mask?)
- **Temporal range** (when is this mask active?)
- **Visibility rules** (on what stages?)
- **Sample claims** (what would this mask claim?)

---

## 📖 Repository Organization

```
life-my--midst--in/
│
├── 📄 README.md                          ← You are here
├── 📄 EXECUTION-SUMMARY.md               ← Quick reference (Phase 0, parallel work)
├── 📄 CLAUDE.md                          ← AI guidance for development
├── 📄 COVENANT.md (or EVOLUTION-PLAN)   ← Philosophical boundaries
│
├── 📁 docs/
│   ├── 15 active docs            ← New-era reference documents
│   ├── operations/               ← Runbooks & troubleshooting (5 files)
│   ├── features/                 ← Hunter Protocol & Artifact System (8 files)
│   ├── phases/                   ← Completed phase reports (20 files)
│   ├── adr/                      ← Architecture Decision Records (13 ADRs)
│   └── archived/                 ← Historical seed documents (9 subdirs, 64 files)
│       ├── foundations/           ← FOUND-001 through FOUND-005
│       ├── specifications/        ← SPEC-001 through SPEC-004
│       ├── architecture/          ← ARCH-001 through ARCH-005
│       ├── planning/              ← PLAN-001 through PLAN-006
│       ├── orchestration/         ← ORCH-001 through ORCH-005
│       ├── workflows/             ← WORK-001 through WORK-005
│       ├── meta/                  ← META-001 through META-004
│       ├── completions/           ← Phase completion reports (14 files)
│       ├── reports/               ← Test reports & audits (5 files)
│       └── guides/                ← Historical guides & tracking (11 files)
│
├── 📁 Implementation
│   ├── apps/
│   │   ├── web/              (Next.js 15 dashboard, 3000)
│   │   ├── api/              (Fastify API, 3001)
│   │   └── orchestrator/      (Node.js worker, 3002)
│   ├── packages/
│   │   ├── schema/           (Zod + TypeScript models)
│   │   ├── core/             (Business logic, masks, verification)
│   │   ├── content-model/    (Narrative generation, JSON-LD)
│   │   └── design-system/    (Shared UI primitives)
│   └── infra/
│       ├── docker-compose.yml
│       ├── Dockerfile
│       └── helm/ (Kubernetes)
│
├── 📁 Configuration
│   ├── pnpm-lock.yaml
│   ├── turbo.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   └── seed.yaml
│
└── 📁 Development
    ├── scripts/
    │   ├── dev-up.sh         (Start Docker services)
    │   ├── dev-shell.sh      (Open psql/redis shells)
    │   └── ...
    └── .env.integration.example
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js 22+ and pnpm (monorepo package manager)
- Docker + Docker Compose (for PostgreSQL + Redis)
- TypeScript knowledge
- Familiarity with Next.js, Fastify, and SQL

### 1. Clone & Install

```bash
git clone https://github.com/4jp/life-my--midst--in.git
cd life-my--midst--in
pnpm install
```

### 2. Start Services

```bash
# Terminal 1: Start PostgreSQL + Redis
scripts/dev-up.sh

# Terminal 2: Open database shells (optional)
scripts/dev-shell.sh

# Terminal 3: Run all dev servers
pnpm dev
# Output:
#   web runs on http://localhost:3000
#   api runs on http://localhost:3001
#   orchestrator runs on http://localhost:3002
```

### 3. Test Everything

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Integration tests (requires INTEGRATION_POSTGRES_URL set)
INTEGRATION_POSTGRES_URL=postgresql://localhost/midst_test pnpm integration

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### 4. Seed Demo Data

```bash
pnpm --filter @in-midst-my-life/api seed
pnpm --filter @in-midst-my-life/orchestrator seed
```

### 5. Explore the API

```bash
# Health check
curl http://localhost:3001/health

# View all masks
curl http://localhost:3001/taxonomy/masks

# View all epochs
curl http://localhost:3001/taxonomy/epochs

# View OpenAPI spec
curl http://localhost:3001/openapi.yaml | jq .
```

---

## 🎯 Working on Phase 0 (Next 2 Weeks)

### Stream 0A: Hunter Protocol (AI #1 - Backend Specialist)

**Goal**: Autonomous job search automation

**Files to create/modify**:
- `packages/core/src/search/google-jobs.ts` - Serper API integration
- `apps/orchestrator/src/agents/hunter.ts` - Agent with 4 tools
- `apps/orchestrator/src/repositories/jobs.ts` - Job persistence
- Integration tests

**Success Criteria**:
- ✅ Search 20+ jobs by keyword + location
- ✅ Analyze skill gaps from job description
- ✅ Tailor résumé per mask
- ✅ Generate markdown cover letter

### Stream 0B: Theatrical UI Polish (AI #2 - Frontend Specialist)

**Goal**: Complete mask-based identity interface

**Files to create/modify**:
- `apps/web/src/components/TabulaPersonarum.tsx` - Mask registry editor
- `apps/web/src/components/ScaenaeFilter.tsx` - Stage-based visibility
- `apps/web/src/components/AetasTimeline.tsx` - Interactive D3 timeline
- Theatrical animations and transitions

**Success Criteria**:
- ✅ Create new mask with all attributes
- ✅ Edit mask properties
- ✅ Toggle visibility per stage
- ✅ View interactive life-stage timeline
- ✅ Smooth mask transitions

**Blocker for Other Phases?** No—Phase 0 runs independently.

---

## 📋 API Contract Summary

### Health & Readiness
```
GET /health       → { status: "ok" }
GET /ready        → 200 if all dependencies healthy
GET /metrics      → Prometheus format metrics
```

### Taxonomy (Reference Data)
```
GET /taxonomy/masks?page=1&limit=20
GET /taxonomy/epochs?page=1&limit=20
GET /taxonomy/stages?page=1&limit=20
```

### Profile Management
```
GET /profiles/:id                           → Full profile
POST /profiles/:id/masks/select             → Select context
POST /profiles/:id/narrative                → Generate narrative
GET /profiles/:id/export/jsonld             → Semantic export
GET /profiles/:id/export/vc                 → Credential export
GET /profiles/:id/export/pdf                → PDF résumé
```

### Hunter Protocol (Phase 0)
```
POST /hunter/find-jobs                      → Search job board
POST /hunter/analyze-gap                    → Skill gap analysis
POST /hunter/tailor-resume                  → Customize résumé
POST /hunter/write-cover-letter             → Generate letter
```

### Orchestrator Tasks
```
GET /tasks                                  → List queued tasks
GET /tasks/:id/history                      → Execution history
POST /webhooks/github                       → GitHub event ingestion
```

---

## 🔐 Environment Configuration

### Development (.env.local)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/midst_dev
POSTGRES_URL=postgresql://user:pass@localhost:5432/midst_dev
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### Integration Testing (.env.integration.example)
```
INTEGRATION_POSTGRES_URL=postgresql://localhost/midst_test
INTEGRATION_REDIS_URL=redis://localhost/1
```

### Production (Managed by CI/CD)
```
See docs/SECURITY.md for secrets management best practices
Use Vercel environment variables for Next.js
Use GitHub Secrets for API keys (Stripe, Serper, etc.)
```

---

## 🧪 Testing Strategy

| Test Type | Tool | When | Where |
|-----------|------|------|-------|
| **Unit** | Vitest | Always | `src/**/*.test.ts` |
| **Integration** | Vitest + DB | CI or explicit | `test/integration/` |
| **E2E** | Playwright | Manual testing | `apps/web/__tests__/` |
| **Accessibility** | jest-axe | Part of unit tests | `src/**/*.a11y.test.ts` |

Run all tests:
```bash
pnpm test                  # Unit (all packages)
pnpm test:watch           # Watch mode
pnpm integration          # Integration (requires INTEGRATION_* env vars)
CI=true pnpm test         # Full coverage report (CI mode)
```

---

## 🎯 Phase Breakdown (140 EU, 16 Weeks)

| Phase | Weeks | EU | Focus | Status |
|-------|-------|-----|--------|--------|
| **0: Philosophical** | 1-2 | 12 | Hunter Protocol + Theatrical UI | ⏭️ **NEXT** |
| **1: Monetization** | 2-4 | 21 | Stripe, billing, feature gates | 📋 Ready |
| **2: Deployment** | 3-6 | 18 | Vercel, Neon, Upstash, CI/CD | 📋 Ready |
| **3: Portfolio** | 5-8 | 30 | Landing page, docs, demo, blog | 📋 Ready |
| **4: Stabilization** | 7-11 | 28 | UX polish, PDF, GraphQL, analytics | 📋 Ready |
| **5: Community** | 9-13 | 16 | Content, beta, GitHub, Discord | 📋 Ready |
| **6: Launch** | 12-16 | 15 | Product Hunt, HN, iteration | 📋 Ready |

**See `/docs/phases/PHASE-ROADMAP.md` for complete breakdown.**

---

## 💡 Key Design Patterns

### Schema-First
All data models defined in `packages/schema/` using Zod:
```typescript
// Example: packages/schema/src/mask.ts
export const MaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  traits: z.array(z.string()),
  visibleOn: z.array(z.enum(['Academica', 'Technica', 'Artistica', ...])),
  // ... more fields
});
```

### Hexagonal Architecture
```
┌─ routes (thin orchestration layer)
│  ↓
├─ services (pure business logic)
│  ↓
├─ repositories (data access abstraction)
│  ↓
└─ db (actual Postgres/Redis calls)
```

### Mask Matching
```typescript
// core/maskMatching.ts
function rankMasks(
  context: { tags: string[], audience: string },
  availableMasks: Mask[]
): Mask[] {
  // Rank masks by relevance to context
  // Preserve identity invariants
  // Filter by visibility rules
}
```

### Narrative Generation
```typescript
// content-model/narrative.ts
function generateNarrative(
  profile: Profile,
  selectedMask: Mask,
  context: { timeline, epochs, scaenae }
): NarrativeBlock[] {
  // Filter profile data by mask
  // Weight blocks by epoch relevance
  // Apply stage-based visibility rules
  // Return narrative blocks for presentation
}
```

---

## 🚢 Deployment Targets

### Development
- **Frontend**: `pnpm dev` (Next.js dev server)
- **API**: `pnpm --filter api dev` (Fastify dev server)
- **Orchestrator**: `pnpm --filter orchestrator dev` (Node.js dev server)
- **Database**: Docker Compose (PostgreSQL + Redis)

### Staging / Production (Phase 2+)
- **Frontend**: Vercel (Next.js deployment)
- **API**: Railway or Fly.io (Fastify)
- **Database**: Neon (Postgres) + Upstash (Redis)
- **CI/CD**: GitHub Actions

**See `docs/SECURITY.md` and `infra/README.md` for detailed deployment guides.**

---

## 🤝 Contributing

### Code Standards
- **TypeScript** - Strict mode, no `any` types
- **Testing** - 75%+ coverage minimum
- **Formatting** - Prettier (auto-format)
- **Linting** - ESLint with TypeScript rules
- **File size** - Max 1200 LOC per file, max 200 LOC per function

**See `seed.yaml` for complete constraints.**

### Review Process
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Create pull request with clear description
4. Address review feedback
5. Merge when approved

### AI Assistant Workflow
If you're an AI assistant working on a phase:
1. Read `EXECUTION-SUMMARY.md` and your assigned stream in `PARALLEL-EXECUTION-GUIDE.md`
2. Understand the blocked/blocking relationships
3. Create daily standup in `/DAILY-STANDUP.md`
4. Flag blockers immediately
5. Run full test suite before committing
6. Create PR for integration testing

---

## 📚 Essential Reading List

**Start with these** (in order):
1. **EXECUTION-SUMMARY.md** - Overview + Phase 0
2. **docs/phases/PHASE-ROADMAP.md** - Full roadmap with philosophy
3. **docs/phases/PARALLEL-EXECUTION-GUIDE.md** - How to work in parallel
4. **CLAUDE.md** - Development guidelines

**Then explore**:
5. **docs/archived/meta/META-001-project-bible.md** - Comprehensive design vision
6. **docs/archived/foundations/FOUND-001-blockchain-cv-analogy.md** - Core metaphor
7. **docs/archived/foundations/FOUND-004-identity-narrative-questions.md** - Foundational questions
8. **seed.yaml** - Development constraints

**Reference while coding**:
9. **packages/schema/** - Data models
10. **apps/api/openapi.yaml** - API contract
11. **CLAUDE.md** - Architecture patterns

---

## 🆘 Troubleshooting

### Services won't start
```bash
# Make sure Docker is running
docker ps

# Check logs
docker logs <container-id>

# Rebuild everything
docker-compose down -v
docker-compose up
```

### Database connection errors
```bash
# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check if migrations ran
psql $DATABASE_URL -c "\dt schema_migrations"
```

### Tests failing
```bash
# Run tests with verbose output
pnpm test -- --reporter=verbose

# Run specific test file
pnpm --filter @in-midst-my-life/api test -- src/services/maskMatching.test.ts

# Check coverage
CI=true pnpm test
```

### Git issues
```bash
# See what's untracked
git status

# See what's staged
git diff --cached

# Reset to clean state
git reset --hard origin/main
```

---

## 🔗 Links & Resources

**Internal**:
- [EXECUTION-SUMMARY.md](EXECUTION-SUMMARY.md) - Quick reference
- [CLAUDE.md](CLAUDE.md) - AI development guidance
- [docs/SECURITY.md](docs/SECURITY.md) - Security checklist
- [docs/phases/PHASE-ROADMAP.md](docs/phases/PHASE-ROADMAP.md) - Complete roadmap
- [docs/phases/PARALLEL-EXECUTION-GUIDE.md](docs/phases/PARALLEL-EXECUTION-GUIDE.md) - Parallel work streams

**External Standards**:
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [W3C DIDs](https://www.w3.org/TR/did-core/)
- [Schema.org Person](https://schema.org/Person)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Fastify Guide](https://www.fastify.io/)

---

## 📊 Metrics & Success

### Phase 0 Success (Weeks 1-2)
- ✅ Hunter Protocol finds 20+ jobs, tailors résumés, writes cover letters
- ✅ Theatrical UI allows mask creation/editing with full attributes
- ✅ Scaenae filtering works (masks show/hide per stage)
- ✅ Aetas timeline is interactive and shows life-stage progression

### Overall Success (Month 4)
- ✅ 500+ signups attracted to philosophical depth
- ✅ 50+ paying customers ($950+ MRR from Artisan + Dramatist tiers)
- ✅ Full-stack system deployed to Vercel + Neon
- ✅ Thought leadership positioning (speaking invites, media mentions)
- ✅ 3+ client/consulting inquiries

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

This is free and open source software. You can:
- Use it commercially
- Modify and distribute
- Use privately
- Sublicense

See the [LICENSE](LICENSE) file for the full text.

---

## 💬 Questions?

If you're:
- **A developer**: Check [CLAUDE.md](CLAUDE.md) and [docs/phases/PHASE-ROADMAP.md](docs/phases/PHASE-ROADMAP.md)
- **An AI assistant**: Check [EXECUTION-SUMMARY.md](EXECUTION-SUMMARY.md) and [docs/phases/PARALLEL-EXECUTION-GUIDE.md](docs/phases/PARALLEL-EXECUTION-GUIDE.md)
- **Philosophically curious**: Read [docs/archived/foundations/FOUND-001-blockchain-cv-analogy.md](docs/archived/foundations/FOUND-001-blockchain-cv-analogy.md) and [docs/archived/meta/META-001-project-bible.md](docs/archived/meta/META-001-project-bible.md)

---

<div align="center">

## **in–midst–my–life** 🎭

*Transforming professional identity from static document to living, theatrical system*

[Phase Roadmap](docs/phases/PHASE-ROADMAP.md) • [Execution Guide](docs/phases/PARALLEL-EXECUTION-GUIDE.md) • [Project Bible](docs/archived/meta/META-001-project-bible.md) • [Security](docs/SECURITY.md)

**Status**: 90% Implementation ✅ + 0% Commercialization → Ready for Phase 0 Launch 🚀

</div>

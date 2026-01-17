# Documentation Hub

Welcome to the **In Midst My Life** documentation. This directory contains comprehensive guides, API references, architecture decisions, and operational runbooks.

---

## 🚀 Quick Start

**New to the project?** Start here:

1. **[Developer Guide](./DEVELOPER_GUIDE.md)** - Get set up in <30 minutes
2. **[API Reference](./API_REFERENCE.md)** - Explore the REST API
3. **[Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)** - Understand the system

---

## 📚 Documentation Categories

### For Developers

#### Getting Started
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Complete onboarding guide (<30 min setup)
- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[OpenAPI Setup](./OPENAPI_SETUP.md)** - Swagger UI / Redoc integration

#### Architecture & Design
- **[Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)** - Mermaid diagrams of system components
- **[Architecture Decision Records (ADR)](./adr/)** - Key architectural decisions
  - [ADR 001: Monorepo Structure](./adr/001-monorepo-structure.md)
  - [ADR 002: PostgreSQL Database](./adr/002-postgresql-primary-database.md)
  - [ADR 003: Redis Caching](./adr/003-redis-caching-queue.md)
  - [ADR 004: Local-First LLM](./adr/004-local-llm-ollama.md)
  - [ADR 005: Mask-Based Identity](./adr/005-mask-based-identity.md)
  - [ADR 006: Next.js Frontend](./adr/006-nextjs-frontend.md)

#### API Documentation
- **[API Reference](./API_REFERENCE.md)** - Complete REST API documentation
- **Interactive Docs**: http://localhost:3001/docs (Swagger UI)
- **Alternative Docs**: http://localhost:3001/redoc (Redoc)
- **OpenAPI Specs**: 
  - Main API: `apps/api/openapi.yaml`
  - Hunter Protocol: `apps/api/openapi-hunter.yaml`

### For Operators

#### Deployment
- **[Deployment Guide](./DEPLOYMENT.md)** - Docker Compose & Kubernetes setup
- **[Environment Variables](./ENVIRONMENT-VARS.md)** - Configuration reference
- **[Database Management](./DATABASE-ROLLBACK.md)** - Migrations and rollbacks

#### Operations
- **[Phase 1 Runbook](./PHASE-1-RUNBOOK.md)** - Operational procedures
- **[Monitoring Guide](./PHASE-1-MONITORING.md)** - Observability setup
- **[Security Audit](./PHASE-1-SECURITY-AUDIT.md)** - Security considerations

### For Product & Users

#### Product Guides
- **[User Guide](./USER-GUIDE.md)** - End-user documentation
- **[Hunter Protocol Guide](./HUNTER-PROTOCOL-USER-GUIDE.md)** - Job search automation
- **[Artifact System Guide](./ARTIFACT_SYSTEM_USER_GUIDE.md)** - Content management

#### Specifications
- **[Hunter Protocol Architecture](./HUNTER-PROTOCOL-ARCHITECTURE.md)** - Technical design
- **[Implementation Summary](./IMPLEMENTATION-SUMMARY.md)** - Feature overview

---

## 🏗️ Project Structure

```
in-midst-my-life/
├── apps/
│   ├── api/                    # Fastify REST API
│   │   ├── openapi.yaml       # Main API spec
│   │   └── openapi-hunter.yaml # Hunter Protocol spec
│   ├── orchestrator/          # Background workers
│   └── web/                   # Next.js frontend
├── packages/
│   ├── schema/                # Zod schemas
│   ├── core/                  # Business logic
│   ├── content-model/         # Content graph
│   └── design-system/         # UI components
└── docs/                      # Documentation (you are here)
    ├── adr/                   # Architecture Decision Records
    └── specs/                 # Detailed specifications
```

---

## 🔑 Key Concepts

### Mask-Based Identity System

**Masks** are contextual filters that present different facets of your professional identity without duplicating data. Think of it as:
- **CV = Blockchain**: Immutable ledger of all experiences
- **Résumé = State Snapshot**: Derived view at a point in time
- **Mask = Query Function**: How to extract and present data

Learn more: [ADR 005: Mask-Based Identity](./adr/005-mask-based-identity.md)

### Hunter Protocol

Autonomous job search agent that:
1. **Searches** for relevant jobs
2. **Analyzes** skill gaps
3. **Tailors** résumés with appropriate masks
4. **Generates** cover letters

Learn more: [Hunter Protocol Guide](./HUNTER-PROTOCOL.md)

### Three-Layer Architecture

1. **Frontend**: Next.js 15 with App Router (Server Components)
2. **API**: Fastify REST API with OpenAPI spec
3. **Orchestrator**: Background workers with LLM integration

Learn more: [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)

---

## 📖 Documentation Standards

### For Contributors

When adding documentation:

1. **Use Markdown** with consistent formatting
2. **Include examples** for complex concepts
3. **Add diagrams** where helpful (Mermaid preferred)
4. **Link related docs** for context
5. **Update this index** when adding new docs

### Documentation Types

- **Guides**: Step-by-step instructions (imperative)
- **References**: Complete information (declarative)
- **ADRs**: Decision context and rationale
- **Runbooks**: Operational procedures

---

## 🔍 Finding Information

### By Task

| I want to... | Read this... |
|-------------|-------------|
| Set up dev environment | [Developer Guide](./DEVELOPER_GUIDE.md) |
| Understand API endpoints | [API Reference](./API_REFERENCE.md) |
| Deploy to production | [Deployment Guide](./DEPLOYMENT.md) |
| Debug an issue | [Troubleshooting Guide](./TROUBLESHOOTING.md) |
| Understand architecture | [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md) |
| Learn about masks | [ADR 005: Mask System](./adr/005-mask-based-identity.md) |
| Use Hunter Protocol | [Hunter Protocol Guide](./HUNTER-PROTOCOL.md) |
| Understand design decisions | [ADR Index](./adr/) |

### By Role

**Developer:**
1. [Developer Guide](./DEVELOPER_GUIDE.md)
2. [API Reference](./API_REFERENCE.md)
3. [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)
4. [Troubleshooting Guide](./TROUBLESHOOTING.md)

**DevOps/SRE:**
1. [Deployment Guide](./DEPLOYMENT.md)
2. [Phase 1 Runbook](./PHASE-1-RUNBOOK.md)
3. [Monitoring Guide](./PHASE-1-MONITORING.md)
4. [Database Rollback](./DATABASE-ROLLBACK.md)

**Product Manager:**
1. [User Guide](./USER-GUIDE.md)
2. [Implementation Summary](./IMPLEMENTATION-SUMMARY.md)
3. [Hunter Protocol Architecture](./HUNTER-PROTOCOL-ARCHITECTURE.md)

**Architect:**
1. [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)
2. [All ADRs](./adr/)
3. [System Design Spec](../SPEC-002-system-design.md)

---

## 🛠️ Development Workflow

```bash
# 1. Start services
./scripts/dev-up.sh

# 2. Run migrations
pnpm --filter @in-midst-my-life/api migrate
pnpm --filter @in-midst-my-life/orchestrator migrate

# 3. Start dev servers
pnpm dev

# 4. Access services
# - Web UI: http://localhost:3000
# - API: http://localhost:3001
# - API Docs: http://localhost:3001/docs
# - Orchestrator: http://localhost:3002
```

See [Developer Guide](./DEVELOPER_GUIDE.md) for full setup instructions.

---

## 🐛 Troubleshooting

**Common issues:**

- **Database connection refused** → [DB Issues](./TROUBLESHOOTING.md#database-issues)
- **Redis connection failed** → [Redis Issues](./TROUBLESHOOTING.md#redis--caching-issues)
- **Port already in use** → [Port Conflicts](./TROUBLESHOOTING.md#port-already-in-use)
- **Jobs not processing** → [Queue Issues](./TROUBLESHOOTING.md#orchestrator--job-queue-issues)
- **LLM timeout** → [LLM Issues](./TROUBLESHOOTING.md#llm--agent-issues)

Full troubleshooting guide: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📊 Documentation Coverage

### E1: Documentation & Developer Experience ✅

**Completed deliverables:**

- ✅ **API Reference** (API_REFERENCE.md) - Auto-generated from OpenAPI specs
- ✅ **Deployment Guide** (DEPLOYMENT.md) - Docker Compose + Kubernetes Helm
- ✅ **Developer Onboarding** (DEVELOPER_GUIDE.md) - <30 min setup guide
- ✅ **Architecture Diagrams** (ARCHITECTURE_DIAGRAMS.md) - Mermaid visualizations
- ✅ **Hunter Protocol Docs** (HUNTER-PROTOCOL.md, HUNTER-PROTOCOL-USER-GUIDE.md)
- ✅ **Troubleshooting Guide** (TROUBLESHOOTING.md) - Common errors & solutions
- ✅ **Architecture Decision Records** (adr/) - 6 ADRs documenting key decisions
- ✅ **OpenAPI Setup** (OPENAPI_SETUP.md) - Swagger UI/Redoc integration

**Statistics:**
- Total docs: 20+ files
- API endpoints documented: 50+
- Mermaid diagrams: 15+
- ADRs: 6
- Troubleshooting scenarios: 30+

---

## 🚀 Next Steps

### For New Developers

1. **Read** [Developer Guide](./DEVELOPER_GUIDE.md)
2. **Follow** the setup instructions
3. **Make** your first contribution
4. **Review** [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md)

### For Experienced Developers

1. **Explore** [ADR directory](./adr/)
2. **Review** [API Reference](./API_REFERENCE.md)
3. **Understand** mask system via [ADR 005](./adr/005-mask-based-identity.md)
4. **Deploy** using [Deployment Guide](./DEPLOYMENT.md)

### For Contributors

1. **Read** documentation standards (above)
2. **Create** new ADR if making architectural decisions
3. **Update** relevant docs when changing code
4. **Link** to related documentation

---

## 📞 Support

Need help?

- **GitHub Issues**: https://github.com/anthropics/in-midst-my-life/issues
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Email**: padavano.anthony@gmail.com

---

**Welcome to In Midst My Life! 🎭**

High-level documentation for the interactive CV system.

See the parent directory for design documents organized as:
- FOUND-* (Foundational concepts)
- SPEC-* (Specifications)
- ARCH-* (Architecture)
- PLAN-* (Planning)
- WORK-* (Workflows)
- ORCH-* (Orchestration)
- META-* (Meta-organization)

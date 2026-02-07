# Documentation Hub

Central documentation for the **in-midst-my-life** interactive CV/resume system.

## Quick Navigation

| Category | Documents |
|----------|-----------|
| **Getting Started** | [Developer Guide](./DEVELOPER_GUIDE.md), [User Guide](./USER-GUIDE.md), [Deployment](./DEPLOYMENT.md) |
| **Architecture** | [Diagrams](./ARCHITECTURE_DIAGRAMS.md), [API Reference](./API_REFERENCE.md), [ADRs](./adr/) |
| **Operations** | [Runbooks](./operations/ON_CALL_RUNBOOK.md), [Troubleshooting](./operations/TROUBLESHOOTING.md), [Backup/Restore](./operations/BACKUP-RESTORE.md) |
| **Features** | [Hunter Protocol](./features/hunter-protocol/), [Artifact System](./features/artifact-system/) |
| **Quality** | [Feature Audit](./FEATURE-AUDIT.md), [Seed Alignment Audit](./SEED-ALIGNMENT-AUDIT.md), [Security](./SECURITY.md) |
| **Philosophy** | [Covenant](./COVENANT.md), [Inverted Interview](./INVERTED-INTERVIEW.md) |

---

## By Task

| What do you want to do? | Go here |
|--------------------------|---------|
| Set up dev environment | [Developer Guide](./DEVELOPER_GUIDE.md) |
| Deploy to production | [Deployment Guide](./DEPLOYMENT.md) |
| Configure environment vars | [Environment Variables](./ENVIRONMENT-VARS.md) |
| Self-host the system | [Self-Hosting Guide](./SELF-HOSTING.md) |
| Use the API | [API Reference](./API_REFERENCE.md) |
| Troubleshoot issues | [Troubleshooting](./operations/TROUBLESHOOTING.md) |
| Understand architecture | [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md) |
| Review security policy | [Security](./SECURITY.md) |
| Check accessibility | [Accessibility](./ACCESSIBILITY.md) |
| Integrate job data | [Job Integration Guide](./features/hunter-protocol/JOB-INTEGRATION-GUIDE.md) |
| Work with artifacts | [Artifact System User Guide](./features/artifact-system/ARTIFACT_SYSTEM_USER_GUIDE.md) |

---

## By Role

### Developer
Start here:
1. [Developer Guide](./DEVELOPER_GUIDE.md) - Setup, architecture patterns, testing
2. [API Reference](./API_REFERENCE.md) - REST and GraphQL contracts
3. [Environment Variables](./ENVIRONMENT-VARS.md) - Configuration reference
4. [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md) - System topology

Then explore:
- [ADRs](./adr/) - Architecture decisions with rationale
- [Feature Systems](./features/) - Hunter Protocol, Artifact System
- [OpenAPI Setup](./OPENAPI_SETUP.md) - API documentation tooling

### DevOps/SRE
Start here:
1. [Deployment Guide](./DEPLOYMENT.md) - Kubernetes, Docker Compose, CI/CD
2. [Operations](./operations/OPERATIONS.md) - Monitoring, scaling, maintenance
3. [On-Call Runbook](./operations/ON_CALL_RUNBOOK.md) - Incident response

Then explore:
- [Troubleshooting](./operations/TROUBLESHOOTING.md) - Common issues and fixes
- [Backup & Restore](./operations/BACKUP-RESTORE.md) - Data recovery procedures
- [Database Rollback](./operations/DATABASE-ROLLBACK.md) - Migration rollback
- [Self-Hosting Guide](./SELF-HOSTING.md) - Self-hosting requirements

### Product Manager
Start here:
1. [User Guide](./USER-GUIDE.md) - End-user workflows
2. [Feature Audit](./FEATURE-AUDIT.md) - Implemented vs planned features
3. [Covenant](./COVENANT.md) - Project philosophy and principles

Then explore:
- [Hunter Protocol User Guide](./features/hunter-protocol/HUNTER-PROTOCOL-USER-GUIDE.md)
- [Artifact System User Guide](./features/artifact-system/ARTIFACT_SYSTEM_USER_GUIDE.md)
- [Inverted Interview](./INVERTED-INTERVIEW.md) - Conceptual foundation

### Architect
Start here:
1. [Architecture Diagrams](./ARCHITECTURE_DIAGRAMS.md) - Visual topology
2. [ADRs](./adr/) - Decision records (013 total)
3. [API Reference](./API_REFERENCE.md) - Service contracts

Then explore:
- [Hunter Protocol Architecture](./features/hunter-protocol/HUNTER-PROTOCOL-ARCHITECTURE.md)
- [Seed Alignment Audit](./SEED-ALIGNMENT-AUDIT.md) - Philosophy-to-code traceability
- [Security Policy](./SECURITY.md) - Threat model and controls

---

## Project Structure

```
docs/
├── README.md                      # This file
├── COVENANT.md                    # Philosophy
├── INVERTED-INTERVIEW.md          # Conceptual foundation
├── SEED-ALIGNMENT-AUDIT.md        # Active audit (philosophy-to-code)
├── FEATURE-AUDIT.md               # Active audit (feature completeness)
├── API_REFERENCE.md               # API contract
├── ARCHITECTURE_DIAGRAMS.md       # Architecture visuals
├── SECURITY.md                    # Security policy
├── ACCESSIBILITY.md               # Accessibility policy
├── DEVELOPER_GUIDE.md             # Developer onboarding
├── USER-GUIDE.md                  # User documentation
├── DEPLOYMENT.md                  # Deployment guide
├── ENVIRONMENT-VARS.md            # Env var reference
├── SELF-HOSTING.md                # Self-hosting guide
├── OPENAPI_SETUP.md               # API docs setup
│
├── operations/                    # Operations & runbooks
│   ├── OPERATIONS.md
│   ├── ON_CALL_RUNBOOK.md
│   ├── TROUBLESHOOTING.md
│   ├── BACKUP-RESTORE.md
│   └── DATABASE-ROLLBACK.md
│
├── features/                      # Feature subsystem suites
│   ├── hunter-protocol/
│   │   ├── HUNTER-PROTOCOL.md
│   │   ├── HUNTER-PROTOCOL-ARCHITECTURE.md
│   │   ├── HUNTER-PROTOCOL-USER-GUIDE.md
│   │   └── JOB-INTEGRATION-GUIDE.md
│   └── artifact-system/
│       ├── ARTIFACT_SYSTEM_API_GUIDE.md
│       ├── ARTIFACT_SYSTEM_USER_GUIDE.md
│       ├── ARTIFACT_SYSTEM_DEPLOYMENT.md
│       └── ARTIFACT_SYSTEM_OPERATIONS.md
│
├── phases/                        # Completed phase/milestone reports
│   └── (20 phase completion documents)
│
├── adr/                           # Architecture Decision Records
│   └── (013 ADRs: 000-index through 012-*)
│
└── archived/                      # Historical documents
    ├── foundations/               # FOUND-001 through FOUND-005
    ├── specifications/            # SPEC-001 through SPEC-004
    ├── architecture/              # ARCH-001 through ARCH-005
    ├── planning/                  # PLAN-001 through PLAN-006
    ├── orchestration/             # ORCH-001 through ORCH-005
    ├── workflows/                 # WORK-001 through WORK-005
    ├── meta/                      # META-001 through META-004
    ├── completions/               # Phase/workstream completion reports
    ├── reports/                   # Test reports and audits
    └── guides/                    # Historical guides and tracking
```

---

## Architecture Decision Records

The `adr/` directory contains 13 ADRs documenting key architectural choices:

- **ADR-000**: [Index](./adr/000-index.md) - Overview and template
- **ADR-001**: [Monorepo Structure](./adr/001-monorepo-structure.md)
- **ADR-002**: [Database Choice](./adr/002-postgresql-primary-database.md)
- **ADR-003**: [Redis Caching](./adr/003-redis-caching-queue.md)
- **ADR-004**: [Local-First LLM](./adr/004-local-llm-ollama.md)
- **ADR-005**: [Mask-Based Identity](./adr/005-mask-based-identity.md)
- **ADR-006**: [Next.js Frontend](./adr/006-nextjs-frontend.md)
- **ADR-007-012**: Additional decisions (see [index](./adr/000-index.md))

---

## Feature Systems

### Hunter Protocol
Job discovery and tracking system with webhook support.

- [Overview](./features/hunter-protocol/HUNTER-PROTOCOL.md)
- [Architecture](./features/hunter-protocol/HUNTER-PROTOCOL-ARCHITECTURE.md)
- [User Guide](./features/hunter-protocol/HUNTER-PROTOCOL-USER-GUIDE.md)
- [Integration Guide](./features/hunter-protocol/JOB-INTEGRATION-GUIDE.md)

### Artifact System
File and document management with version control.

- [API Guide](./features/artifact-system/ARTIFACT_SYSTEM_API_GUIDE.md)
- [User Guide](./features/artifact-system/ARTIFACT_SYSTEM_USER_GUIDE.md)
- [Deployment](./features/artifact-system/ARTIFACT_SYSTEM_DEPLOYMENT.md)
- [Operations](./features/artifact-system/ARTIFACT_SYSTEM_OPERATIONS.md)

---

## Development Workflow

```bash
# Install dependencies
pnpm install

# Start dev services (Postgres, Redis)
scripts/dev-up.sh

# Run all dev servers (web, api, orchestrator)
pnpm dev

# Run tests
pnpm test                    # Unit tests
pnpm integration             # Integration tests
pnpm test:e2e                # End-to-end tests

# Type checking and linting
pnpm typecheck
pnpm lint

# Build production bundles
pnpm build
```

See [Developer Guide](./DEVELOPER_GUIDE.md) for complete workflow.

---

## Troubleshooting Quick Links

| Issue | Resource |
|-------|----------|
| Services won't start | [Troubleshooting](./operations/TROUBLESHOOTING.md#services) |
| Database connection errors | [Troubleshooting](./operations/TROUBLESHOOTING.md#database) |
| API authentication failures | [Troubleshooting](./operations/TROUBLESHOOTING.md#auth) |
| Build or type errors | [Developer Guide](./DEVELOPER_GUIDE.md#common-issues) |
| Production incidents | [On-Call Runbook](./operations/ON_CALL_RUNBOOK.md) |

---

## Contributing

See the root [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

All architectural changes require an ADR. Use the template in [adr/000-index.md](./adr/000-index.md).

---

## License

See root [LICENSE](../LICENSE) file.

# in–midst–my-life

**Interactive CV/Résumé System**: A blockchain-inspired, mask-based identity platform for dynamic professional narratives.

## 🌍 Project Overview

This project transforms the static CV into a **living, queryable, multi-dimensional identity system**.
- **Blockchain Analogy**: The CV is an immutable ledger (complete history), while a résumé is a derived state snapshot (context-specific view).
- **Identity Masks**: Uses "masks" (e.g., Analyst, Architect, Narrator) to filter and project identity based on context.
- **Temporal Epochs**: Organizes professional life into meaningful periods (Initiation → Mastery → Legacy).
- **Autonomous Growth**: Designed to be a self-growing codebase managed by a multi-agent system.

## 🏗️ Architecture & Tech Stack

This is a **monorepo** managed with `pnpm` and `turbo`.

- **Frontend**: Next.js 15, React Server Components, TailwindCSS (`apps/web`)
- **Backend**: Node.js 22+, TypeScript, Fastify/Node services (`apps/api`, `apps/orchestrator`)
- **Database**: PostgreSQL (Primary), Redis (Caching/Queues)
- **Infrastructure**: Docker Compose (Dev), Kubernetes/Helm (Prod)
- **Testing**: Vitest

### Structure
```
├── apps/
│   ├── api/            # Backend API service
│   ├── orchestrator/   # Autonomous agent orchestration
│   └── web/            # Next.js frontend application
├── packages/
│   ├── content-model/  # Content definitions (LLM, JSON-LD)
│   ├── core/           # Core business logic (Errors, Crypto, Masks, Jobs)
│   ├── design-system/  # Shared UI components
│   └── schema/         # Zod schemas & types (Source of Truth)
├── docs/               # Extensive design documentation
└── scripts/            # Dev utility scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js v22+
- pnpm
- Docker & Docker Compose

### Setup
1.  **Install dependencies**:
    ```bash
    pnpm install
    ```
2.  **Start Infrastructure** (Postgres & Redis):
    ```bash
    ./scripts/dev-up.sh
    ```
    *Use `./scripts/dev-shell.sh` to access the database or Redis CLI.*

3.  **Run Development Server**:
    ```bash
    pnpm dev
    ```
    *Starts all apps via Turbo.*

## 🛠️ Development Workflow

### Key Commands

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start all applications in development mode. |
| `pnpm build` | Build all apps and packages. |
| `pnpm test` | Run tests across the workspace (Vitest). |
| `pnpm lint` | Lint all code. |
| `pnpm typecheck` | Run TypeScript type checking. |
| `pnpm --filter <pkg> <cmd>` | Run a command for a specific package/app (e.g., `pnpm --filter web dev`). |
| `docker-compose up` | Start full stack (API + Orchestrator + Web + DBs). |

### Database Management
*Commands generally scoped to `apps/api` or `apps/orchestrator`*
- **Migrate**: `pnpm --filter @in-midst-my-life/api migrate`
- **Seed**: `pnpm --filter @in-midst-my-life/api seed`

### Standards & Constraints
- **`seed.yaml`**: This file acts as the repository's "genome," defining strict constraints and roles. **Always respect the rules defined here.**
- **Conventions**:
    - Strict TypeScript.
    - Schema-first design (define Zod schemas in `packages/schema` before implementing).
    - 75% minimum test coverage.

## 📚 Documentation Map

The `docs/` folder (and root) contains a comprehensive "Project Bible" organized by prefix:

- **`FOUND-*`**: Foundational concepts (Philosophy, Identity questions).
- **`SPEC-*`**: Technical specifications (Data schema, System design).
- **`ARCH-*`**: Architecture (Repository layout, CI/CD).
- **`PLAN-*`**: Roadmap and task breakdowns.
- **`WORK-*`**: Workflows (Automation, Content pipeline).
- **`ORCH-*`**: Orchestration (Agent strategies).
- **`META-*`**: Project organization and "Bible".

## 🧠 System Context (Recent Updates)

**Latest Evolution: Phase 11 (The Hunter Protocol)**

1.  **Resilience & Semantics (Complete)**
    - **Robust Error Handling**: Centralized `RetryableError` and `FatalError` handling in Orchestrator.
    - **JSON-LD**: Dynamic injection of `schema.org/Person` and `WorkExperience` for SEO.

2.  **Hunter Protocol (In Progress)**
    - **Foundation**: `JobPosting` and `JobApplication` schemas defined.
    - **API**: `apps/api` now supports job posting storage and application tracking.
    - **Next Step**: Implementing the `JobSearchProvider` and the autonomous `Hunter` agent.

*Refer to `MANIFEST.md` for a complete index and `TODO-EXHAUSTIVE.md` for active tasks.*

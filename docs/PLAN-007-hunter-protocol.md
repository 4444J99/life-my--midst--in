# PLAN-007: Hunter Protocol (Autonomous Job Search)

**Track**: Stream 0A (Parallel Execution)
**Status**: Backend Complete (100%) | Frontend Complete (100%) | Intelligence Pending

## Overview
The Hunter Protocol is an autonomous agent system designed to reverse the job search dynamic. Instead of manually applying, the user configures the "Hunter" agent to:
1.  **Scout**: Automatically search job boards (via Serper/Google) for roles matching specific criteria.
2.  **Analyze**: Perform RAG-based skill gap analysis on every lead.
3.  **Tailor**: Select the optimal "Mask" (identity projection) for the role.
4.  **Apply**: Generate specific, non-generic cover letters and resumes.

## Architecture

### 1. The Hunter Agent (`apps/orchestrator/src/agents/hunter.ts`)
- **Role**: `hunter`
- **Tools**:
    - `find_jobs(keywords, location)`: Aggregates results from search providers.
    - `analyze_gap(job, profile)`: Returns compatibility score (0-100) and missing skills.
    - `tailor_resume(job, profile)`: Returns `maskId` and `experienceIds` to highlight.
    - `write_cover_letter(job, profile)`: Generates markdown content.

### 2. The Scheduler (`apps/orchestrator/src/job-hunt-scheduler.ts`)
- Runs as a background service in the Orchestrator.
- Configurable frequency (Daily/Weekly).
- Maintains state of "Last Run" to avoid spamming APIs.

### 3. Data Layer (`apps/api/src/repositories/jobs.ts`)
- **Storage**: PostgreSQL (migrated from in-memory).
- **Entities**:
    - `JobPosting`: The raw lead (Title, Company, URL, Vectors).
    - `JobApplication`: The state of the attempt (Draft, Applied, Interviewing).

### 4. Frontend Interface (`apps/web/src/app/hunter`)
- **Visual Control**: `/hunter` dashboard with `NeoCard` design system.
- **Modes**:
    - **Manual Search**: Real-time search and analysis.
    - **Auto-Pilot**: Configure and manage background "Hunts" (scheduler).
- **Components**: `HunterDashboard.tsx` integrates Search, Analysis, and Scheduling.

---

## Execution Plan

### Phase 1: Backend Hardening (✅ Complete)
- [x] Implement `HunterAgent` logic.
- [x] Register agent in `agent-registry.json`.
- [x] Create `JobHuntScheduler` for automation.
- [x] Create Postgres migrations (`009_hunter_protocol.sql`).
- [x] Create `JobRepo` and wire into API routes.

### Phase 2: Frontend Interface (✅ Complete)
- [x] Create API proxies in Next.js (`/api/hunter/*`, `/api/scheduler/*`).
- [x] Implement `HunterDashboard` with `NeoCard` styling.
- [x] Create `/hunter` page.
- [x] Add Scheduler configuration UI (Auto-Pilot tab).

### Phase 3: Intelligence & RAG (TODO)
**Goal**: Make the analysis actually smart.

- [ ] **Vector Search**: Use `pgvector` on `job_postings.description`.
- [ ] **LLM refinement**: Tune the `analyze_gap` prompt to be less generic.
- [ ] **Resume Tailoring Logic**: Implement the actual logic to hide/show experience blocks based on relevance.

### Phase 4: Integration Test
**Script**: `scripts/test-hunter-loop.ts`
1.  Create dummy profile.
2.  Trigger "Find Jobs" (mock provider).
3.  Assert 3 jobs found.
4.  Assert 3 applications created in "Draft" state.
5.  Assert cover letters contain specific keywords from job description.
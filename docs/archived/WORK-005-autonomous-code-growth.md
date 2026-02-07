# Automating Code Growth

> **⚠️ ARCHIVED — HISTORICAL SNAPSHOT**
> This document was written during early design (Nov 2025). CI workflows,
> automation, and code-growth pipelines described as "Planned" are now
> implemented. See
> [`docs/FEATURE-AUDIT.md`](../FEATURE-AUDIT.md) for current state.

**User:** Anthony Padavano (padavano.anthony@gmail.com)
**Created:** 11/27/2025 15:43:14
**Updated:** 11/27/2025 15:50:17
**Exported:** 12/26/2025 13:39:13  
**Link:** [https://chatgpt.com/g/g-p-692604860ac48191a223bf20aeb4ce69-in-midst-my-life/c/6928b7e0-a6a0-832e-b666-3ca8909dd832](https://chatgpt.com/g/g-p-692604860ac48191a223bf20aeb4ce69-in-midst-my-life/c/6928b7e0-a6a0-832e-b666-3ca8909dd832)  

## Status (Planned vs Implemented)
- Implemented: Agents, prompts, task queue, run persistence + scheduler loop, GitHub webhook parsing, and LLM adapters are in place.
- Planned: CI-triggered cycles, reviewer/tester gating, auto-PR creation, and merge governance.

## Prompt:
my aim is to take a seed (set of expansive/explosive info/data), packaged w just the right info and planted in just the right location, and watch it grow autonomously, mirroring GitHub automation workflows, magically combing through code and the disparate, AI bots call out and correct one another writing thousands and thousands of lines of code; how do we achieve this?

## Response:
You get this by treating the repo as a living system, not a pile of files: you define how it grows, what “good” looks like, and then wire AI + CI/CD around that. Concretely, it breaks down into 7 pieces.

* * *

1\. Define the “seed” as a formal object, not just “some data”
--------------------------------------------------------------

Your seed needs to be machine-legible and _constraining_. Think of it as a genome for the repo.

At minimum, the seed should include:

1.  **Domain + scope**
    *   Problem statement
    *   Non-goals
    *   Target users and environments
2.  **Architecture skeleton**
    *   Directory layout
    *   Key modules/interfaces (even if empty)
    *   Tech stack and versions (locked)
3.  **Normative rules**
    *   Coding standards
    *   Design patterns allowed/disallowed
    *   Performance / latency / memory constraints
    *   Security/privacy constraints
4.  **Growth objectives**
    *   Backlog of “epic” capabilities (high-level)
    *   Constraints on repo size, complexity, and external deps
    *   Quality bars: test coverage %, lint rules, CI must-pass matrix
5.  **Evaluation contract**
    *   How correctness is judged (specs, examples, invariants)
    *   How regressions are detected
    *   What signals count as “reward” (e.g., more passing tests, improved complexity, fewer lints)

This seed should live as structured files: `seed.yaml`, `architecture.md`, `CONTRIBUTING.md`, `tests/specs/*.md`, etc., so agents and workflows can parse it.

* * *

2\. Multi-agent roles that “call out and correct one another”
-------------------------------------------------------------

You want a crew that behaves more like a team than a single monolithic model. Typical minimal set:

1.  **Architect Agent**
    *   Reads the seed and current repo
    *   Maintains/updates a high-level roadmap and design docs
    *   Breaks work into atomic tasks (“tickets”)
2.  **Implementer Agent**
    *   Given a ticket + constraints, writes or edits code
    *   Uses local context windows to avoid hallucinating completely new subsystems
3.  **Reviewer Agent**
    *   Runs static analysis, lints, tests for the change
    *   Comments on diffs, requests changes
    *   Enforces repository style and architectural constraints
4.  **Tester / Fuzzer Agent (optional but powerful)**
    *   Generates new tests from specs, examples, and bug history
    *   Tries to break what the Implementer just wrote
5.  **Maintainer / Governor Agent**
    *   Enforces global constraints: dependency creep, architecture drift, complexity thresholds
    *   Decides if a change is allowed to be merged at all

These agents should:

*   Share **a common state** (repo snapshot, open tickets, metrics).
*   Communicate via a **task graph**, not ad-hoc prompts.
*   Operate inside strict **permission boundaries** (e.g., Implementer cannot merge; only Maintainer can).

* * *

3\. The orchestration layer: where the “magic” actually happens
---------------------------------------------------------------

Instead of “just GitHub Actions calling an LLM,” use an explicit _workflow engine_ or agent framework:

*   A graph of tasks:
    *   `Architect → Implementer → Reviewer → Tester → Maintainer`
*   Task node types:
    *   `PLANNING`, `CODING`, `ANALYSIS`, `EVAL`, `MERGE_DECISION`
*   Edges:
    *   Sequential (Implementer after Architect)
    *   Conditional (if tests fail → back to Implementer with review feedback)
    *   Parallel (multiple Implementers on independent tickets)

Key responsibilities of this orchestrator:

1.  **State management**
    *   Source of truth for:
        *   Current repo revision (commit hash)
        *   Open tickets & their statuses
        *   Quality metrics (coverage, linters, performance benchmarks)
2.  **Tooling integration**
    *   File system operations (read/write diffs, not raw blobs)
    *   Git operations (branch, commit, push, PR)
    *   CI status checks
3.  **Execution policy**
    *   Max number of concurrent tickets
    *   Budget: tokens, time, infra per cycle
    *   Priority rules (bugs > features; regressions > everything)

This can be implemented with an existing framework (LangGraph, Crew-style, or a lightweight custom orchestrator) as long as it has:

*   Persistent state,
*   Deterministic transitions,
*   And a clear way to schedule/trigger agent runs.

* * *

4\. GitHub as the “soil”: events become growth triggers
-------------------------------------------------------

GitHub (or any VCS + CI) is where the system roots itself. You wire it so that repo events and timers trigger the orchestration:

**Key triggers:**

1.  **On push to `main` / `develop`**
    *   Orchestrator updates its repo snapshot.
    *   Runs a “health scan” (tests, coverage, static analysis).
    *   If health degrades, issues tickets to fix regressions.
2.  **On open issue labeled `auto-task`**
    *   Architect Agent breaks it down into subtasks.
    *   Spawns Implementer → Reviewer → Tester chain for each.
3.  **On schedule (e.g., hourly / per energy unit)**
    *   Architect Agent scans for:
        *   TODOs,
        *   Low coverage areas,
        *   Unoptimized or “smelly” modules.
    *   Seeds new tickets to grow the system.
4.  **On failed CI**
    *   Spawns “triage” tasks:
        *   Find offending change.
        *   Propose minimal patch.
        *   Run targeted tests.

In GitHub Actions terms, each trigger sends a structured payload to the orchestrator (e.g., via webhook), which then decides which agent(s) to run and what view of the repo to provide.

* * *

5\. Autonomous code generation loop (the “thousands of lines” machine)
----------------------------------------------------------------------

At a high level the loop looks like:

1.  **Sense**
    *   Read current repo (via shallow index, not full dump).
    *   Collect metrics (coverage, complexity, performance, static analysis output).
    *   Ingest open issues / tickets.
2.  **Plan**
    *   Architect Agent updates or creates a roadmap slice for this cycle.
    *   Selects a small subset of tasks (do not generate infinite, unfocused changes).
3.  **Act**
    *   Implementer Agent:
        *   Clones repo into an ephemeral workspace.
        *   Applies changes via an AST-aware tool or patch generator.
        *   Produces a clean diff.
4.  **Critique**
    *   Reviewer Agent:
        *   Reads diff + tests + style guides.
        *   Annotates problems; if severe, rejects and returns to Implementer with explicit instructions.
5.  **Test**
    *   Run tests in a sandbox (container/VM).
    *   Tester Agent may create or refine tests based on the spec and recent changes.
6.  **Decide**
    *   Maintainer Agent + CI gates:
        *   If all metrics satisfy constraints → auto-merge or open PR for human approval.
        *   If not → back to Architect/Implementer with structured feedback.
7.  **Log**
    *   Every cycle updates:
        *   A growth log (`AUTOGEN_LOG.md`),
        *   Metrics history,
        *   And potentially a visualization of the system’s evolution.

This loop can run continuously or in discrete “energy units” (e.g., “spend N tokens / N cycles then stop”), which maps nicely to your “effort/energy-based timeline” idea.

* * *

6\. Control, safety, and preventing degenerate growth
-----------------------------------------------------

If you just let it run, you get spaghetti at scale. To keep growth meaningful:

1.  **Hard constraints**
    *   No writes outside defined directories.
    *   Dependencies whitelist (no random new packages).
    *   Max file size / function length.
    *   Coverage must not decrease compared to baseline.
2.  **Architectural invariants**
    *   Enforced via:
        *   Architecture lints (e.g., “modules in `core` cannot import `ui`”).
        *   Automated checks that run before allowing merge.
3.  **Change budgets**
    *   Per cycle:
        *   Max number of lines changed.
        *   Max number of files touched.
    *   Forces small, reviewable, reversible steps.
4.  **Human-in-the-loop checkpointing**
    *   Certain operations require explicit human sign-off:
        *   New external service integrations.
        *   Schema migrations.
        *   Changes to security-critical modules.
5.  **Reward shaping**
    *   Make the agents “prefer”:
        *   Increasing test coverage.
        *   Reducing cyclomatic complexity.
        *   Eliminating duplicated code.
    *   Even though they are not truly “learning” online, you can encode these preferences into the system’s prompts and decision rules.

* * *

7\. Practical implementation roadmap (you could start this now)
---------------------------------------------------------------

Given everything above, here is a concrete build sequence:

1.  **Phase 0 – Seed and repo skeleton**
    *   Define `seed.yaml` / `architecture.md` / `CONTRIBUTING.md`.
    *   Create the monorepo structure you already outlined for the interactive CV project.
    *   Add a minimal but strict CI (lint + tests + type checks).
2.  **Phase 1 – Single-agent “auto PR” prototype**
    *   One agent that:
        *   Reads seed + repo.
        *   Picks a small, pre-defined task (e.g., add tests to module X).
        *   Opens a PR via GitHub API.
    *   CI enforces constraints. You remain the human reviewer.
3.  **Phase 2 – Add Review + Test agents**
    *   Introduce Reviewer Agent that:
        *   Runs in CI on PRs.
        *   Comments on diffs, suggests changes.
    *   Introduce Tester Agent that:
        *   Suggests or generates missing tests for changed code.
    *   These agents do not yet auto-merge; they just enrich PRs.
4.  **Phase 3 – Full multi-agent orchestrator**
    *   Implement the task graph:
        *   Architect → Implementer → Reviewer → Tester → Maintainer.
    *   Use a workflow engine / agent framework to persist state and manage transitions.
    *   Wire GitHub webhooks to orchestrator; orchestrator to GitHub PR API.
5.  **Phase 4 – Controlled autonomous growth**
    *   Enable Maintainer Agent to approve and auto-merge _only_ within:
        *   Sandbox branches.
        *   Pre-approved modules.
    *   Monitor metrics over time; adjust constraints.
6.  **Phase 5 – Open-ended expansion**
    *   Once stable:
        *   Allow the system to propose new capabilities based on usage, gaps, or externally ingested specs.
        *   Integrate with external knowledge (docs, issues, telemetry) so the repo evolves in response to reality, not just internal rules.

* * *

If you like, next step I can:

*   Draft the **seed schema** (as a concrete `seed.yaml`),
*   And sketch a **minimal orchestrator spec** (functions, events, and state shape)  
    tailored to your interactive CV monorepo so you can actually spin up Phase 1 and 2.

## Prompt:
•	Draft the seed schema (as a concrete seed.yaml),
	•	And sketch a minimal orchestrator spec (functions, events, and state shape)
tailored to your interactive CV monorepo so you can actually spin up Phase 1 and 2.

## Response:
Here is a concrete starting point you can drop into the monorepo: a `seed.yaml` at the root, plus a minimal orchestrator spec you can implement in Phase 1–2.

* * *

1\. `seed.yaml` – concrete schema
---------------------------------

Place this at the repo root: `seed.yaml`.

```yaml
version: 1

project:
  name: "in--midst--my-life"
  codename: "interactive-cv"
  description: >
    An interactive, mask-based CV/résumé system that behaves like a living,
    queryable, multi-perspective profile rather than a static document.
  owners:
    - handle: "4444jjP"
      role: "product-architecture"
  repo:
    monorepo: true
    package_manager: "pnpm"
    apps:
      - name: "web"
        path: "apps/web"
        type: "nextjs"
      - name: "api"
        path: "apps/api"
        type: "fastify"
      - name: "orchestrator"
        path: "apps/orchestrator"
        type: "node-service"
    packages:
      - name: "schema"
        path: "packages/schema"
      - name: "core"
        path: "packages/core"
      - name: "content-model"
        path: "packages/content-model"
      - name: "design-system"
        path: "packages/design-system"

domain:
  problem_statement: >
    Represent a person's identity and history as a structured,
    queryable, temporal, mask-based data model that can be rendered
    into many narrative forms (CV, résumé, portfolio, academic profile).
  non_goals:
    - "General-purpose social network"
    - "Anonymous multi-user identity marketplace"
  personas:
    - id: "owner-self"
      description: "The subject of the CV configuring masks, timelines, outputs."
    - id: "expert-reviewer"
      description: "Hiring manager, committee member, or curator consuming outputs."
    - id: "automation-layer"
      description: "AI/agents transforming the source-of-truth into views."

architecture:
  style: "modular-monorepo"
  tech_stack:
    language: "TypeScript"
    runtime:
      - "Node 22"
      - "Edge runtime where appropriate"
    frontend:
      - "Next.js 15"
      - "React Server Components"
    backend:
      - "Node service for orchestrator"
      - "REST/JSON APIs initially, later GraphQL optional"
    database:
      primary: "PostgreSQL"
      migrations: "raw-sql"  # Direct SQL via pg.Pool (see ADR-004)
    infra:
      hosting: "Vercel for web"
      api_hosting: "Fly.io or similar"
  modules:
    # High-level module contracts the agents should respect.
    schema_module:
      path: "packages/schema"
      responsibilities:
        - "Define canonical data model for identity, masks, stages, epochs."
        - "Provide Zod/JSON Schema for all core entities."
      public_api:
        - "getSchema()"
        - "validateProfile(profileJson)"
    content_module:
      path: "packages/content-model"
      responsibilities:
        - "Map schema entities to narrative blocks/fragments."
        - "Handle mask/stage/epoch selection logic."
      public_api:
        - "buildNarrative(profile, viewConfig)"
    web_app:
      path: "apps/web"
      responsibilities:
        - "Interactive UI for editing masks, stages, and temporal arcs."
        - "Rendering narrative views for different audiences."
    api_app:
      path: "apps/api"
      responsibilities:
        - "CRUD API for profile data."
        - "Endpoints for AI agents to read/write structured content."
    orchestrator_app:
      path: "apps/orchestrator"
      responsibilities:
        - "Implements multi-agent workflow."
        - "Integrates with GitHub webhooks and CI."

coding_standards:
  language: "TypeScript"
  tsconfig:
    strict: true
    noImplicitAny: true
  style:
    formatter: "prettier"
    linter: "eslint"
    naming:
      types: "PascalCase"
      functions: "camelCase"
      constants: "SCREAMING_SNAKE_CASE"
  patterns:
    allowed:
      - "hexagonal / ports-and-adapters"
      - "functional core, imperative shell"
      - "schema-first design"
    forbidden:
      - "Business logic inside React components beyond light orchestration"
      - "Cross-module imports that bypass defined APIs"
  documentation:
    required_for:
      - "All public functions in packages/*"
      - "All schema definitions"
    format: "TSDoc"

quality_gates:
  ci_required_checks:
    - "lint"
    - "typecheck"
    - "test"
  coverage:
    global_minimum: 0.75   # 75%
    critical_paths:
      - path: "packages/schema"
        minimum: 0.9
      - path: "packages/core"
        minimum: 0.85
  performance:
    budgets:
      web_lcp_ms: 2500
      api_p50_ms: 300
      api_p95_ms: 1000
  security:
    dependency_policy:
      allowlist_mode: true
      allowlisted_packages:
        - "zod"
        - "pg"  # Direct SQL access (see ADR-004)
        - "@tanstack/react-query"
        - "next"
        - "react"
        - "openai"
    secrets:
      management: "environment-variables-and-host-secrets"
      rules:
        - "No secrets committed to repo."
        - "Use dotenv only for local dev."

growth_objectives:
  roadmap_epics:
    - id: "schema-v1"
      title: "Canonical identity & mask schema"
      description: "Lock a first version of the schema for identity, masks, stages, and periods."
      modules:
        - "packages/schema"
        - "packages/content-model"
    - id: "editor-v1"
      title: "Mask & timeline editor"
      description: "Interactive UI for defining and switching between masks and stages."
      modules:
        - "apps/web"
    - id: "render-v1"
      title: "CV/Résumé narrative generator"
      description: "Generate static outputs for different audiences from the same source data."
      modules:
        - "packages/content-model"
        - "apps/api"
  priorities:
    - "Stabilize schema before complex UI."
    - "Maximize test coverage for schema and narrative engine."
    - "Keep infra minimal until core value is proven."

constraints:
  repo:
    max_lines_per_file: 400
    max_function_length_loc: 60
  dependencies:
    max_new_dependencies_per_pr: 1
    require_issue_link_for_new_dependency: true
  modules:
    forbidden_imports:
      - from: "apps/web"
        to: "packages/*"
      - from: "packages/schema"
        to: "apps/*"

evaluation:
  correctness:
    primary_sources:
      - "schemas in packages/schema"
      - "spec docs under docs/specs/*.md"
    invariants:
      - "All persisted data must validate against schema."
      - "Narrative generation must not mutate input profile."
  regression_detection:
    mechanisms:
      - "CI test suite"
      - "Snapshot tests for narrative renderers"
  reward_signals:
    - "Increased test coverage in critical paths."
    - "Reduced lint violations."
    - "Reduced cyclomatic complexity in core modules."

automation_contract:
  ai_access:
    read_paths:
      - "apps/*"
      - "packages/*"
      - "docs/*"
    write_paths:
      - "packages/schema/**"
      - "packages/content-model/**"
      - "packages/core/**"
      - "apps/web/src/**"
      - "apps/api/src/**"
    disallowed_writes:
      - ".github/workflows/**"
      - "infra/**"
      - "seed.yaml"
  task_labels:
    auto_managed_labels:
      - "ai-task"
      - "ai-refactor"
      - "ai-test-gen"
  merge_policy:
    allow_auto_merge: false   # Phase 1–2: require human for final merge
    require_human_review_from:
      - "4444jjP"
```

This gives agents and orchestrator a tight contract: what the system is, where they’re allowed to touch it, and what “good” looks like.

* * *

2\. Minimal orchestrator spec (Phase 1–2)
-----------------------------------------

Treat the orchestrator as a small service with:

*   A **state store** (Postgres or even a JSON file + Git for v0),
*   A set of **event handlers**,
*   A **task pipeline** that calls out to LLM-backed agents.

### 2.1. Core data model (state)

You can express this as TypeScript interfaces in `apps/orchestrator/src/domain.ts`:

```ts
// High-level view of the repo at a point in time
export interface RepoSnapshot {
  id: string;              // e.g., commit SHA
  branch: string;
  timestamp: string;       // ISO
  url: string;             // Git remote
}

// A unit of work for the AI system
export type TaskType = "SCHEMA_TESTS" | "SCHEMA_FILL_GAPS" | "CONTENT_TESTS" | "CONTENT_REFACTOR";

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  createdAt: string;
  createdBy: "human" | "architect-agent" | "system";
  status: "pending" | "in_progress" | "completed" | "failed";
  repoSnapshotId: string;
  scopePaths: string[];    // e.g., ["packages/schema/src/**"]
  issueNumber?: number;    // link back to GitHub issue if any
}

// A single run of an agent on a task
export type AgentRole = "IMPLEMENTER" | "REVIEWER" | "TESTER";

export interface AgentRun {
  id: string;
  taskId: string;
  role: AgentRole;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "succeeded" | "failed";
  inputSummary: string;
  outputSummary?: string;
  diffRef?: string;        // link to a diff artifact or PR
  logsUrl?: string;
}

// Orchestrator-level configuration, read from seed.yaml
export interface OrchestratorConfig {
  allowedWritePaths: string[];
  autoMergeEnabled: boolean;
  coverageThresholds: Record<string, number>;
}
```

State can be as simple as:

*   `tasks` table / JSON,
*   `agent_runs` table / JSON,
*   `repo_snapshots` table / JSON.

For v0, storing this in a lightweight SQLite DB inside the orchestrator container is fine.

* * *

### 2.2. Events (inputs to the orchestrator)

Define a constrained set of event types. Again in TypeScript:

```ts
export type OrchestratorEvent =
  | PushEvent
  | IssueEvent
  | ScheduledEvent
  | CiStatusEvent;

export interface PushEvent {
  kind: "PUSH";
  repo: string;
  branch: string;
  commit: string;
}

export interface IssueEvent {
  kind: "ISSUE";
  repo: string;
  issueNumber: number;
  action: "OPENED" | "LABELED";
  labels: string[];
  title: string;
  body: string;
}

export interface ScheduledEvent {
  kind: "SCHEDULED";
  id: string;
  description: string;
}

export interface CiStatusEvent {
  kind: "CI_STATUS";
  repo: string;
  commit: string;
  status: "SUCCESS" | "FAILURE";
  checks: {
    name: string;
    status: "SUCCESS" | "FAILURE";
  }[];
}
```

Phase 1–2 only needs:

*   `ISSUE` (for issues labeled `ai-task`),
*   `SCHEDULED` (for periodic runs that look for low-hanging fruit).

* * *

### 2.3. Core orchestrator functions

In `apps/orchestrator/src/orchestrator.ts`:

```ts
import { OrchestratorEvent, Task, AgentRun } from "./domain";

// Entry point
export async function handleEvent(event: OrchestratorEvent): Promise<void> {
  switch (event.kind) {
    case "ISSUE":
      await handleIssueEvent(event);
      break;
    case "SCHEDULED":
      await handleScheduledEvent(event);
      break;
    case "CI_STATUS":
      await handleCiStatusEvent(event);
      break;
    case "PUSH":
      // optional for Phase 1–2
      break;
  }
}

// Phase 1: single IMPLEMENTER agent that opens a PR
async function handleIssueEvent(event: IssueEvent) {
  if (!event.labels.includes("ai-task")) return;

  const snapshot = await captureRepoSnapshot(event.repo, "main");
  const task: Task = await createTaskFromIssue(event, snapshot);

  // IMPLEMENTER agent produces a diff + PR
  const run: AgentRun = await runImplementerAgent(task, snapshot);

  // For Phase 1, stop here; human reviews PR.
}

// Phase 2: scheduled runs to add tests/refinement
async function handleScheduledEvent(event: ScheduledEvent) {
  const snapshot = await captureRepoSnapshot("interactive-cv", "main");
  const tasks = await selectAutomationTasks(snapshot);
  for (const task of tasks) {
    const implRun = await runImplementerAgent(task, snapshot);
    const reviewRun = await runReviewerAgent(task, snapshot, implRun);
    const testRun = await runTesterAgent(task, snapshot, implRun);

    await openOrUpdatePullRequest({ task, implRun, reviewRun, testRun });
  }
}

async function handleCiStatusEvent(event: CiStatusEvent) {
  // Optional for Phase 2: auto-comment on failing PRs, or mark tasks as failed/passed
}
```

Each `run*Agent` function is a thin wrapper around an LLM call with:

*   A prompt built from:
    *   `seed.yaml`,
    *   the task description,
    *   the relevant code paths and tests.

For example, `runImplementerAgent`:

```ts
async function runImplementerAgent(task: Task, snapshot: RepoSnapshot): Promise<AgentRun> {
  // 1. Materialize a temp working copy of the repo at snapshot.id
  // 2. Collect context: files under task.scopePaths, docs/specs relevant to task.type
  // 3. Call LLM with a system prompt that:
  //    - enforces allowed write paths (from seed.yaml)
  //    - enforces coding_standards and constraints
  // 4. Apply the diff suggested by the LLM to the working copy
  // 5. Run `pnpm lint`, `pnpm test` locally
  // 6. If successful, push branch and open PR; attach PR URL to AgentRun
}
```

Similarly, `runReviewerAgent`:

```ts
async function runReviewerAgent(
  task: Task,
  snapshot: RepoSnapshot,
  implRun: AgentRun
): Promise<AgentRun> {
  // 1. Fetch the PR diff for implRun
  // 2. Run static checks (lint, typecheck) and parse output
  // 3. Call LLM REVIEWER agent with:
  //    - diff
  //    - lint/type errors
  //    - relevant segments of seed.yaml (coding_standards, quality_gates)
  // 4. Post comments to PR via GitHub API
}
```

For Phase 2, the Tester agent is similar but focused on:

*   Reading changed files and existing tests,
*   Generating additional tests,
*   Opening a follow-up commit or PR suggestion.

* * *

### 2.4. GitHub Actions integration (Phase 1–2)

Add a minimal workflow, e.g. `.github/workflows/orchestrator.yml`:

```yaml
name: orchestrator-events

on:
  issues:
    types: [opened, labeled]
  schedule:
    - cron: "0 * * * *"  # hourly, tune as desired

jobs:
  send-to-orchestrator:
    runs-on: ubuntu-latest
    steps:
      - name: Send event to orchestrator
        env:
          ORCHESTRATOR_URL: ${{ secrets.ORCHESTRATOR_URL }}
          GITHUB_EVENT_PATH: ${{ github.event_path }}
          GITHUB_EVENT_NAME: ${{ github.event_name }}
        run: |
          curl -X POST "$ORCHESTRATOR_URL/events" \
            -H "Content-Type: application/json" \
            -d @${GITHUB_EVENT_PATH}
```

The orchestrator’s `/events` endpoint:

*   Parses GitHub’s raw event JSON,
*   Normalizes it into an `OrchestratorEvent`,
*   Calls `handleEvent`.

* * *

### 2.5. What you can implement immediately

1.  **Create `seed.yaml`** (above) at the repo root and adjust details.
2.  **Create `apps/orchestrator`** with:
    *   `domain.ts` (types),
    *   `orchestrator.ts` (event handling & stubs for `runImplementerAgent`, etc.).
3.  **Add `orchestrator.yml`** workflow to send events.
4.  Implement **Phase 1**:
    *   Only handle `ISSUE` events with label `ai-task`.
    *   `runImplementerAgent` → LLM → branch + PR.
    *   No Reviewer/Tester yet; human does that.
5.  Extend to **Phase 2**:
    *   Add `SCHEDULED` events to trigger test-generation/refactor tasks under `packages/schema` and `packages/content-model`.
    *   Implement Reviewer/Tester agent wrappers.

If you want, next pass I can turn the orchestrator skeleton into concrete TypeScript files (with minimal implementations and placeholder LLM tooling) that drop directly into `apps/orchestrator`.

## Prompt:
turn the orchestrator skeleton into concrete TypeScript files (with minimal implementations and placeholder LLM tooling) that drop directly into apps/orchestrator;
get us to a place to login to GitHub, and drop into copilot agent chat and they take it from there ;

## Response:
Below is a concrete, drop-in `apps/orchestrator` skeleton plus a minimal GitHub Actions bridge so that once you push to GitHub you can open Copilot Chat on the repo and iterate from there.

You can paste these into your monorepo as-is and then let Copilot refine each file.

* * *

Directory layout
----------------

Under your existing monorepo, add:

```text
apps/
  orchestrator/
    package.json
    tsconfig.json
    src/
      index.ts
      server.ts
      domain.ts
      orchestrator.ts
      agents/
        implementer.ts
        reviewer.ts
        tester.ts
    .env.example
```

Plus one workflow at the root:

```text
.github/
  workflows/
    orchestrator-events.yml
```

* * *

`apps/orchestrator/package.json`
--------------------------------

```json
{
  "name": "@in-midst-my-life/orchestrator",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "body-parser": "^1.20.3",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "@types/body-parser": "^1.19.5",
    "@types/express": "^4.17.21",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.6.3"
  }
}
```

* * *

`apps/orchestrator/tsconfig.json`
---------------------------------

If you already have a root `tsconfig.json`, you can extend it. Otherwise, use this as a standalone.

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "commonjs",
    "target": "ES2020",
    "esModuleInterop": true,
    "strict": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

If `../../tsconfig.base.json` does not exist, either create one or remove the `extends` line.

* * *

`apps/orchestrator/.env.example`
--------------------------------

```bash
ORCHESTRATOR_PORT=4000

# Optional, for future integration
GITHUB_TOKEN=ghp_your_token_here
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3.1:8b
```

* * *

`apps/orchestrator/src/domain.ts`
---------------------------------

```ts
// Core domain types for the orchestrator

export interface RepoSnapshot {
  id: string; // commit SHA or synthetic ID
  branch: string;
  timestamp: string; // ISO8601
  url: string;
}

// Task types you want to start automating
export type TaskType =
  | "SCHEMA_TESTS"
  | "SCHEMA_FILL_GAPS"
  | "CONTENT_TESTS"
  | "CONTENT_REFACTOR";

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  createdAt: string;
  createdBy: "human" | "architect-agent" | "system";
  status: "pending" | "in_progress" | "completed" | "failed";
  repoSnapshotId: string;
  scopePaths: string[]; // e.g., ["packages/schema/src/**"]
  issueNumber?: number;
}

export type AgentRole = "IMPLEMENTER" | "REVIEWER" | "TESTER";

export interface AgentRun {
  id: string;
  taskId: string;
  role: AgentRole;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "succeeded" | "failed";
  inputSummary: string;
  outputSummary?: string;
  diffRef?: string; // e.g. PR URL or branch name
  logsUrl?: string;
}

// Orchestrator config derived from seed.yaml, simplified for now
export interface OrchestratorConfig {
  allowedWritePaths: string[];
  autoMergeEnabled: boolean;
  coverageThresholds: Record<string, number>;
}

// Events the orchestrator understands

export type OrchestratorEvent =
  | PushEvent
  | IssueEvent
  | ScheduledEvent
  | CiStatusEvent;

export interface PushEvent {
  kind: "PUSH";
  repo: string;
  branch: string;
  commit: string;
}

export interface IssueEvent {
  kind: "ISSUE";
  repo: string;
  issueNumber: number;
  action: "OPENED" | "LABELED";
  labels: string[];
  title: string;
  body: string;
}

export interface ScheduledEvent {
  kind: "SCHEDULED";
  id: string;
  description: string;
}

export interface CiStatusEvent {
  kind: "CI_STATUS";
  repo: string;
  commit: string;
  status: "SUCCESS" | "FAILURE";
  checks: {
    name: string;
    status: "SUCCESS" | "FAILURE";
  }[];
}
```

* * *

`apps/orchestrator/src/agents/implementer.ts`
---------------------------------------------

Placeholder LLM/agent integration for Phase 1. Right now it just logs and returns a dummy run; Copilot can be asked to “fill in the LLM call and git/PR integration” directly here.

```ts
import { AgentRun, Task, RepoSnapshot } from "../domain";

let runCounter = 0;

export async function runImplementerAgent(
  task: Task,
  snapshot: RepoSnapshot
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const id = `impl-${++runCounter}`;

  // Placeholder: this is where you will:
  // - materialize a working copy at snapshot.id
  // - gather context files (task.scopePaths)
  // - call a local open-source LLM (Ollama/llama.cpp/vLLM, etc.)
  // - apply patch, run lint/tests
  // - push branch + open PR, capture PR URL as diffRef

  console.log("[IMPLEMENTER] Running implementer agent for task:", {
    taskId: task.id,
    type: task.type,
    snapshot: snapshot.id
  });

  const finishedAt = new Date().toISOString();

  const run: AgentRun = {
    id,
    taskId: task.id,
    role: "IMPLEMENTER",
    startedAt,
    finishedAt,
    status: "succeeded",
    inputSummary: `Task ${task.id} (${task.type}) on snapshot ${snapshot.id}`,
    outputSummary:
      "Placeholder run: no real code changes yet. Wire up LLM + git here.",
    diffRef: "PR_URL_OR_BRANCH_NAME_NOT_IMPLEMENTED",
    logsUrl: ""
  };

  return run;
}
```

* * *

`apps/orchestrator/src/agents/reviewer.ts`
------------------------------------------

```ts
import { AgentRun, Task, RepoSnapshot } from "../domain";

let reviewerRunCounter = 0;

export async function runReviewerAgent(
  task: Task,
  snapshot: RepoSnapshot,
  implRun: AgentRun
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const id = `rev-${++reviewerRunCounter}`;

  // Placeholder: here you will
  // - fetch the diff (implRun.diffRef)
  // - run lint/typecheck
  // - call an LLM as REVIEWER with diff + errors + seed.yaml slices
  // - post comments on PR

  console.log("[REVIEWER] Reviewing impl run:", {
    taskId: task.id,
    implRunId: implRun.id,
    diffRef: implRun.diffRef
  });

  const finishedAt = new Date().toISOString();

  const run: AgentRun = {
    id,
    taskId: task.id,
    role: "REVIEWER",
    startedAt,
    finishedAt,
    status: "succeeded",
    inputSummary: `Review of implementer run ${implRun.id} on task ${task.id}`,
    outputSummary:
      "Placeholder review: no actual static analysis or comments yet.",
    logsUrl: ""
  };

  return run;
}
```

* * *

`apps/orchestrator/src/agents/tester.ts`
----------------------------------------

```ts
import { AgentRun, Task, RepoSnapshot } from "../domain";

let testerRunCounter = 0;

export async function runTesterAgent(
  task: Task,
  snapshot: RepoSnapshot,
  implRun: AgentRun
): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const id = `test-${++testerRunCounter}`;

  // Placeholder: here you will
  // - run focused tests for changed files
  // - potentially generate new tests with LLM
  // - push additional commits or suggest changes

  console.log("[TESTER] Testing changes for impl run:", {
    taskId: task.id,
    implRunId: implRun.id,
    diffRef: implRun.diffRef
  });

  const finishedAt = new Date().toISOString();

  const run: AgentRun = {
    id,
    taskId: task.id,
    role: "TESTER",
    startedAt,
    finishedAt,
    status: "succeeded",
    inputSummary: `Test run for implementer run ${implRun.id} on task ${task.id}`,
    outputSummary: "Placeholder test run: no real tests executed yet.",
    logsUrl: ""
  };

  return run;
}
```

* * *

`apps/orchestrator/src/orchestrator.ts`
---------------------------------------

This wires the event types to the agents. Storage is in-memory for now to keep it simple; Copilot can help swap it for SQLite/Postgres.

```ts
import {
  OrchestratorEvent,
  IssueEvent,
  ScheduledEvent,
  CiStatusEvent,
  Task,
  RepoSnapshot
} from "./domain";
import { runImplementerAgent } from "./agents/implementer";
import { runReviewerAgent } from "./agents/reviewer";
import { runTesterAgent } from "./agents/tester";

// In-memory “DB” for Phase 1–2
const tasks: Task[] = [];
const snapshots: RepoSnapshot[] = [];

// Entry point for all events
export async function handleEvent(event: OrchestratorEvent): Promise<void> {
  console.log("[ORCH] Received event", event.kind);

  switch (event.kind) {
    case "ISSUE":
      await handleIssueEvent(event);
      break;
    case "SCHEDULED":
      await handleScheduledEvent(event);
      break;
    case "CI_STATUS":
      await handleCiStatusEvent(event);
      break;
    case "PUSH":
      // Optional in Phase 1–2; placeholder
      break;
    default:
      // Exhaustiveness guard
      const _exhaustive: never = event;
      return _exhaustive;
  }
}

async function handleIssueEvent(event: IssueEvent): Promise<void> {
  if (!event.labels.includes("ai-task")) {
    console.log("[ORCH] Ignoring issue without ai-task label");
    return;
  }

  const snapshot = await captureRepoSnapshot(event.repo, "main");
  const task = createTaskFromIssue(event, snapshot);
  tasks.push(task);

  console.log("[ORCH] Created task from issue", { taskId: task.id });

  const implRun = await runImplementerAgent(task, snapshot);

  // Phase 1 stops here: human reviews PR/output.
  console.log("[ORCH] Implementer run completed", { runId: implRun.id });
}

async function handleScheduledEvent(event: ScheduledEvent): Promise<void> {
  console.log("[ORCH] Handling scheduled event", event.id);
  const snapshot = await captureRepoSnapshot("interactive-cv", "main");

  const automationTasks = selectAutomationTasks(snapshot);

  for (const task of automationTasks) {
    tasks.push(task);

    const implRun = await runImplementerAgent(task, snapshot);
    const reviewRun = await runReviewerAgent(task, snapshot, implRun);
    const testRun = await runTesterAgent(task, snapshot, implRun);

    console.log("[ORCH] Automation cycle done", {
      taskId: task.id,
      implRunId: implRun.id,
      reviewRunId: reviewRun.id,
      testRunId: testRun.id
    });

    // Phase 2: still no auto-merge. Human merges the PR created by Implementer.
  }
}

async function handleCiStatusEvent(event: CiStatusEvent): Promise<void> {
  console.log("[ORCH] CI status event", {
    commit: event.commit,
    status: event.status
  });

  // Placeholder:
  // - If FAILURE, you could mark associated tasks as failed
  // - Or create follow-up tasks for fixing regressions
}

// --- Helpers ---------------------------------------------------------

let snapshotCounter = 0;

async function captureRepoSnapshot(repo: string, branch: string): Promise<RepoSnapshot> {
  // For now, synthesize an ID. Later you can:
  // - call GitHub API to resolve the latest commit on branch
  // - include HTML URL to the commit/branch
  const id = `snap-${++snapshotCounter}`;
  const snapshot: RepoSnapshot = {
    id,
    branch,
    timestamp: new Date().toISOString(),
    url: `https://github.com/${repo}`
  };
  snapshots.push(snapshot);

  console.log("[ORCH] Captured snapshot", snapshot);

  return snapshot;
}

let taskCounter = 0;

function createTaskFromIssue(event: IssueEvent, snapshot: RepoSnapshot): Task {
  const id = `task-${++taskCounter}`;

  const task: Task = {
    id,
    type: inferTaskTypeFromIssue(event),
    title: event.title,
    description: event.body,
    createdAt: new Date().toISOString(),
    createdBy: "human",
    status: "pending",
    repoSnapshotId: snapshot.id,
    scopePaths: inferScopePathsFromIssue(event),
    issueNumber: event.issueNumber
  };

  return task;
}

// Heuristics you can refine later (manually or with Copilot)
function inferTaskTypeFromIssue(event: IssueEvent): Task["type"] {
  const bodyLower = event.body.toLowerCase();
  if (bodyLower.includes("schema")) return "SCHEMA_FILL_GAPS";
  if (bodyLower.includes("test")) return "CONTENT_TESTS";
  if (bodyLower.includes("refactor")) return "CONTENT_REFACTOR";
  return "SCHEMA_TESTS";
}

function inferScopePathsFromIssue(event: IssueEvent): string[] {
  const bodyLower = event.body.toLowerCase();
  const paths: string[] = [];

  if (bodyLower.includes("schema")) {
    paths.push("packages/schema/**");
  }
  if (bodyLower.includes("content") || bodyLower.includes("narrative")) {
    paths.push("packages/content-model/**");
  }
  if (paths.length === 0) {
    paths.push("packages/**");
  }

  return paths;
}

function selectAutomationTasks(snapshot: RepoSnapshot): Task[] {
  // Phase 2: simple scheduled tasks. Later you can
  // inspect coverage, lints, etc.
  const now = new Date().toISOString();
  const generatedTask: Task = {
    id: `task-${++taskCounter}`,
    type: "SCHEMA_TESTS",
    title: "Scheduled: strengthen schema tests",
    description:
      "Automatically generated task to expand test coverage for schema and content model.",
    createdAt: now,
    createdBy: "system",
    status: "pending",
    repoSnapshotId: snapshot.id,
    scopePaths: ["packages/schema/**", "packages/content-model/**"]
  };

  return [generatedTask];
}
```

* * *

`apps/orchestrator/src/server.ts`
---------------------------------

Simple Express server exposing `/health` and `/events`.

```ts
import express from "express";
import bodyParser from "body-parser";
import { handleEvent } from "./orchestrator";
import { OrchestratorEvent } from "./domain";

const app = express();
app.use(bodyParser.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/events", async (req, res) => {
  const payload = req.body as OrchestratorEvent;

  if (!payload || typeof payload.kind !== "string") {
    res.status(400).json({ error: "Invalid event payload" });
    return;
  }

  try {
    await handleEvent(payload);
    res.status(202).json({ status: "accepted" });
  } catch (err) {
    console.error("[SERVER] Error handling event", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export function startServer(port: number): void {
  app.listen(port, () => {
    console.log(`[SERVER] Orchestrator listening on port ${port}`);
  });
}
```

* * *

`apps/orchestrator/src/index.ts`
--------------------------------

```ts
import { startServer } from "./server";

const port = Number(process.env.ORCHESTRATOR_PORT ?? 4000);
startServer(port);
```

* * *

`.github/workflows/orchestrator-events.yml` (root)
--------------------------------------------------

This shapes GitHub events into the `OrchestratorEvent` format the orchestrator expects and sends them via `curl`. It covers:

*   Issues with label `ai-task` → `ISSUE` event.
*   A cron schedule → `SCHEDULED` event.

```yaml
name: orchestrator-events

on:
  issues:
    types: [opened, labeled]
  schedule:
    - cron: "0 * * * *" # hourly; adjust as needed

jobs:
  send-issue-to-orchestrator:
    if: github.event_name == 'issues'
    runs-on: ubuntu-latest
    steps:
      - name: Build orchestrator event payload
        id: build_payload
        run: |
          ISSUE_NUMBER=${{ github.event.issue.number }}
          TITLE=$(jq -r '.issue.title' "$GITHUB_EVENT_PATH")
          BODY=$(jq -r '.issue.body' "$GITHUB_EVENT_PATH")
          LABELS=$(jq -r '[.issue.labels[].name] | join(",")' "$GITHUB_EVENT_PATH")
          REPO="${{ github.repository }}"

          cat <<EOF > orchestrator-event.json
          {
            "kind": "ISSUE",
            "repo": "$REPO",
            "issueNumber": $ISSUE_NUMBER,
            "action": "${{ github.event.action == 'opened' && 'OPENED' || 'LABELED' }}",
            "labels": [$(printf '"%s"' $(echo "$LABELS" | sed 's/,/","/g'))],
            "title": "$TITLE",
            "body": "$BODY"
          }
          EOF

          echo "Event payload:"
          cat orchestrator-event.json
      - name: Send event to orchestrator
        env:
          ORCHESTRATOR_URL: ${{ secrets.ORCHESTRATOR_URL }}
        run: |
          curl -X POST "$ORCHESTRATOR_URL/events" \
            -H "Content-Type: application/json" \
            --data-binary @orchestrator-event.json

  send-scheduled-to-orchestrator:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - name: Build scheduled event payload
        run: |
          cat <<EOF > orchestrator-event.json
          {
            "kind": "SCHEDULED",
            "id": "cron-hourly",
            "description": "Hourly scheduled orchestrator run"
          }
          EOF

          echo "Event payload:"
          cat orchestrator-event.json
      - name: Send event to orchestrator
        env:
          ORCHESTRATOR_URL: ${{ secrets.ORCHESTRATOR_URL }}
        run: |
          curl -X POST "$ORCHESTRATOR_URL/events" \
            -H "Content-Type: application/json" \
            --data-binary @orchestrator-event.json
```

You will need to:

*   Deploy the orchestrator somewhere reachable (Render, Fly.io, Railway, simple VM, etc.).
*   Set `ORCHESTRATOR_URL` as a repo secret in GitHub.

* * *

How this gets you to “Copilot agent chat takes it from there”
-------------------------------------------------------------

Once you drop these files in:

1.  **Wire the app into your monorepo tooling**
    *   Add `apps/orchestrator` to your workspace config (`pnpm-workspace.yaml` / Turborepo, etc.).
    *   Run:
        ```bash
        cd apps/orchestrator
        pnpm install   # or your workspace’s equivalent
        pnpm dev
        ```
    *   Confirm `GET /health` responds OK.
2.  **Push to GitHub**
    *   Commit the new app + workflow.
    *   Push to your remote.
3.  **Open GitHub + Copilot Chat**
    *   In the GitHub UI (or VS Code with Copilot Chat), open the repo.
    *   Ask Copilot, in context of a file, targeted prompts like:
        *   “In `apps/orchestrator/src/agents/implementer.ts`, wire this up to create a branch, call a local OSS LLM, apply the diff, and open a PR using the GitHub REST API.”
        *   “Replace the in-memory task storage in `orchestrator.ts` with a SQLite-backed repository using better-sqlite3.”
        *   “In `server.ts`, add HMAC signature verification for GitHub webhooks.”
4.  **Iterate**
    *   Copilot now has concrete, typed, minimal scaffolding it can extend without you having to re-explain the architecture.
    *   You can progressively tighten constraints by pulling `seed.yaml` into the prompts for the agents.

If you want, next iteration I can add a small `llmClient.ts` that wraps a generic local OSS LLM call and is easy for Copilot to expand into more sophisticated agent flows.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)

# Automatable workflow version

> **⚠️ ARCHIVED — HISTORICAL SNAPSHOT**
> This document was written during early design (Nov 2025). CI/CD and
> GitHub integration described as "Planned" are now fully implemented
> (6 workflows, webhooks, release-please). See
> [`docs/FEATURE-AUDIT.md`](../FEATURE-AUDIT.md) for current state.

**User:** Anthony Padavano (padavano.anthony@gmail.com)
**Created:** 11/27/2025 15:07:33
**Updated:** 11/27/2025 15:08:32
**Exported:** 12/26/2025 13:37:55  
**Link:** [https://chatgpt.com/g/g-p-692604860ac48191a223bf20aeb4ce69-in-midst-my-life/c/6928af83-e0c4-8332-87ec-f561079553d9](https://chatgpt.com/g/g-p-692604860ac48191a223bf20aeb4ce69-in-midst-my-life/c/6928af83-e0c4-8332-87ec-f561079553d9)  

## Status (Planned vs Implemented)
- Implemented: Orchestrator service, task queue, and agent executor wiring.
- Planned: End-to-end automation runs from GitHub/CI and persistent scheduling loop.

## Prompt:
full automatable version of this workflow (step-by-step for agents);

## Response:
Below is a **fully automatable, agent-orchestratable version** of the workflow you have been building. It is written so that each step can be delegated to independent agents (planning agents, research agents, generation agents, validation agents, integration agents). It assumes your end product is the **interactive CV/résumé system** with **masks, stages, narrative layers, identity logic, engineering architecture, and content pipelines.**

This version is **step-wise, atomic, dependency-clean, and ready for orchestration** by any agent framework (e.g., CrewAI, LangGraph, AutoGen, or a custom orchestrator).

If you want, I can also produce the **JSON workflow**, **BPMN**, or **LangGraph nodes** afterward.

* * *

1\. MASTER ORCHESTRATOR (TOP-LEVEL AGENT)
=========================================

### Responsibilities

1.  Load all specification files (Project Bible, Index, Roadmap, Technical Architecture).
2.  Activate or suspend domain agents based on dependency readiness.
3.  Maintain global state of:
    *   masks
    *   stages
    *   identity schema
    *   content assets
    *   engineering tasks
4.  Emit reports for each completed cycle.

* * *

2\. IDENTITY & NARRATIVE PIPELINE (AGENT GROUP A)
=================================================

### A1. Identity Core Extraction Agent

**Input:** Historical notes, previous documents, academic biography, artistic practice.  
**Actions:**

1.  Extract invariant identity thesis.
2.  Extract tensions/contradictions.
3.  Extract temporal arcs.
4.  Extract evidence-requiring claims.
5.  Produce a normalized “Identity Core Spec”.

**Output:** `identity_core.yaml`

* * *

### A2. Mask Generation Agent

**Input:** identity\_core.yaml  
**Actions:**

1.  Generate ontological-functional mask names.
2.  Generate personalities, constraints, operating domains.
3.  Generate activation contexts (when each mask should speak).
4.  Generate modular/override rules.

**Output:** `masks.json`

* * *

### A3. Stage & Epoch Agent

**Input:** identity\_core.yaml + masks.json  
**Actions:**

1.  Define stages (settings, narrative environments).
2.  Map masks to stages.
3.  Define transitions + narrative logic.

**Output:** `stages.json`

* * *

### A4. Narrative Validator Agent

**Input:** identity\_core.yaml + masks.json + stages.json  
**Actions:**

1.  Look for contradictions.
2.  Validate temporal logic.
3.  Check evidence validity needs.
4.  Produce warnings + repair suggestions.

**Output:** `narrative_validation_report.md`

* * *

3\. CONTENT DEVELOPMENT PIPELINE (AGENT GROUP B)
================================================

### B1. Content Taxonomy Builder

**Input:** identity\_core.yaml + masks.json  
**Actions:**

1.  Build full content taxonomy (skills, works, scholarly output, projects).
2.  Define content classes (static, dynamic, interactive).
3.  Assign effort units for each category.

**Output:** `content_taxonomy.json`

* * *

### B2. Content Template Generator

**Input:** content\_taxonomy.json  
**Actions:**

1.  Generate templates for each content class:
    *   biography nodes
    *   project nodes
    *   portfolio nodes
    *   scholarly output nodes
2.  Each template includes constraints, required structure, fields, UI hints.

**Output:** `/templates/content/*.md`

* * *

### B3. Masked Content Generator

**Input:** templates + masks.json + stages.json  
**Actions:**

1.  Generate masked variants of each content asset.
2.  Ensure tone, perspective, and narrative shifts per mask.

**Output:** `/content/masked/[mask]/asset_x.md`

* * *

### B4. Content Consistency Agent

**Input:** All masked content  
**Actions:**

1.  Check cross-mask consistency.
2.  Check linguistic coherence.
3.  Check identity invariants.

**Output:** `content_consistency_report.md`

* * *

4\. ENGINEERING & TECHNICAL PIPELINE (AGENT GROUP C)
====================================================

### C1. Dependency Graph Builder Agent

**Input:** All specifications + project bible  
**Actions:**

1.  Identify engineering tasks.
2.  Map inter-thread dependencies.
3.  Output dependency graph in JSON and DOT.

**Output:**

*   `engineering_dependencies.json`
*   `engineering_graph.dot`

* * *

### C2. Technical Execution Planner Agent

**Input:** engineering\_dependencies.json  
**Actions:**

1.  Convert dependencies into sequential execution phases.
2.  Assign energy/effort units.
3.  Produce fully ordered execution plan.

**Output:** `technical_execution_plan.md`

* * *

### C3. Engineering Role-Based Resource Distributor Agent

**Input:** technical\_execution\_plan.md  
**Actions:**

1.  Assign tasks to:
    *   engineering agent
    *   design agent
    *   research agent
2.  Attach effort units and deadlines.

**Output:** `role_resource_matrix.json`

* * *

### C4. Architecture Refiner Agent

**Input:** role\_resource\_matrix.json + previous architecture doc  
**Actions:**

1.  Generate updated technical architecture diagram spec.
2.  Validate interactions (front-end, mask-engine, content-engine, identity kernel).
3.  Specify integration protocols (API, events, local graph, etc.)

**Output:** `architecture_v2.md`

* * *

5\. PROJECT GOVERNANCE PIPELINE (AGENT GROUP D)
===============================================

### D1. Master Index Generator Agent

**Input:** Everything created so far  
**Actions:**

1.  Generate index with references to all files, masks, versions.
2.  Assign semantic tags.
3.  Produce an update-friendly directory map.

**Output:** `master_index.json`

* * *

### D2. Project Bible Consolidation Agent

**Input:** identity, narrative, content, engineering, architecture  
**Actions:**

1.  Merge all specs into the Project Bible.
2.  Version and compress.

**Output:** `project_bible_vX.Y.md`

* * *

### D3. Roadmap Generator Agent

**Input:** engineering plan + content plan  
**Actions:**

1.  Build multi-track roadmap with energy units instead of time.
2.  Synchronize content, engineering, and narrative tasks.
3.  Produce Gantt-like dependency schedule (non-time based).

**Output:** `roadmap_energy_units.json`

* * *

6\. AUTONOMOUS AGENT META-PROMPT PIPELINE (AGENT GROUP E)
=========================================================

### E1. Meta-Prompt Generator Agent

**Input:** project\_bible + masks + stages  
**Actions:**

1.  Generate reusable system meta-prompts.
2.  Calibrate for downstream agents (role prompts).
3.  Produce fallback instructions + unethical request guards.

**Output:** `agent_meta_prompts/`

* * *

### E2. Agent Behavior Validator

**Input:** all meta-prompts  
**Actions:**

1.  Check clarity, safety, and deterministic behavior.
2.  Fix circular dependencies.
3.  Improve interpretability.

**Output:** `meta_prompt_validation.md`

* * *

7\. BUILD-READY OUTPUT PIPELINE (AGENT GROUP F)
===============================================

### F1. Deployable Data Packager Agent

**Input:** all final files  
**Actions:**

1.  Package files into deployable bundles:
    *   /content
    *   /masks
    *   /stages
    *   /architecture
    *   /templates
2.  Produce ready-for-integration JSON structures.

**Output:** `/build/packaged/`

* * *

### F2. Interactive CV Engine Integration Agent

**Input:** packaged build  
**Actions:**

1.  Connect content to the rendering engine (web, native, mobile).
2.  Implement mask toggles.
3.  Implement stage transitions.
4.  Implement identity kernel logic.

**Output:** `cv_runtime_build/`

* * *

8\. DAILY AUTOMATION CYCLE (AGENT GROUP Z)
==========================================

### Z1. Continuous Orchestration Agent

**Daily Trigger:**

1.  Ingest recent changes.
2.  Run validations.
3.  Rebuild dependent files automatically.
4.  Notify orchestrator if contradictions arise.
5.  Generate daily progress reports.

**Output:** `daily_status_report.md`

* * *

If you want, I can now generate:
================================

1.  A JSON definition of all agents
2.  A LangGraph or CrewAI orchestration graph
3.  A BPMN workflow diagram
4.  A Git repository file structure
5.  A set of system prompts for each agent
6.  A CI/CD-style automation loop

Just tell me which format you want next.



---
Powered by [ChatGPT Exporter](https://www.chatgptexporter.com)

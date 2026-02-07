# FILE REORGANIZATION PLAN

## Overview

This document provides the complete mapping from current ChatGPT export filenames to the new organized naming scheme, plus bash commands to execute the reorganization.

---

## Renaming Scheme

**Pattern**: `[CATEGORY]-[NUMBER]-[DESCRIPTIVE-SLUG].md`

- **Category**: FOUND | SPEC | ARCH | PLAN | WORK | ORCH | META
- **Number**: Zero-padded 3-digit sequence within category (001, 002, etc.)
- **Slug**: Lowercase, hyphenated description of content

---

## Complete Renaming Map

### FOUNDATIONAL CONCEPTS [FOUND]

```bash
# FOUND-001: Blockchain as CV analogy
mv "ChatGPT-Blockchain as CV analogy.md" "FOUND-001-blockchain-cv-analogy.md"

# FOUND-002: Blockchain as CV vs Resume
mv "ChatGPT-Blockchain as CV!resume.md" "FOUND-002-blockchain-cv-vs-resume.md"

# FOUND-003: Meta Latin in drama / Etymology
mv "ChatGPT-Meta Latin in drama.md" "FOUND-003-meta-latin-etymology.md"

# FOUND-004: Identity and narrative questions
mv "ChatGPT-Identity and narrative questions.md" "FOUND-004-identity-narrative-questions.md"

# FOUND-005: Prospecting questions development
mv "ChatGPT-Prospecting questions development.md" "FOUND-005-prospecting-research-prompts.md"
```

### CORE SPECIFICATIONS [SPEC]

```bash
# SPEC-001: Create schema specification
mv "ChatGPT-Create schema specification.md" "SPEC-001-data-schema.md"

# SPEC-002: Draft design specification
mv "ChatGPT-Draft design specification.md" "SPEC-002-system-design.md"

# SPEC-003: Mask name draft
mv "ChatGPT-Mask name draft.md" "SPEC-003-mask-taxonomy.md"

# SPEC-004: Generate JSON definition
mv "ChatGPT-Generate JSON definition.md" "SPEC-004-json-schemas.md"
```

### ARCHITECTURE & TECHNICAL [ARCH]

```bash
# ARCH-001: Technical architecture diagram
mv "ChatGPT-Technical architecture diagram.md" "ARCH-001-system-architecture.md"

# ARCH-002: Git repository structure
mv "ChatGPT-Git repository structure.md" "ARCH-002-repository-layout.md"

# ARCH-003: GitHub Actions CI/CD
mv "ChatGPT-GitHub Actions CI!CD.md" "ARCH-003-cicd-pipeline.md"

# ARCH-004: Monorepo alternative structure
mv "ChatGPT-Monorepo alternative structure.md" "ARCH-004-monorepo-alternatives.md"

# ARCH-005: Generate monorepo structure
mv "ChatGPT-Generate monorepo structure.md" "ARCH-005-monorepo-generator.md"
```

### PLANNING & ROADMAP [PLAN]

```bash
# PLAN-001: Product roadmap creation
mv "ChatGPT-Product roadmap creation.md" "PLAN-001-product-roadmap.md"

# PLAN-002: Project plan with effort units
mv "ChatGPT-Project plan with effort units.md" "PLAN-002-effort-timeline.md"

# PLAN-003: Next steps for system
mv "ChatGPT-Next steps for system.md" "PLAN-003-action-items.md"

# PLAN-004: Engineering task mapping
mv "ChatGPT-Engineering task mapping.md" "PLAN-004-task-breakdown.md"
```

### WORKFLOWS & AUTOMATION [WORK]

```bash
# WORK-001: Content development workflow
mv "ChatGPT-Content development workflow.md" "WORK-001-content-pipeline.md"

# WORK-002: Automatable workflow version
mv "ChatGPT-Automatable workflow version.md" "WORK-002-automation-spec.md"

# WORK-003: BPMN workflow diagram
mv "ChatGPT-BPMN workflow diagram.md" "WORK-003-bpmn-diagrams.md"

# WORK-004: Orchestration graph generation
mv "ChatGPT-Orchestration graph generation.md" "WORK-004-orchestration-graphs.md"

# WORK-005: Automating Code Growth
mv "ChatGPT-Automating Code Growth.md" "WORK-005-autonomous-code-growth.md"
```

### INTEGRATION & ORCHESTRATION [ORCH]

```bash
# ORCH-001: Autonomous agent meta-prompt
mv "ChatGPT-Autonomous agent meta-prompt.md" "ORCH-001-agent-meta-prompt.md"

# ORCH-002: Technical execution plan
mv "ChatGPT-Technical execution plan.md" "ORCH-002-execution-strategy.md"

# ORCH-003: Role-based resource distribution
mv "ChatGPT-Role-based resource distribution.md" "ORCH-003-resource-allocation.md"

# ORCH-004: Templated scaffold generation
mv "ChatGPT-Templated scaffold generation.md" "ORCH-004-template-system.md"

# ORCH-005: Generate master index
mv "ChatGPT-Generate master index.md" "ORCH-005-master-index.md"
```

### META-ORGANIZATION [META]

```bash
# META-001: Consolidate project bible
mv "ChatGPT-Consolidate project bible.md" "META-001-project-bible.md"

# META-002: Thread count inquiry
mv "ChatGPT-Thread count inquiry.md" "META-002-thread-enumeration.md"

# META-003: Inter-thread dependency graph
mv "ChatGPT-Inter-thread dependency graph.md" "META-003-dependency-graph.md"

# META-004: Concept deck creation
mv "ChatGPT-Concept deck creation.md" "META-004-vision-deck.md"
```

---

## Bulk Rename Script

Save this as `reorganize-files.sh` and run with `bash reorganize-files.sh`:

```bash
#!/bin/bash

echo "========================================="
echo "  File Reorganization for in-midst-my-life"
echo "========================================="
echo ""

# FOUNDATIONAL CONCEPTS [FOUND]
echo "Renaming FOUNDATIONAL CONCEPTS files..."
mv "ChatGPT-Blockchain as CV analogy.md" "FOUND-001-blockchain-cv-analogy.md"
mv "ChatGPT-Blockchain as CV!resume.md" "FOUND-002-blockchain-cv-vs-resume.md"
mv "ChatGPT-Meta Latin in drama.md" "FOUND-003-meta-latin-etymology.md"
mv "ChatGPT-Identity and narrative questions.md" "FOUND-004-identity-narrative-questions.md"
mv "ChatGPT-Prospecting questions development.md" "FOUND-005-prospecting-research-prompts.md"

# CORE SPECIFICATIONS [SPEC]
echo "Renaming CORE SPECIFICATIONS files..."
mv "ChatGPT-Create schema specification.md" "SPEC-001-data-schema.md"
mv "ChatGPT-Draft design specification.md" "SPEC-002-system-design.md"
mv "ChatGPT-Mask name draft.md" "SPEC-003-mask-taxonomy.md"
mv "ChatGPT-Generate JSON definition.md" "SPEC-004-json-schemas.md"

# ARCHITECTURE & TECHNICAL [ARCH]
echo "Renaming ARCHITECTURE & TECHNICAL files..."
mv "ChatGPT-Technical architecture diagram.md" "ARCH-001-system-architecture.md"
mv "ChatGPT-Git repository structure.md" "ARCH-002-repository-layout.md"
mv "ChatGPT-GitHub Actions CI!CD.md" "ARCH-003-cicd-pipeline.md"
mv "ChatGPT-Monorepo alternative structure.md" "ARCH-004-monorepo-alternatives.md"
mv "ChatGPT-Generate monorepo structure.md" "ARCH-005-monorepo-generator.md"

# PLANNING & ROADMAP [PLAN]
echo "Renaming PLANNING & ROADMAP files..."
mv "ChatGPT-Product roadmap creation.md" "PLAN-001-product-roadmap.md"
mv "ChatGPT-Project plan with effort units.md" "PLAN-002-effort-timeline.md"
mv "ChatGPT-Next steps for system.md" "PLAN-003-action-items.md"
mv "ChatGPT-Engineering task mapping.md" "PLAN-004-task-breakdown.md"

# WORKFLOWS & AUTOMATION [WORK]
echo "Renaming WORKFLOWS & AUTOMATION files..."
mv "ChatGPT-Content development workflow.md" "WORK-001-content-pipeline.md"
mv "ChatGPT-Automatable workflow version.md" "WORK-002-automation-spec.md"
mv "ChatGPT-BPMN workflow diagram.md" "WORK-003-bpmn-diagrams.md"
mv "ChatGPT-Orchestration graph generation.md" "WORK-004-orchestration-graphs.md"
mv "ChatGPT-Automating Code Growth.md" "WORK-005-autonomous-code-growth.md"

# INTEGRATION & ORCHESTRATION [ORCH]
echo "Renaming INTEGRATION & ORCHESTRATION files..."
mv "ChatGPT-Autonomous agent meta-prompt.md" "ORCH-001-agent-meta-prompt.md"
mv "ChatGPT-Technical execution plan.md" "ORCH-002-execution-strategy.md"
mv "ChatGPT-Role-based resource distribution.md" "ORCH-003-resource-allocation.md"
mv "ChatGPT-Templated scaffold generation.md" "ORCH-004-template-system.md"
mv "ChatGPT-Generate master index.md" "ORCH-005-master-index.md"

# META-ORGANIZATION [META]
echo "Renaming META-ORGANIZATION files..."
mv "ChatGPT-Consolidate project bible.md" "META-001-project-bible.md"
mv "ChatGPT-Thread count inquiry.md" "META-002-thread-enumeration.md"
mv "ChatGPT-Inter-thread dependency graph.md" "META-003-dependency-graph.md"
mv "ChatGPT-Concept deck creation.md" "META-004-vision-deck.md"

echo ""
echo "========================================="
echo "  Reorganization Complete!"
echo "========================================="
echo "Total files renamed: 29"
echo ""
echo "Files are now organized by category:"
echo "  - FOUND (Foundational Concepts): 5 files"
echo "  - SPEC (Core Specifications): 4 files"
echo "  - ARCH (Architecture & Technical): 5 files"
echo "  - PLAN (Planning & Roadmap): 4 files"
echo "  - WORK (Workflows & Automation): 5 files"
echo "  - ORCH (Integration & Orchestration): 5 files"
echo "  - META (Meta-Organization): 4 files"
echo ""
echo "Note: Some files may not exist if previously deleted/moved"
echo "Use 'ls FOUND-* SPEC-* ARCH-* PLAN-* WORK-* ORCH-* META-*' to verify"
```

---

## Directory Structure (Recommended)

After renaming, consider organizing into subdirectories:

```
life-my--midst--in/
├── CLAUDE.md                    (existing)
├── MANIFEST.md                  (new - this manifest)
├── FILE-REORGANIZATION-PLAN.md  (new - this document)
├── README.md                    (to create)
│
├── foundational/
│   ├── FOUND-001-blockchain-cv-analogy.md
│   ├── FOUND-002-blockchain-cv-vs-resume.md
│   ├── FOUND-003-meta-latin-etymology.md
│   ├── FOUND-004-identity-narrative-questions.md
│   └── FOUND-005-prospecting-research-prompts.md
│
├── specifications/
│   ├── SPEC-001-data-schema.md
│   ├── SPEC-002-system-design.md
│   ├── SPEC-003-mask-taxonomy.md
│   └── SPEC-004-json-schemas.md
│
├── architecture/
│   ├── ARCH-001-system-architecture.md
│   ├── ARCH-002-repository-layout.md
│   ├── ARCH-003-cicd-pipeline.md
│   ├── ARCH-004-monorepo-alternatives.md
│   └── ARCH-005-monorepo-generator.md
│
├── planning/
│   ├── PLAN-001-product-roadmap.md
│   ├── PLAN-002-effort-timeline.md
│   ├── PLAN-003-action-items.md
│   └── PLAN-004-task-breakdown.md
│
├── workflows/
│   ├── WORK-001-content-pipeline.md
│   ├── WORK-002-automation-spec.md
│   ├── WORK-003-bpmn-diagrams.md
│   ├── WORK-004-orchestration-graphs.md
│   └── WORK-005-autonomous-code-growth.md
│
├── orchestration/
│   ├── ORCH-001-agent-meta-prompt.md
│   ├── ORCH-002-execution-strategy.md
│   ├── ORCH-003-resource-allocation.md
│   ├── ORCH-004-template-system.md
│   └── ORCH-005-master-index.md
│
└── meta/
    ├── META-001-project-bible.md
    ├── META-002-thread-enumeration.md
    ├── META-003-dependency-graph.md
    └── META-004-vision-deck.md
```

### Script to Create Directory Structure

```bash
#!/bin/bash

# Create directory structure
mkdir -p foundational specifications architecture planning workflows orchestration meta

# Move files to appropriate directories
mv FOUND-*.md foundational/
mv SPEC-*.md specifications/
mv ARCH-*.md architecture/
mv PLAN-*.md planning/
mv WORK-*.md workflows/
mv ORCH-*.md orchestration/
mv META-*.md meta/

echo "Files organized into subdirectories"
```

---

## Verification Commands

After running the reorganization, verify with:

```bash
# Count files by category
echo "FOUNDATIONAL: $(ls -1 FOUND-*.md 2>/dev/null | wc -l)"
echo "SPECIFICATIONS: $(ls -1 SPEC-*.md 2>/dev/null | wc -l)"
echo "ARCHITECTURE: $(ls -1 ARCH-*.md 2>/dev/null | wc -l)"
echo "PLANNING: $(ls -1 PLAN-*.md 2>/dev/null | wc -l)"
echo "WORKFLOWS: $(ls -1 WORK-*.md 2>/dev/null | wc -l)"
echo "ORCHESTRATION: $(ls -1 ORCH-*.md 2>/dev/null | wc -l)"
echo "META: $(ls -1 META-*.md 2>/dev/null | wc -l)"

# List all renamed files
ls -1 {FOUND,SPEC,ARCH,PLAN,WORK,ORCH,META}-*.md

# Find any remaining ChatGPT- files
ls -1 "ChatGPT-"*.md 2>/dev/null || echo "All ChatGPT files renamed successfully"
```

---

## Rollback Plan

If you need to revert the renaming:

```bash
#!/bin/bash
# Save current state first
ls -1 {FOUND,SPEC,ARCH,PLAN,WORK,ORCH,META}-*.md > renamed-files.txt

# This would require manual reversal or a mapping file
# Recommended: Use git to revert if tracked, or keep backup
```

**Recommendation**: Before running any rename script:
1. Commit current state to git
2. Or create a backup: `cp -r . ../life-my--midst--in-backup`

---

## Benefits of New Organization

1. **Alphabetical Grouping**: Files sort by category automatically
2. **Clear Hierarchy**: Category prefix shows relationship
3. **Easy Navigation**: Number sequence shows reading order
4. **Self-Documenting**: Filename describes content
5. **Reference-Friendly**: Easy to cite (e.g., "see SPEC-001")
6. **Scalable**: Easy to add new files within categories
7. **Tool-Friendly**: Scripts can process by category prefix

---

## Usage Examples

```bash
# Read all foundational concepts
cat FOUND-*.md

# List all specifications
ls SPEC-*.md

# Search all architecture docs
grep -r "microservice" ARCH-*.md

# Count lines in all planning docs
wc -l PLAN-*.md
```

---

## Integration with CLAUDE.md

Update the CLAUDE.md file to reference new naming:

```markdown
## Key Documents

Start with these in order:
1. **META-001-project-bible.md** - Complete system overview
2. **SPEC-001-data-schema.md** - Data model foundation
3. **ARCH-001-system-architecture.md** - Technical design
4. **WORK-005-autonomous-code-growth.md** - Development approach
5. **PLAN-001-product-roadmap.md** - Strategic phases
```

---

**Status**: Ready to execute
**Estimated Time**: < 1 minute
**Risk**: Low (reversible with git or backup)
**Impact**: High (dramatically improves organization)

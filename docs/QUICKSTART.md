# QUICKSTART GUIDE
## in–midst–my-life: Implementation from Design to Production

**Goal**: Take you from design documents to working implementation in clear, actionable steps.

---

## 🎯 Prerequisites

### Knowledge
- TypeScript/JavaScript (intermediate+)
- React and Next.js (basic understanding)
- Git and GitHub workflows
- Command line proficiency
- Optional: PostgreSQL, Docker basics

### Tools Required
```bash
# Check you have these installed:
node --version    # v22+ required
npm --version     # or pnpm/yarn
git --version
```

### Recommended
```bash
# Install pnpm (faster, better for monorepos)
npm install -g pnpm

# Install GitHub CLI (for later phases)
brew install gh  # macOS
# or: https://cli.github.com/
```

---

## 📋 Phase 0: Setup & Preparation (You Are Here)

### Step 1: Understand the System Architecture

**Must-read documents** (30-60 minutes):

```bash
# Read in this order:
cat MANIFEST.md                           # System overview
cat CONSOLIDATED-SPECIFICATIONS.md         # Technical specs
cat META-001-project-bible.md             # Complete design
cat seed.yaml                              # Development constraints
```

**Key concepts to internalize**:
1. **CV as Blockchain**: CV = ledger, résumé = state snapshot
2. **Identity Masks**: Same data, different contextual views
3. **Temporal Epochs**: Professional evolution over time
4. **Autonomous Development**: Multi-agent code generation

### Step 2: Verify Repository Organization

```bash
# Confirm all files are properly organized
ls -1 {FOUND,SPEC,ARCH,PLAN,WORK,ORCH,META}-*.md | wc -l
# Should output: 32

# Check key artifacts exist
ls -1 seed.yaml MANIFEST.md README.md CONSOLIDATED-SPECIFICATIONS.md
```

### Step 3: Create Implementation Directory

```bash
# Create a workspace for generated code
mkdir -p implementation
cd implementation

# Initialize git if not already in a repo
git init
git add ../seed.yaml ../MANIFEST.md ../README.md
git commit -m "Initial commit: Design documents and specifications"
```

---

## 🔧 Database Migrations & Seeds

- **Services**: Use `docker-compose.yml` via `scripts/dev-up.sh` to start Postgres/Redis; `scripts/dev-shell.sh` opens psql/redis-cli for inspection.
- **URLs**: API reads `DATABASE_URL`/`POSTGRES_URL`; orchestrator reads `DATABASE_URL` (or `ORCH_TASK_STORE=postgres`) and `REDIS_URL`. Keep per-env DBs (`midst_dev`, `midst_test`, `midst_integration`) to avoid collisions.
- **Apply migrations**: `pnpm --filter @in-midst-my-life/api migrate` and `pnpm --filter @in-midst-my-life/orchestrator migrate`. Safe to re-run (idempotent by design).
- **Seeds**: `pnpm --filter @in-midst-my-life/api seed` and `pnpm --filter @in-midst-my-life/orchestrator seed` load demo rows. Seeds use `ON CONFLICT DO NOTHING`; repeat runs are fine.
- **Integration isolation**: point tests to `INTEGRATION_POSTGRES_URL`/`INTEGRATION_REDIS_URL` so local dev data stays untouched.
- **End-to-end integration tests**: with services running and `INTEGRATION_*` URLs set, run `pnpm integration` (or package-scoped `pnpm --filter @in-midst-my-life/api integration`) to exercise Postgres/Redis paths.
- **Full stack dev**: `docker-compose up api orchestrator web` to run everything with live UI at http://localhost:3000 (timeline/graph/gallery + Admin Studio); API/OpenAPI at http://localhost:3001/openapi.yaml (file in `apps/api/openapi.yaml`). Helm chart scaffold under `infra/helm` for k8s.
- **Port conflicts**: set `REDIS_PORT`/`WEB_PORT` in `.env` to remap host ports, and use `ORCH_REDIS_URL=redis://redis:6379` so the orchestrator connects to the in-stack Redis.
- **Env samples**: copy `.env.integration.example` to `.env.integration` (edit URLs) for live DB/queue tests.
- **Secrets**: load `DATABASE_URL`/`POSTGRES_URL`/`REDIS_URL` via the 1Password-backed loader (`~/.config/op/load-env.sh`) instead of committing credentials.
- **LLM defaults**: orchestrator uses local OSS models by default (`ORCH_AGENT_EXECUTOR=local`). The default run is plaintext (no `ORCH_TOOL_ALLOWLIST`), so models like `gemma3:4b` finish without needing structured JSON. Enable tools/structured mode by setting `ORCH_TOOL_ALLOWLIST=rg,ls,cat` (and optionally `ORCH_TOOL_MAX_ITERATIONS`) and keep `ORCH_LLM_RESPONSE_FORMAT=structured-json` if you want tool-assisted workflows. For local runs use `LOCAL_LLM_URL=http://localhost:11434`; for Docker use `LOCAL_LLM_URL=http://host.docker.internal:11434` and include the host in `LOCAL_LLM_ALLOWED_HOSTS`. Set `LOCAL_LLM_MODEL` to a downloaded model (e.g., `gemma3:4b`) or pull one with `ollama pull <model>`. Set `ORCH_AGENT_EXECUTOR=stub` if no local model is running.
- **LLM policy flags**: `ORCH_LLM_POLICY=oss|hosted|locked`, `ALLOW_HOSTED_LLM=true`, `LOCAL_LLM_ALLOWED_HOSTS=host1,host2`, `LOCAL_LLM_ERROR_MODE=throw`, `ORCH_CHECK_LLM=true`.

### API Call Examples
- Select masks: `curl -X POST "$API_BASE/profiles/{id}/masks/select" -d '{"contexts":["design"],"tags":["impact"],"limit":5}'`.
- Build narrative: `curl -X POST "$API_BASE/profiles/{id}/narrative" -d '{"contexts":["design"],"tags":["impact"],"timeline":[{"id":"launch-a","title":"Launch A","start":"2024-01-01","tags":["design"]}]}'`.
- Export profile: `curl -o profile.jsonld "$API_BASE/profiles/{id}/export/jsonld"` (PDF/VC via `/export/pdf` or `/export/vc`).
- Metrics/health: `curl -s "$API_BASE/metrics" | head -20` and `curl "$ORCH_BASE/ready"`; restrict in prod via ingress auth or IP allowlist.

---

## 🏗️ Phase 1: Scaffold Generation (Next Step)

### Step 1: Extract Monorepo Generator Script

From **ARCH-005-monorepo-generator.md**, extract the Python script:

```bash
# The script is embedded in ARCH-005
# You can extract it manually or use this helper:

cat > generate-structure.py << 'EOF'
#!/usr/bin/env python3
"""
Scaffold generator for in-midst-my-life monorepo
Extracted from ARCH-005-monorepo-generator.md
"""

import argparse
from pathlib import Path
from textwrap import dedent

# ... [Full script from ARCH-005] ...
EOF

chmod +x generate-structure.py
```

Or create it directly following the specification in ARCH-005.

### Step 2: Run the Scaffold Generator

```bash
# Generate the complete monorepo structure
python generate-structure.py

# Verify structure was created
tree -L 2
# Should show: apps/, packages/, infra/, docs/, etc.
```

Expected output:
```
.
├── README.md
├── apps/
│   ├── web/
│   ├── api/
│   └── orchestrator/
├── packages/
│   ├── schema/
│   ├── core/
│   ├── content-model/
│   └── design-system/
├── infra/
├── docs/
└── scripts/
```

### Step 3: Initialize Package Management

```bash
# Create root package.json for monorepo
cat > package.json << 'EOF'
{
  "name": "in-midst-my-life",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "typescript": "^5.3.3",
    "prettier": "^3.1.1",
    "eslint": "^8.56.0"
  }
}
EOF

# Install dependencies
pnpm install
```

### Step 4: Configure TypeScript

```bash
# Root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "jsx": "preserve",
    "incremental": true
  }
}
EOF
```

---

## 📐 Phase 2: Implement Schema Package (First 3 EU)

This is your foundation. Everything depends on this.

### Step 1: Set Up Schema Package

```bash
cd packages/schema

# Create package.json
cat > package.json << 'EOF'
{
  "name": "@in-midst-my-life/schema",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^1.1.0"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
EOF

pnpm install
```

### Step 2: Implement Core Schema

Using **SPEC-001-data-schema.md** as reference:

```bash
mkdir -p src test

# Create identity schema
cat > src/identity.ts << 'EOF'
import { z } from 'zod';

export const IdentityCoreSchema = z.object({
  thesis: z.string().min(10),
  invariants: z.array(z.string()),
  master_keywords: z.array(z.string()),
  intellectual_lineage: z.array(z.string()),
  strategic_differentiators: z.array(z.string()),
  tensions: z.array(z.string()),
  constraints: z.array(z.string()),
});

export type IdentityCore = z.infer<typeof IdentityCoreSchema>;

export const IdentitySchema = z.object({
  id: z.string().uuid(),
  did: z.string().optional(),
  primaryWalletAddress: z.string().optional(),
  ensName: z.string().optional(),
  emailHash: z.string().optional(),
});

export type Identity = z.infer<typeof IdentitySchema>;
EOF

# Create profile schema
cat > src/profile.ts << 'EOF'
import { z } from 'zod';

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  identityId: z.string().uuid(),
  slug: z.string(),
  displayName: z.string(),
  title: z.string().optional(),
  headline: z.string().optional(),
  summaryMarkdown: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  coverImageUrl: z.string().url().optional(),
  locationText: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Profile = z.infer<typeof ProfileSchema>;
EOF

# Create mask schema
cat > src/mask.ts << 'EOF'
import { z } from 'zod';

export const MaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  ontology: z.string(),
  functional_scope: z.string(),
  stylistic_parameters: z.object({
    tone: z.string(),
    rhetorical_mode: z.string(),
    compression_ratio: z.number().min(0).max(1),
  }),
  activation_rules: z.object({
    contexts: z.array(z.string()),
    triggers: z.array(z.string()),
  }),
  filters: z.object({
    include_tags: z.array(z.string()),
    exclude_tags: z.array(z.string()),
    priority_weights: z.record(z.number()),
  }),
});

export type Mask = z.infer<typeof MaskSchema>;

// Predefined mask types from SPEC-003
export const MaskType = z.enum([
  'analyst',
  'synthesist',
  'observer',
  'strategist',
  'speculator',
  'interpreter',
  'artisan',
  'architect',
  'narrator',
  'provoker',
  'mediator',
  'executor',
  'steward',
  'integrator',
  'custodian',
  'calibrator',
]);

export type MaskType = z.infer<typeof MaskType>;
EOF

# Create index to export everything
cat > src/index.ts << 'EOF'
// Identity schemas
export * from './identity';
export * from './profile';
export * from './mask';

// Re-export zod for convenience
export { z } from 'zod';
EOF
```

### Step 3: Write Tests

```bash
cat > test/identity.test.ts << 'EOF'
import { describe, it, expect } from 'vitest';
import { IdentityCoreSchema, IdentitySchema } from '../src/identity';

describe('Identity Schema', () => {
  it('validates a valid identity core', () => {
    const validCore = {
      thesis: 'Core professional identity statement',
      invariants: ['Attribute 1', 'Attribute 2'],
      master_keywords: ['keyword1', 'keyword2'],
      intellectual_lineage: ['influence1'],
      strategic_differentiators: ['differentiator1'],
      tensions: [],
      constraints: [],
    };

    const result = IdentityCoreSchema.safeParse(validCore);
    expect(result.success).toBe(true);
  });

  it('rejects invalid identity core (thesis too short)', () => {
    const invalidCore = {
      thesis: 'short',
      invariants: [],
      master_keywords: [],
      intellectual_lineage: [],
      strategic_differentiators: [],
      tensions: [],
      constraints: [],
    };

    const result = IdentityCoreSchema.safeParse(invalidCore);
    expect(result.success).toBe(false);
  });
});
EOF

# Run tests
pnpm test
```

### Step 4: Document the Package

```bash
cat > README.md << 'EOF'
# @in-midst-my-life/schema

Core data schemas for the interactive CV system.

## Usage

```typescript
import { ProfileSchema, MaskSchema, IdentitySchema } from '@in-midst-my-life/schema';

// Validate data
const profile = ProfileSchema.parse(profileData);

// Type-safe access
const name: string = profile.displayName;
```

## Schemas

- **Identity**: Core identity and DID information
- **Profile**: User profile and CV data
- **Mask**: Identity mask configurations
- **Experience**: Work experience entries
- **Verifiable Credentials**: VC integration

See individual schema files for details.
EOF
```

---

## 🎨 Phase 3: Implement Web App (Next 5 EU)

### Step 1: Set Up Next.js Web App

```bash
cd apps/web

# Initialize Next.js 15
pnpm create next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Add local dependencies
pnpm add @in-midst-my-life/schema@workspace:*

# Configure to use schema package
# Update tsconfig.json to reference workspace packages
```

### Step 2: Create Basic Mask Selector Component

Using guidance from **SPEC-002-system-design.md**:

```bash
mkdir -p src/components

cat > src/components/MaskSelector.tsx << 'EOF'
'use client';

import { useState } from 'react';
import { MaskType } from '@in-midst-my-life/schema';

const MASKS: { id: MaskType; name: string; description: string }[] = [
  { id: 'analyst', name: 'Analyst', description: 'Precision reasoning and structure' },
  { id: 'artisan', name: 'Artisan', description: 'Craft-level creation' },
  { id: 'architect', name: 'Architect', description: 'Systems composition' },
];

export function MaskSelector() {
  const [selectedMask, setSelectedMask] = useState<MaskType>('analyst');

  return (
    <div className="flex gap-4 p-4">
      {MASKS.map((mask) => (
        <button
          key={mask.id}
          onClick={() => setSelectedMask(mask.id)}
          className={`
            px-4 py-2 rounded-lg transition-all
            ${selectedMask === mask.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300'
            }
          `}
        >
          <div className="font-semibold">{mask.name}</div>
          <div className="text-sm opacity-75">{mask.description}</div>
        </button>
      ))}
    </div>
  );
}
EOF
```

---

## 🤖 Phase 4: Set Up Autonomous Development (8 EU)

This is the revolutionary part - implementing the self-growing codebase.

### Step 1: Set Up Orchestrator Service

From **WORK-005-autonomous-code-growth.md**:

```bash
cd apps/orchestrator

# Create package structure (TypeScript Node service)
mkdir -p src/{agents,domain}

# Implement as per WORK-005 specifications
# (Detailed implementation extracted from conversation)
```

### Step 2: Configure GitHub Actions

From **ARCH-003-cicd-pipeline.md**:

```bash
mkdir -p .github/workflows

# Create CI workflow
# (Extract from ARCH-003)
```

---

## 📊 Progress Tracking

### Checklist

**Phase 0: Setup**
- [x] Read all essential documents
- [x] Understand core concepts
- [x] Repository properly organized
- [ ] Development environment ready

**Phase 1: Foundation**
- [ ] Monorepo structure generated
- [ ] Schema package implemented (0/3 EU)
- [ ] Schema tests written (>90% coverage)
- [ ] Schema documentation complete

**Phase 2: Core Engine**
- [ ] Web app initialized (0/5 EU)
- [ ] Basic UI components created
- [ ] Mask switching logic implemented
- [ ] Timeline view created

**Phase 3: Autonomous System**
- [ ] Orchestrator service created (0/8 EU)
- [ ] Agent implementations complete
- [ ] GitHub Actions configured
- [ ] First autonomous PR created

---

## 🆘 Troubleshooting

### Common Issues

**Q: TypeScript errors about workspace packages**
```bash
# Make sure all packages are built
pnpm build

# Or use references in tsconfig
```

**Q: Import errors with @in-midst-my-life/***
```bash
# Check package.json "main" field points to correct file
# Verify tsconfig paths are configured
```

**Q: Tests failing**
```bash
# Clear cache
rm -rf node_modules/.cache

# Reinstall
pnpm install
```

---

## 📚 Reference Guide

### Key Command Reference

```bash
# Development
pnpm dev              # Start all apps in dev mode
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm lint             # Lint all code
pnpm typecheck        # Type check everything

# Monorepo
pnpm --filter web dev              # Run dev only for web app
pnpm --filter @in-midst-my-life/schema test  # Test only schema

# Git
git status
git add .
git commit -m "feat: implement schema package"
git push
```

### Energy Unit Tracking

Keep track of effort spent:

```bash
# Create a simple tracker
echo "Phase 1 - Schema Implementation: 0/3 EU" > EFFORT_LOG.md
```

Update as you complete work.

---

## 🎯 Success Criteria

You'll know you're on track when:

✅ **Phase 0**:
- You can explain the blockchain-CV analogy
- You understand what masks are
- You've read the Project Bible (META-001)

✅ **Phase 1**:
- Schema package builds without errors
- Tests pass with >90% coverage
- Other packages can import schemas

✅ **Phase 2**:
- Web app runs locally
- Mask selector displays and switches
- Timeline view shows professional epochs

✅ **Phase 3**:
- First PR created by autonomous agent
- CI runs successfully
- Human review workflow established

---

## 🚀 Next Steps

1. **Complete Phase 0**: Ensure you understand all concepts
2. **Run scaffold generator**: Create monorepo structure
3. **Implement schema package**: Follow Phase 2 guide above
4. **Read detailed specs**: Dive into SPEC-001, SPEC-002, SPEC-003
5. **Join the journey**: Build something revolutionary!

---

## 📞 Getting Help

- **Documentation**: All specs in this repository
- **Design Rationale**: See META-001 (Project Bible)
- **Technical Details**: CONSOLIDATED-SPECIFICATIONS.md
- **Constraints**: seed.yaml

---

**Remember**: This is a revolutionary project. Take time to understand the concepts before rushing into code. The autonomous development system will eventually write most of the code itself - your job is to guide it with the right architecture and constraints.

**Energy Units > Calendar Time**: Don't rush. Focus on quality and understanding.

Let's build something extraordinary! 🚀

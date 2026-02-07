# Developer Onboarding Guide

Welcome to **In Midst My Life**! This guide will get you from zero to productive development in **under 30 minutes**.

---

## 🎯 Quick Navigation

- [Prerequisites](#prerequisites)
- [Initial Setup (10 minutes)](#initial-setup-10-minutes)
- [First Contribution (15 minutes)](#first-contribution-15-minutes)
- [Development Workflow](#development-workflow)
- [Architecture Overview](#architecture-overview)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

Install these before starting:

```bash
# Check versions
node --version   # v22+ required
git --version
docker --version # 24+ required

# Install pnpm (recommended for monorepos)
npm install -g pnpm

# Verify pnpm
pnpm --version  # 8.0+ recommended
```

### Optional but Recommended

```bash
# GitHub CLI (for PR workflow)
brew install gh  # macOS
# or: https://cli.github.com/

# 1Password CLI (for secrets management)
brew install --cask 1password-cli  # macOS

# VS Code with recommended extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
```

### Knowledge Prerequisites

- **TypeScript** (intermediate level)
- **Node.js** (basic understanding)
- **Git** (basic commands)
- **Docker** (optional, but helpful)
- **REST APIs** (basic concepts)

---

## Initial Setup (10 minutes)

### Step 1: Clone Repository (1 min)

```bash
git clone https://github.com/anthropics/in-midst-my-life.git
cd in-midst-my-life
```

### Step 2: Install Dependencies (3 min)

```bash
# Install all dependencies for monorepo
pnpm install

# Verify installation
pnpm list --depth 0
```

Expected output shows all workspace packages installed.

### Step 3: Start Services (3 min)

```bash
# Start PostgreSQL and Redis
./scripts/dev-up.sh

# Or manually with Docker Compose
docker-compose up postgres redis -d
```

Verify services are running:

```bash
# Check containers
docker ps | grep inmidst

# Test connections
./scripts/dev-shell.sh postgres  # Opens psql
./scripts/dev-shell.sh redis     # Opens redis-cli
```

### Step 4: Configure Environment (2 min)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Minimal required config:
DATABASE_URL=postgresql://midstsvc:password@localhost:5432/midst_dev
REDIS_URL=redis://localhost:6379
```

**Using 1Password (optional):**

```bash
source secrets.env.op.sh
```

### Step 5: Run Migrations (1 min)

```bash
# Run database migrations
pnpm --filter @in-midst-my-life/api migrate
pnpm --filter @in-midst-my-life/orchestrator migrate

# Seed demo data
pnpm --filter @in-midst-my-life/api seed
pnpm --filter @in-midst-my-life/orchestrator seed
```

Verify:

```bash
./scripts/dev-shell.sh postgres
# In psql:
\dt                    # List tables
SELECT COUNT(*) FROM profiles;
```

### Step 6: Start Development Servers (< 1 min)

```bash
# Option 1: Start all services
pnpm dev

# Option 2: Start individual services
pnpm --filter @in-midst-my-life/api dev
pnpm --filter @in-midst-my-life/orchestrator dev
pnpm --filter @in-midst-my-life/web dev
```

Services will be available at:
- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Orchestrator**: http://localhost:3002
- **API Docs**: http://localhost:3001/docs

---

## First Contribution (15 minutes)

Let's make your first contribution by adding a new skill to the demo profile.

### Step 1: Understand the System (5 min)

**Core Concepts:**

1. **Profiles**: User CV/résumé data
2. **Masks**: Context-specific identity filters (e.g., "Analyst", "Architect")
3. **Experiences**: Work history entries
4. **Skills**: Technical and soft skills
5. **Narrative Generation**: AI-powered résumé text

**Project Structure:**

```
in-midst-my-life/
├── apps/
│   ├── api/           # Fastify REST API
│   ├── orchestrator/  # Background workers & LLM agents
│   └── web/           # Next.js frontend
├── packages/
│   ├── schema/        # Zod schemas (shared types)
│   ├── core/          # Business logic
│   ├── content-model/ # Content graph models
│   └── design-system/ # UI components
└── docs/              # Documentation (you are here!)
```

**Read these (5 min):**
- [MANIFEST.md](../MANIFEST.md) - System overview
- [SPEC-002-system-design.md](../SPEC-002-system-design.md) - Architecture

### Step 2: Make a Code Change (5 min)

Let's add a new skill category.

**1. Update schema (`packages/schema/src/skill.ts`):**

```typescript
// Add to SkillCategory enum
export const SkillCategory = z.enum([
  'programming_languages',
  'frameworks',
  'tools',
  'soft_skills',
  'cloud_platforms',  // ADD THIS
]);
```

**2. Update seed data (`apps/api/seeds/002_skills.ts`):**

```typescript
// Add new skill
{
  id: 'skill-aws',
  profile_id: 'demo-profile-id',
  name: 'AWS',
  category: 'cloud_platforms',
  proficiency_level: 'expert',
  years_of_experience: 5,
  tags: ['cloud', 'infrastructure'],
},
```

**3. Re-run seeds:**

```bash
pnpm --filter @in-midst-my-life/api seed
```

### Step 3: Test Your Change (3 min)

**Test via API:**

```bash
# Get profile skills
curl http://localhost:3001/profiles/<profile-id>/skills | jq

# You should see your new skill with category "cloud_platforms"
```

**Test via UI:**

1. Open http://localhost:3000
2. Navigate to Skills section
3. Verify new skill appears

### Step 4: Run Tests (2 min)

```bash
# Run unit tests
pnpm test

# Run specific package tests
pnpm --filter @in-midst-my-life/schema test

# Run integration tests (requires services running)
INTEGRATION_POSTGRES_URL=postgresql://midstsvc:password@localhost:5432/midst_test \
INTEGRATION_REDIS_URL=redis://localhost:6379 \
pnpm integration
```

### Step 5: Submit PR (< 1 min)

```bash
# Create branch
git checkout -b feat/add-cloud-platforms-category

# Commit changes
git add .
git commit -m "feat(schema): add cloud_platforms skill category"

# Push and create PR
git push origin feat/add-cloud-platforms-category
gh pr create --title "Add cloud platforms skill category" --body "Adds support for cloud platform skills like AWS, GCP, Azure"
```

🎉 **Congratulations!** You've made your first contribution!

---

## Development Workflow

### Daily Development

```bash
# 1. Start services
./scripts/dev-up.sh

# 2. Start dev servers (with hot-reload)
pnpm dev

# 3. Make changes and test
pnpm test

# 4. Lint and type-check
pnpm lint
pnpm typecheck

# 5. Build (optional, CI will do this)
pnpm build
```

### Working with Packages

```bash
# Run commands in specific packages
pnpm --filter @in-midst-my-life/api <command>
pnpm --filter @in-midst-my-life/web <command>
pnpm --filter @in-midst-my-life/schema <command>

# Examples:
pnpm --filter @in-midst-my-life/api test
pnpm --filter @in-midst-my-life/web dev
pnpm --filter @in-midst-my-life/schema typecheck

# Install dependency in specific package
pnpm --filter @in-midst-my-life/api add fastify-plugin
```

### Database Workflow

```bash
# Create migration
cd apps/api
# Edit migrations/XXX_my_migration.sql

# Apply migration
pnpm migrate

# Rollback (if needed)
# Edit migrations with DOWN statements

# Inspect database
./scripts/dev-shell.sh postgres
```

### Testing Strategy

**Unit Tests** (fast, isolated):
```bash
pnpm --filter @in-midst-my-life/schema test
pnpm --filter @in-midst-my-life/core test
```

**Integration Tests** (requires services):
```bash
INTEGRATION_POSTGRES_URL=... \
INTEGRATION_REDIS_URL=... \
pnpm --filter @in-midst-my-life/api integration
```

**E2E Tests** (full stack):
```bash
pnpm --filter @in-midst-my-life/web test:e2e
```

### Code Quality

```bash
# Lint all packages
pnpm lint

# Fix auto-fixable issues
pnpm lint --fix

# Type check
pnpm typecheck

# Format code (Prettier)
pnpm format

# Run all quality checks
pnpm lint && pnpm typecheck && pnpm test
```

---

## Architecture Overview

### System Design

```mermaid
graph TB
    subgraph "Frontend"
        WEB[Next.js App<br/>Timeline, Graph, Gallery]
    end
    
    subgraph "API Layer"
        API[Fastify API<br/>REST + GraphQL]
    end
    
    subgraph "Background Jobs"
        ORCH[Orchestrator<br/>Workers & Agents]
        QUEUE[(Redis Queue)]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Profiles, CV Data)]
        REDIS[(Redis<br/>Cache)]
    end
    
    WEB -->|HTTP| API
    WEB -->|HTTP| ORCH
    API --> PG
    API --> REDIS
    ORCH --> QUEUE
    ORCH --> PG
    QUEUE --> REDIS
```

### Key Technologies

| Component | Tech Stack |
|-----------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS, D3.js |
| **API** | Fastify, TypeScript, Zod, OpenAPI |
| **Orchestrator** | Node.js, BullMQ, LangChain (optional) |
| **Database** | PostgreSQL 15 with pgvector |
| **Cache/Queue** | Redis 7 |
| **Testing** | Vitest, Playwright |
| **Deployment** | Docker, Kubernetes, Helm |

### Data Flow

**Creating a Profile:**
```
Web → POST /profiles → API → PostgreSQL → Response → Web
```

**Generating Narrative:**
```
Web → POST /profiles/{id}/narrative → API → Orchestrator (async)
    → LLM Agent → Narrative → PostgreSQL → Response
```

**Exporting Resume:**
```
Web → GET /profiles/{id}/export/pdf → API
    → Apply Mask Filter → Generate PDF → Response (binary)
```

---

## Common Tasks

### Adding a New API Endpoint

**1. Define route (`apps/api/src/routes/profiles.ts`):**

```typescript
fastify.get('/profiles/:id/summary', async (request, reply) => {
  const { id } = request.params as { id: string };
  
  const profile = await profileRepo.getById(id);
  if (!profile) {
    return reply.code(404).send({ error: 'Profile not found' });
  }
  
  return { summary: profile.summaryMarkdown };
});
```

**2. Add to OpenAPI spec (`apps/api/openapi.yaml`):**

```yaml
/profiles/{id}/summary:
  get:
    summary: Get profile summary
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Profile summary
        content:
          application/json:
            schema:
              type: object
              properties:
                summary:
                  type: string
```

**3. Test:**

```bash
curl http://localhost:3001/profiles/<id>/summary
```

### Adding a New Schema

**1. Create schema file (`packages/schema/src/credential.ts`):**

```typescript
import { z } from 'zod';

export const CredentialSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  name: z.string(),
  issuer: z.string(),
  issuedDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  credentialUrl: z.string().url().optional(),
});

export type Credential = z.infer<typeof CredentialSchema>;
```

**2. Export from index (`packages/schema/src/index.ts`):**

```typescript
export * from './credential';
```

**3. Write tests (`packages/schema/test/credential.test.ts`):**

```typescript
import { describe, it, expect } from 'vitest';
import { CredentialSchema } from '../src/credential';

describe('CredentialSchema', () => {
  it('validates valid credential', () => {
    const valid = {
      id: crypto.randomUUID(),
      profileId: crypto.randomUUID(),
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      issuedDate: '2024-01-01T00:00:00Z',
    };
    
    expect(CredentialSchema.parse(valid)).toEqual(valid);
  });
});
```

**4. Run tests:**

```bash
pnpm --filter @in-midst-my-life/schema test
```

### Adding a UI Component

**1. Create component (`apps/web/src/components/CredentialCard.tsx`):**

```typescript
interface CredentialCardProps {
  name: string;
  issuer: string;
  issuedDate: string;
}

export function CredentialCard({ name, issuer, issuedDate }: CredentialCardProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold text-lg">{name}</h3>
      <p className="text-gray-600">{issuer}</p>
      <p className="text-sm text-gray-500">
        Issued: {new Date(issuedDate).toLocaleDateString()}
      </p>
    </div>
  );
}
```

**2. Use in page (`apps/web/src/app/profile/[id]/page.tsx`):**

```typescript
import { CredentialCard } from '@/components/CredentialCard';

export default function ProfilePage({ params }: { params: { id: string } }) {
  // ... fetch profile data
  
  return (
    <div>
      {credentials.map((cred) => (
        <CredentialCard key={cred.id} {...cred} />
      ))}
    </div>
  );
}
```

### Running Background Jobs

**1. Define task (`apps/orchestrator/src/tasks/send-email.ts`):**

```typescript
import { Task } from '../domain/task';

export async function sendEmailTask(task: Task): Promise<void> {
  const { to, subject, body } = task.payload;
  
  // Send email logic
  console.log(`Sending email to ${to}: ${subject}`);
  
  // Update task status
  task.status = 'completed';
}
```

**2. Register task (`apps/orchestrator/src/worker.ts`):**

```typescript
import { sendEmailTask } from './tasks/send-email';

const taskHandlers = {
  'send_email': sendEmailTask,
  // ... other tasks
};
```

**3. Enqueue task:**

```bash
curl -X POST http://localhost:3002/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "type": "send_email",
    "payload": {
      "to": "user@example.com",
      "subject": "Welcome!",
      "body": "Welcome to In Midst My Life"
    }
  }'
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
API_PORT=3011
```

### Database Connection Refused

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Start if not running
./scripts/dev-up.sh

# Test connection
psql postgresql://midstsvc:password@localhost:5432/midst_dev
```

### Dependencies Out of Sync

```bash
# Clean and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Rebuild packages
pnpm build
```

### Type Errors

```bash
# Rebuild package types
pnpm --filter @in-midst-my-life/schema build

# Clean TypeScript cache
rm tsconfig.tsbuildinfo
rm -rf apps/*/dist packages/*/dist

# Re-run typecheck
pnpm typecheck
```

### Tests Failing

```bash
# Check test database is clean
INTEGRATION_POSTGRES_URL=... pnpm --filter @in-midst-my-life/api migrate

# Run with verbose output
pnpm test -- --reporter=verbose

# Run single test file
pnpm test -- packages/schema/test/profile.test.ts
```

---

## Development Best Practices

### Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(api): add skill search endpoint
fix(web): resolve timeline rendering bug
docs(readme): update installation steps
chore(deps): upgrade fastify to 4.x
test(schema): add validation tests
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Auto-fix on save
- **Prettier**: 2-space indentation, semicolons
- **Naming**: PascalCase (types), camelCase (functions), kebab-case (files)

### Pull Request Guidelines

1. **Branch naming**: `feat/feature-name`, `fix/bug-name`, `docs/doc-name`
2. **PR title**: Follow conventional commits
3. **PR description**: Include context, changes, testing steps
4. **Link issues**: Reference related issues/specs
5. **Tests**: Ensure tests pass (`pnpm test`)
6. **Migrations**: Document any schema changes

### Testing Guidelines

- **Unit tests**: Test pure functions in isolation
- **Integration tests**: Test API endpoints with real database
- **E2E tests**: Test user workflows in browser
- **Coverage target**: 75% statements/lines/functions, 65% branches

---

## Next Steps

### Learn More

- **Architecture**: [ARCH-001-system-architecture.md](../ARCH-001-system-architecture.md)
- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)
- **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Hunter Protocol**: [HUNTER-PROTOCOL.md](./features/hunter-protocol/HUNTER-PROTOCOL.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](./operations/TROUBLESHOOTING.md)

### Join the Community

- **GitHub Discussions**: Ask questions, share ideas
- **Issues**: Report bugs, request features
- **Pull Requests**: Contribute code, docs, tests

### Key Resources

- **OpenAPI Docs**: http://localhost:3001/docs
- **GraphQL Playground**: http://localhost:3001/graphql
- **Storybook** (coming soon): http://localhost:6006

---

## Support

Need help? We're here for you:

- **GitHub Issues**: https://github.com/anthropics/in-midst-my-life/issues
- **Email**: padavano.anthony@gmail.com
- **Documentation**: https://github.com/anthropics/in-midst-my-life/docs

---

**Welcome to the team! 🚀**

You're now ready to contribute to **In Midst My Life**. Happy coding!

# Contributing to in-midst-my-life

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/life-my--midst--in.git
   cd life-my--midst--in
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Start development services**:
   ```bash
   scripts/dev-up.sh  # PostgreSQL + Redis via Docker Compose
   pnpm dev           # All applications in parallel
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

Example: `feature/hunter-gap-analysis`

### Pre-commit Hooks

This project uses **Husky** + **lint-staged** to enforce quality on every commit.
When you `git commit`, the following runs automatically on staged `*.{ts,tsx}` files:

1. `eslint --fix` - Fixes auto-fixable lint issues
2. `prettier --write` - Formats code

If either step fails, the commit is rejected. Fix the issues and re-commit.

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Test updates
- `ci` - CI/CD changes
- `chore` - Build/tooling
- `security` - Security fixes

Example:
```
feat(hunter): add skill gap analysis endpoint

- Implements POST /hunter/analyze-gap
- Integrates with LLM for analysis
- Adds tests for edge cases

Closes #42
```

### Code Standards

- **TypeScript**: Strict mode enforced across the entire monorepo (`noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitAny`, etc.)
- **Testing**: 75%+ coverage required (statements, branches, functions, lines)
- **Formatting**: Prettier (enforced via pre-commit hook)
- **Linting**: ESLint with `@typescript-eslint` strict rules
- **File size**: Max 1200 LOC per file, max 200 LOC per function
- **Cyclomatic complexity**: Max 10

### Running Tests

```bash
# Unit tests (all packages)
pnpm test

# Watch mode
pnpm test:watch

# Coverage report (local)
pnpm test:coverage

# Integration tests (requires database)
INTEGRATION_POSTGRES_URL=postgresql://... pnpm integration

# E2E tests (requires Playwright browsers)
pnpm --filter @in-midst-my-life/web e2e

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Single Package Commands

```bash
pnpm --filter @in-midst-my-life/api test
pnpm --filter @in-midst-my-life/web typecheck
pnpm --filter @in-midst-my-life/core test:coverage
```

## Pull Request Process

1. **Create a feature branch** from `master`
2. **Make your changes** with clear, atomic commit messages
3. **Run the full verification suite**:
   ```bash
   pnpm typecheck && pnpm lint && pnpm test
   ```
4. **Push to your fork**
5. **Open a Pull Request** with:
   - Clear title (imperative mood, <72 chars)
   - Description referencing related issues
   - Screenshots for UI changes
6. **Address review feedback**

### PR Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] Code follows existing patterns and style
- [ ] Documentation updated if needed
- [ ] No sensitive data committed (.env, credentials, API keys)
- [ ] Commit messages follow conventional commits

## Architecture Overview

```
apps/
├── web/              Next.js 16 frontend (port 3000)
├── api/              Fastify REST API (port 3001)
└── orchestrator/     Node.js worker service (port 3002)

packages/
├── schema/           Zod schemas (single source of truth)
├── core/             Business logic (mask matching, crypto, billing)
├── content-model/    Narrative generation, JSON-LD transforms
└── design-system/    Shared UI components
```

### Key Patterns

- **Schema-First**: All data models defined in `packages/schema/` using Zod
- **Hexagonal Architecture**: Routes -> Services -> Repositories (in `apps/api`)
- **Repository Pattern**: Abstract data access behind interfaces
- **Functional Core, Imperative Shell**: Pure functions in packages, side effects at app boundaries
- **Dependency Injection**: All dependencies explicit; test doubles via constructor injection

### Module Boundaries

- Apps can import from `packages/*`
- `packages/content-model` and `packages/core` can import from `packages/schema`
- Apps **cannot** import from each other
- `packages/schema` cannot import from other packages
- No direct DB access outside the repository layer

## Need Help?

- **Questions**: Open a GitHub Issue
- **Security Issues**: See [SECURITY.md](docs/SECURITY.md)
- **Architecture**: See [ADRs](docs/adr/) for decision context

## Code of Conduct

Be respectful, inclusive, and constructive. We're building something meaningful here.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

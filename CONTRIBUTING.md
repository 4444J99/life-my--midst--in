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
   scripts/dev-up.sh  # PostgreSQL + Redis
   pnpm dev           # All applications
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

Example: `feature/hunter-gap-analysis`

### Commit Messages

Follow conventional commits:

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
- `chore` - Build/tooling

Example:
```
feat(hunter): add skill gap analysis endpoint

- Implements POST /hunter/analyze-gap
- Integrates with LLM for analysis
- Adds tests for edge cases

Closes #42
```

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Testing**: 75%+ coverage required
- **Formatting**: Prettier (auto-format on save)
- **Linting**: ESLint with TypeScript rules
- **File size**: Max 1200 LOC per file

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Integration tests (requires database)
INTEGRATION_POSTGRES_URL=postgresql://... pnpm integration

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear commit messages
3. **Run tests** to ensure nothing breaks
4. **Push to your fork**
5. **Open a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots (for UI changes)
6. **Address review feedback**

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated (if needed)
- [ ] No sensitive data committed
- [ ] Commit messages follow convention

## Areas for Contribution

### High Priority

- **Hunter Protocol**: Job search automation (Serper integration)
- **Theatrical UI**: Mask editor, timeline visualization
- **PDF Export**: Generate formatted resumes
- **Testing**: Increase coverage, add E2E tests

### Medium Priority

- **Documentation**: Improve guides, add examples
- **Accessibility**: WCAG compliance
- **Performance**: Optimize queries, caching
- **Mobile**: Responsive design improvements

### Good First Issues

Look for issues labeled `good first issue` for beginner-friendly tasks.

## Architecture Overview

```
apps/
├── web/          Next.js 15 frontend
├── api/          Fastify REST API
└── orchestrator/ Node.js worker service

packages/
├── schema/       Zod schemas (source of truth)
├── core/         Business logic
├── content-model/ Narrative generation
└── design-system/ Shared UI components
```

### Key Patterns

- **Schema-First**: All types defined in `packages/schema/`
- **Hexagonal Architecture**: Routes → Services → Repositories
- **Repository Pattern**: Abstract data access
- **Functional Core**: Pure functions in packages, side effects in apps

## Need Help?

- **Questions**: Open a GitHub Issue
- **Discussions**: Coming soon
- **Security Issues**: Email privately (see SECURITY.md)

## Code of Conduct

Be respectful, inclusive, and constructive. We're building something meaningful here.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

# GitHub Actions CI/CD Setup Guide

This document provides instructions for activating the CI/CD pipeline for the In Midst My Life monorepo.

## Overview

The repository includes several workflow files:
- **`ci-cd.yml`**: Comprehensive CI/CD pipeline (RECOMMENDED)
- **`test.yml`**: CI workflow — lint, typecheck, test (triggered on push/PR to master)
- **`deploy.yml`**: Deployment workflow
- **`security.yml`**: Security scanning workflow
- **`performance.yml`**: Bundle size and performance monitoring
- **`release.yml`**: release-please automation

## Current Status

✅ **Active Workflows:**
- `ci-cd.yml` - Primary CI/CD pipeline with all stages (quality, test, security, build, deploy-staging, smoke-tests, deploy-production, notify)
- `test.yml` - CI workflow (lint, typecheck, unit + integration tests)
- `deploy.yml` - Deployment to production
- `security.yml` - Security scanning and compliance
- `performance.yml` - Bundle size and performance monitoring
- `release.yml` - release-please automation

## Prerequisites

### Required GitHub Actions Secrets

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

#### Database & Infrastructure
```
POSTGRES_URL              # Production PostgreSQL connection string
REDIS_URL                 # Production Redis connection string
INTEGRATION_POSTGRES_URL  # Test database for CI (auto-configured in workflows)
INTEGRATION_REDIS_URL     # Test Redis for CI (auto-configured in workflows)
```

#### Kubernetes & Deployment (if using K8s)
```
KUBECONFIG                # Base64-encoded kubeconfig for production
KUBE_CONFIG_STAGING       # Base64-encoded kubeconfig for staging
KUBE_CONFIG_PRODUCTION    # Base64-encoded kubeconfig for production
POSTGRES_USER             # Database user for backups
POSTGRES_DB               # Database name for backups
```

#### Container Registry
```
GITHUB_TOKEN              # Auto-provided by GitHub Actions (no setup needed)
```

#### Optional Integrations
```
SLACK_WEBHOOK             # Slack webhook URL for notifications
SONAR_TOKEN               # SonarCloud token for code quality analysis
CODECOV_TOKEN             # Codecov token for coverage reports (optional)
```

### To Add Secrets:
1. Go to: `https://github.com/4444J99/life-my--midst--in/settings/secrets/actions`
2. Click "New repository secret"
3. Add each secret name and value
4. Click "Add secret"

## Workflow Configuration

### Primary Workflow: `ci-cd.yml`

This workflow includes:
1. **Code Quality & Type Checking** - Lint, typecheck, and build
2. **Unit & Integration Tests** - With PostgreSQL and Redis services
3. **Security Scanning** - pnpm audit and Trivy scanning
4. **Docker Image Building** - Build and push to GitHub Container Registry
5. **Staging Deployment** - Auto-deploy develop branch
6. **Smoke Tests** - Post-deployment verification
7. **Production Deployment** - Auto-deploy main branch
8. **Notifications** - Slack notifications (if configured)

**Triggers:**
- Push to `main`, `develop`, or `release/**` branches
- Pull requests to `main` or `develop`

**Services (auto-configured in CI):**
- PostgreSQL 16 (test database)
- Redis 7 (test cache)

### Test Services Configuration

The workflows automatically spin up test services:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: midst_test
    ports:
      - 5432:5432

  redis:
    image: redis:7-alpine
    ports:
      - 6379:6379
```

**Test Environment Variables (auto-set in CI):**
```bash
INTEGRATION_POSTGRES_URL=postgresql://test:test@localhost:5432/midst_test
INTEGRATION_REDIS_URL=redis://localhost:6379/1
```

## Branch Protection Rules

### Setup via GitHub CLI

Run these commands to configure branch protection:

```bash
# Main branch protection
gh api repos/4444J99/life-my--midst--in/branches/main/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=quality \
  --field required_status_checks[contexts][]=test \
  --field required_status_checks[contexts][]=security \
  --field required_status_checks[contexts][]=build \
  --field enforce_admins=true \
  --field required_pull_request_reviews[required_approving_review_count]=1 \
  --field required_pull_request_reviews[dismiss_stale_reviews]=true \
  --field required_pull_request_reviews[require_code_owner_reviews]=false \
  --field restrictions=null

# Develop branch protection
gh api repos/4444J99/life-my--midst--in/branches/develop/protection \
  --method PUT \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=quality \
  --field required_status_checks[contexts][]=test \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null
```

### Setup via GitHub UI

1. Go to: `https://github.com/4444J99/life-my--midst--in/settings/branches`
2. Click "Add branch protection rule"

#### For `main` branch:
- **Branch name pattern:** `main`
- ✅ **Require a pull request before merging**
  - Required approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required checks:**
    - `Code Quality & Types`
    - `Unit & Integration Tests`
    - `Security Scanning`
    - `Build Docker Images`
- ✅ **Require conversation resolution before merging**
- ✅ **Include administrators**
- ✅ **Restrict who can push to matching branches** (optional)
- ✅ **Do not allow bypassing the above settings**

#### For `develop` branch:
- **Branch name pattern:** `develop`
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required checks:**
    - `Code Quality & Types`
    - `Unit & Integration Tests`
- ✅ **Require conversation resolution before merging**

## Verification Steps

### 1. Test the CI Pipeline

Create a test PR:
```bash
git checkout -b test/ci-activation
echo "# CI/CD Test" >> TEST.md
git add TEST.md
git commit -m "test: verify CI/CD pipeline"
git push origin test/ci-activation
gh pr create --title "Test: CI/CD Pipeline Activation" --body "Testing CI/CD workflows"
```

### 2. Check Workflow Status

Monitor the workflow run:
```bash
gh run list --limit 5
gh run view <run-id>
gh run watch <run-id>
```

### 3. Verify Test Services

The workflows will:
- Start PostgreSQL and Redis containers
- Wait for health checks
- Run migrations if needed
- Execute tests with real database connections

### 4. Review Build Artifacts

After successful runs, check:
- Coverage reports in Codecov (if configured)
- Docker images in GitHub Container Registry
- Build artifacts in workflow runs

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# The workflow waits for services to be ready:
timeout 30 bash -c 'until pg_isready -h localhost -p 5432; do sleep 1; done'
```

If tests fail with connection errors:
- Check that `INTEGRATION_POSTGRES_URL` is correctly formatted
- Verify migrations run successfully
- Check service health in workflow logs

### Redis Connection Issues
```bash
# The workflow checks Redis availability:
timeout 30 bash -c 'until redis-cli -p 6379 ping; do sleep 1; done'
```

### pnpm Installation Issues
The workflows use `pnpm@10`. If dependencies fail:
- Check `pnpm-lock.yaml` is committed
- Verify Node version compatibility (22.x)
- Review package.json scripts

### Docker Build Failures
Common issues:
- Missing Dockerfiles in `apps/*/Dockerfile`
- Build context issues (workflows use repo root as context)
- Missing build dependencies

## Workflow Customization

### Disable Kubernetes Deployment
If you're not using K8s yet, comment out or remove these jobs in `ci-cd.yml`:
- `deploy-staging`
- `deploy-production`

### Disable Optional Integrations
To disable optional services, comment out:
- Slack notifications (requires `SLACK_WEBHOOK`)
- SonarCloud scanning (requires `SONAR_TOKEN`)
- Codecov uploads (optional, free for public repos)

### Adjust Test Coverage Thresholds
Edit `vitest.config.ts`:
```typescript
coverage: {
  statements: 75,
  branches: 65,
  functions: 75,
  lines: 75
}
```

## Next Steps

1. ✅ Add required secrets to GitHub repository
2. ✅ Configure branch protection rules
3. ✅ Test CI pipeline with a draft PR
4. ✅ Review and merge PR template usage
5. ✅ Document any project-specific CI requirements
6. 🔄 Configure deployment targets (if using K8s/cloud)
7. 🔄 Set up monitoring and alerting
8. 🔄 Configure Slack notifications (optional)

## Related Documentation

- [ARCH-003-cicd-pipeline.md](../ARCH-003-cicd-pipeline.md) - CI/CD architecture
- [AGENTS.md](../AGENTS.md) - Repository guidelines
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## Support

For issues with CI/CD setup:
1. Check workflow logs: `gh run view <run-id>`
2. Review this setup guide
3. Check GitHub Actions status page
4. Review error messages in failed jobs

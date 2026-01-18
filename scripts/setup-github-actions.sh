#!/usr/bin/env bash
# Setup script for GitHub Actions CI/CD pipeline
# This script helps configure branch protection and verify CI/CD setup

set -e

REPO_OWNER="4444J99"
REPO_NAME="life-my--midst--in"
REPO_FULL="${REPO_OWNER}/${REPO_NAME}"

echo "=================================================="
echo "GitHub Actions CI/CD Setup Script"
echo "Repository: ${REPO_FULL}"
echo "=================================================="
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed or not in PATH"
    echo "   Install from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "   Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Check current branch protections
echo "📋 Checking current branch protection status..."
echo ""

check_branch_protection() {
    local branch=$1
    echo "Branch: ${branch}"
    
    if gh api "repos/${REPO_FULL}/branches/${branch}/protection" &> /dev/null; then
        echo "  ✅ Branch protection is enabled"
        gh api "repos/${REPO_FULL}/branches/${branch}/protection" \
            --jq '.required_status_checks.contexts[]' 2>/dev/null | \
            sed 's/^/    - /' || echo "    (No required status checks)"
    else
        echo "  ⚠️  Branch protection is not configured"
    fi
    echo ""
}

check_branch_protection "main"
check_branch_protection "develop"

# Function to setup branch protection
setup_branch_protection() {
    local branch=$1
    shift
    local contexts=("$@")
    
    echo "🔧 Setting up branch protection for: ${branch}"
    
    # Build contexts JSON array
    local contexts_json="["
    for context in "${contexts[@]}"; do
        contexts_json+="\"${context}\","
    done
    contexts_json="${contexts_json%,}]"  # Remove trailing comma
    
    local payload=""
    if [ "${branch}" == "main" ]; then
        payload='{
          "required_status_checks": {
            "strict": true,
            "contexts": '"${contexts_json}"'
          },
          "enforce_admins": true,
          "required_pull_request_reviews": {
            "required_approving_review_count": 1,
            "dismiss_stale_reviews": true,
            "require_code_owner_reviews": false
          },
          "restrictions": null,
          "required_linear_history": false,
          "allow_force_pushes": false,
          "allow_deletions": false,
          "required_conversation_resolution": true
        }'
    else
        payload='{
          "required_status_checks": {
            "strict": true,
            "contexts": '"${contexts_json}"'
          },
          "enforce_admins": false,
          "required_pull_request_reviews": null,
          "restrictions": null,
          "required_linear_history": false,
          "allow_force_pushes": false,
          "allow_deletions": false,
          "required_conversation_resolution": true
        }'
    fi
    
    if gh api "repos/${REPO_FULL}/branches/${branch}/protection" \
        --method PUT \
        --input - <<< "${payload}" &> /dev/null; then
        echo "  ✅ Branch protection configured for ${branch}"
    else
        echo "  ❌ Failed to configure branch protection for ${branch}"
        echo "  You may need to configure it manually via GitHub UI"
    fi
    echo ""
}

# Ask user if they want to set up branch protection
echo "=================================================="
echo "Branch Protection Setup"
echo "=================================================="
echo ""
echo "Would you like to configure branch protection rules?"
echo "This will:"
echo "  - Require PR reviews for main branch"
echo "  - Require status checks to pass"
echo "  - Prevent force pushes"
echo "  - Require conversation resolution"
echo ""
read -p "Configure branch protection? (y/N) " -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Main branch - comprehensive protection
    setup_branch_protection "main" \
        "Code Quality & Types" \
        "Unit & Integration Tests" \
        "Security Scanning" \
        "Build Docker Images"
    
    # Develop branch - lighter protection
    setup_branch_protection "develop" \
        "Code Quality & Types" \
        "Unit & Integration Tests"
    
    echo "✅ Branch protection setup complete!"
else
    echo "⏭️  Skipping branch protection setup"
    echo "   You can configure it manually later via:"
    echo "   https://github.com/${REPO_FULL}/settings/branches"
fi
echo ""

# Check for required secrets
echo "=================================================="
echo "Required Secrets Check"
echo "=================================================="
echo ""
echo "Checking for required GitHub Actions secrets..."
echo ""

required_secrets=(
    "POSTGRES_URL"
    "REDIS_URL"
)

optional_secrets=(
    "KUBECONFIG"
    "KUBE_CONFIG_STAGING"
    "KUBE_CONFIG_PRODUCTION"
    "SLACK_WEBHOOK"
    "SONAR_TOKEN"
    "CODECOV_TOKEN"
)

# Note: GitHub API doesn't expose secret values, only names
echo "Note: This checks if secrets exist (not their values)"
echo ""

secrets_list=$(gh secret list --repo "${REPO_FULL}" 2>/dev/null || echo "")

check_secret() {
    local secret_name=$1
    local is_optional=$2
    
    if echo "${secrets_list}" | grep -q "^${secret_name}"; then
        echo "  ✅ ${secret_name}"
        return 0
    else
        if [ "${is_optional}" == "true" ]; then
            echo "  ⚪ ${secret_name} (optional)"
        else
            echo "  ❌ ${secret_name} (required)"
        fi
        return 1
    fi
}

echo "Required secrets:"
required_missing=0
for secret in "${required_secrets[@]}"; do
    check_secret "${secret}" "false" || ((required_missing++))
done
echo ""

echo "Optional secrets:"
for secret in "${optional_secrets[@]}"; do
    check_secret "${secret}" "true" || true
done
echo ""

if [ ${required_missing} -gt 0 ]; then
    echo "⚠️  ${required_missing} required secret(s) missing"
    echo "   Add secrets at: https://github.com/${REPO_FULL}/settings/secrets/actions"
    echo ""
    echo "   For production secrets, you'll need:"
    echo "   - POSTGRES_URL: Production PostgreSQL connection string"
    echo "   - REDIS_URL: Production Redis connection string"
else
    echo "✅ All required secrets are configured"
fi
echo ""

# Check workflow files
echo "=================================================="
echo "Workflow Files Status"
echo "=================================================="
echo ""

workflows=(
    "ci-cd.yml:Comprehensive CI/CD Pipeline (RECOMMENDED)"
    "test.yml:Standalone Testing"
    "deploy.yml:Deployment"
    "security.yml:Security Scanning"
    "ci.yml:Legacy CI (consider disabling)"
)

for workflow_info in "${workflows[@]}"; do
    IFS=':' read -r workflow_file workflow_desc <<< "${workflow_info}"
    workflow_path=".github/workflows/${workflow_file}"
    
    if [ -f "${workflow_path}" ]; then
        echo "✅ ${workflow_file}"
        echo "   ${workflow_desc}"
        
        # Check if workflow has postgres and redis services
        if grep -q "postgres:" "${workflow_path}" 2>/dev/null; then
            echo "   📦 PostgreSQL service: configured"
        fi
        if grep -q "redis:" "${workflow_path}" 2>/dev/null; then
            echo "   📦 Redis service: configured"
        fi
    else
        echo "❌ ${workflow_file} (missing)"
    fi
    echo ""
done

# Summary
echo "=================================================="
echo "Setup Summary"
echo "=================================================="
echo ""
echo "✅ Completed:"
echo "  - Prerequisites check"
echo "  - Workflow files verification"
echo "  - Secrets status check"
echo "  - Branch protection configuration (if selected)"
echo ""
echo "📚 Next Steps:"
echo "  1. Review: .github/GITHUB_ACTIONS_SETUP.md"
echo "  2. Add any missing secrets"
echo "  3. Test CI pipeline with a PR"
echo "  4. Monitor workflow runs: gh run list"
echo ""
echo "📖 Documentation:"
echo "  - Setup Guide: .github/GITHUB_ACTIONS_SETUP.md"
echo "  - PR Template: .github/PULL_REQUEST_TEMPLATE.md"
echo "  - Architecture: ARCH-003-cicd-pipeline.md"
echo ""
echo "🎉 CI/CD setup verification complete!"

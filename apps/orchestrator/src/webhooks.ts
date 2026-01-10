import type { AgentTask, AgentRole } from "./agents";

interface GitHubPayload {
  action?: string;
  repository?: { full_name?: string };
  issue?: { title?: string; number?: number };
  pull_request?: { title?: string; number?: number };
  sender?: { login?: string };
  ref?: string;
  head_commit?: { message?: string };
  pull_request_review?: { state?: string; body?: string };
  check_run?: { status?: string; conclusion?: string; name?: string };
  deployment_status?: { state?: string; environment?: string };
  workflow_run?: { status?: string; conclusion?: string; name?: string };
}

export function parseGitHubEvent(event: string | undefined, payload: Record<string, unknown>): AgentTask {
  const baseId = `gh-${Date.now()}`;
  const gh = payload as GitHubPayload;
  const repo = gh.repository?.full_name ?? "unknown/repo";
  const action = gh.action ?? "unknown";
  const id = `${baseId}-${event ?? "unknown"}-${action}`;

  if (event === "push") {
    return {
      id,
      role: "architect",
      description: `Push to ${repo} on ${gh.ref ?? "ref"}`,
      payload: {
        repo,
        ref: gh.ref,
        head: gh.head_commit?.message
      }
    };
  }

  if (event === "issues") {
    return {
      id,
      role: mapRole(action),
      description: `Issue #${gh.issue?.number ?? "?"} ${action}: ${gh.issue?.title ?? ""}`,
      payload: {
        repo,
        action,
        issue: gh.issue,
        sender: gh.sender?.login
      }
    };
  }

  if (event === "issue_comment") {
    return {
      id,
      role: "reviewer",
      description: `Issue comment ${action} on #${gh.issue?.number ?? "?"}`,
      payload: {
        repo,
        action,
        issue: gh.issue,
        sender: gh.sender?.login
      }
    };
  }

  if (event === "pull_request") {
    return {
      id,
      role: "reviewer",
      description: `PR #${gh.pull_request?.number ?? "?"} ${action}: ${gh.pull_request?.title ?? ""}`,
      payload: {
        repo,
        action,
        pull_request: gh.pull_request,
        sender: gh.sender?.login
      }
    };
  }

  if (event === "pull_request_review") {
    return {
      id,
      role: "reviewer",
      description: `PR review ${gh.pull_request_review?.state ?? action} on #${gh.pull_request?.number ?? "?"}`,
      payload: {
        repo,
        action,
        pull_request: gh.pull_request,
        review: gh.pull_request_review,
        sender: gh.sender?.login
      }
    };
  }

  if (event === "check_run") {
    return {
      id,
      role: "tester",
      description: `Check run ${gh.check_run?.name ?? "check"} ${gh.check_run?.status ?? action} (${gh.check_run?.conclusion ?? "pending"})`,
      payload: {
        repo,
        action,
        check_run: gh.check_run
      }
    };
  }

  if (event === "deployment_status") {
    return {
      id,
      role: "maintainer",
      description: `Deployment ${gh.deployment_status?.state ?? action} to ${gh.deployment_status?.environment ?? "env"}`,
      payload: {
        repo,
        action,
        deployment_status: gh.deployment_status
      }
    };
  }

  if (event === "workflow_run") {
    return {
      id,
      role: "tester",
      description: `Workflow ${gh.workflow_run?.name ?? "run"} ${gh.workflow_run?.status ?? action}`,
      payload: {
        repo,
        action,
        workflow_run: gh.workflow_run
      }
    };
  }

  return {
    id,
    role: "architect",
    description: `GitHub event ${event ?? "unknown"}`,
    payload: {
      repo,
      action,
      raw: payload
    }
  };
}

function mapRole(action: string): AgentRole {
  if (action === "opened" || action === "reopened") return "architect";
  if (action === "closed" || action === "merged") return "maintainer";
  return "implementer";
}

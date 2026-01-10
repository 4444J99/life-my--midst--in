import { randomUUID } from "node:crypto";
import type { Project } from "@in-midst-my-life/schema";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload?: {
    action?: string;
    ref?: string;
    commits?: Array<{ message?: string }>;
    pull_request?: { title?: string; body?: string };
  };
}

export async function fetchGitHubRepos(username: string): Promise<GitHubRepo[]> {
  const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=100`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'in-midst-my-life-orchestrator'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as GitHubRepo[];
}

export async function fetchGitHubEvents(username: string): Promise<GitHubEvent[]> {
  const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'in-midst-my-life-orchestrator'
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as GitHubEvent[];
}

export async function fetchGitHubRepoByFullName(fullName: string): Promise<GitHubRepo | null> {
  const res = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'in-midst-my-life-orchestrator'
    }
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as GitHubRepo;
}

export function mapRepoToProject(repo: GitHubRepo, profileId: string, options?: { summary?: string; tags?: string[] }): Project {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    profileId,
    name: repo.name,
    subtitle: repo.description ?? undefined,
    role: "Repository Owner",
    startDate: repo.created_at,
    endDate: undefined,
    isOngoing: true,
    url: repo.html_url,
    repoUrl: repo.html_url,
    externalId: `github_repo_${repo.id}`,
    descriptionMarkdown: options?.summary ?? repo.description ?? undefined,
    tags: options?.tags ?? (repo.language ? [repo.language] : undefined),
    createdAt: now,
    updatedAt: now
  };
}

export async function upsertProjectByExternalId(
  apiBaseUrl: string,
  profileId: string,
  project: Project,
  externalId: string
): Promise<Project> {
  const res = await fetch(`${apiBaseUrl}/profiles/${profileId}/projects/upsert?externalId=${encodeURIComponent(externalId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project)
  });

  if (!res.ok) {
    throw new Error(`project_upsert_failed:${res.status}`);
  }

  const json = (await res.json()) as { data?: Project };
  if (!json.data) {
    throw new Error("project_upsert_failed:missing_data");
  }
  return json.data;
}

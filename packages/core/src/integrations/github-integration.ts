/**
 * GitHub Integration Service
 * Syncs GitHub profile data (repos, contributions, tech stack) with user profile
 */

import { z } from 'zod';

export interface GitHubProfile {
  login: string;
  id: number;
  name: string;
  bio: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  description: string;
  url: string;
  stargazers_count: number;
  language: string;
  topics: string[];
  updated_at: string;
  forks_count: number;
}

export interface GitHubContribution {
  year: number;
  count: number;
  level: 'none' | 'low' | 'moderate' | 'high';
}

export interface ExtractedSkills {
  languages: string[];
  frameworks: string[];
  tools: string[];
  topicsOfInterest: string[];
}

export const GitHubIntegrationSchema = z.object({
  userId: z.string().uuid(),
  profileId: z.string().uuid(),
  githubUsername: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  lastSyncedAt: z.date(),
  profile: z.object({
    name: z.string(),
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    publicRepos: z.number(),
    followers: z.number(),
    following: z.number(),
  }).optional(),
  repositories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    url: z.string().url(),
    stars: z.number(),
    language: z.string().optional(),
    topics: z.array(z.string()),
  })).default([]),
  skills: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    tools: z.array(z.string()),
  }).default({ languages: [], frameworks: [], tools: [] }),
  contributionStreak: z.number(),
  topicsOfInterest: z.array(z.string()),
});

export type GitHubIntegration = z.infer<typeof GitHubIntegrationSchema>;

export class GitHubIntegrationService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Generate GitHub OAuth URL for user authorization
   */
  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read:user user:email public_repo',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Fetch GitHub user profile
   */
  async fetchUserProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user profile');
    }

    return response.json();
  }

  /**
   * Fetch user's public repositories
   */
  async fetchRepositories(accessToken: string, username: string): Promise<GitHubRepository[]> {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=30`,
      {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    return response.json();
  }

  /**
   * Extract programming languages from repositories
   */
  extractLanguages(repositories: GitHubRepository[]): string[] {
    const languages = new Set<string>();
    repositories.forEach((repo) => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });
    return Array.from(languages).sort();
  }

  /**
   * Extract topics and interests from repositories
   */
  extractTopics(repositories: GitHubRepository[]): string[] {
    const topics = new Set<string>();
    repositories.forEach((repo) => {
      repo.topics?.forEach((topic) => topics.add(topic));
    });
    return Array.from(topics).sort();
  }

  /**
   * Infer frameworks from language and repository names
   */
  inferFrameworks(languages: string[], repositories: GitHubRepository[]): string[] {
    const frameworks = new Set<string>();
    const repoText = repositories.map((r) => `${r.name} ${r.description || ''}`).join(' ').toLowerCase();

    // Common framework patterns
    const frameworkPatterns: Record<string, string[]> = {
      React: ['react', 'nextjs', 'next.js'],
      Vue: ['vue', 'nuxt'],
      Angular: ['angular'],
      Django: ['django'],
      Flask: ['flask'],
      Rails: ['rails'],
      Express: ['express', 'expressjs'],
      Spring: ['spring', 'springboot'],
      FastAPI: ['fastapi'],
      Docker: ['docker', 'containerized'],
      Kubernetes: ['kubernetes', 'k8s'],
      GraphQL: ['graphql'],
      PostgreSQL: ['postgres', 'postgresql', 'psql'],
      MongoDB: ['mongodb', 'mongo'],
      AWS: ['aws', 'amazon'],
      GCP: ['gcp', 'google cloud'],
    };

    Object.entries(frameworkPatterns).forEach(([framework, patterns]) => {
      if (
        patterns.some((pattern) => repoText.includes(pattern)) ||
        languages.some((lang) => patterns.includes(lang.toLowerCase()))
      ) {
        frameworks.add(framework);
      }
    });

    return Array.from(frameworks).sort();
  }

  /**
   * Sync GitHub data to user profile
   */
  async syncToProfile(
    userId: string,
    profileId: string,
    accessToken: string
  ): Promise<GitHubIntegration> {
    try {
      // Fetch GitHub data
      const profile = await this.fetchUserProfile(accessToken);
      const repositories = await this.fetchRepositories(accessToken, profile.login);

      // Extract insights
      const languages = this.extractLanguages(repositories);
      const topics = this.extractTopics(repositories);
      const frameworks = this.inferFrameworks(languages, repositories);

      // Calculate contribution streak (simplified)
      const createdAt = new Date(profile.created_at);
      const now = new Date();
      const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      const integration: GitHubIntegration = {
        userId,
        profileId,
        githubUsername: profile.login,
        accessToken,
        lastSyncedAt: new Date(),
        profile: {
          name: profile.name || profile.login,
          bio: profile.bio || undefined,
          avatarUrl: profile.avatar_url,
          publicRepos: profile.public_repos,
          followers: profile.followers,
          following: profile.following,
        },
        repositories: repositories.slice(0, 10).map((repo) => ({
          name: repo.name,
          description: repo.description || undefined,
          url: repo.url,
          stars: repo.stargazers_count,
          language: repo.language || undefined,
          topics: repo.topics || [],
        })),
        skills: {
          languages,
          frameworks,
          tools: ['Git', ...Array.from(new Set(frameworks.filter((f) => f.includes('SQL') || f.includes('DB'))))],
        },
        contributionStreak: Math.min(daysSinceCreation, 1825), // Cap at 5 years
        topicsOfInterest: topics,
      };

      return integration;
    } catch (error) {
      console.error('GitHub sync error:', error);
      throw error;
    }
  }

  /**
   * Generate CV snippets from GitHub data
   */
  generateCVSnippets(integration: GitHubIntegration): Record<string, string[]> {
    const snippets: Record<string, string[]> = {
      technicalSkills: [
        `Languages: ${integration.skills.languages.join(', ')}`,
        `Frameworks: ${integration.skills.frameworks.join(', ')}`,
      ],
      projects: integration.repositories.slice(0, 5).map(
        (repo) =>
          `${repo.name}${repo.stars > 0 ? ` (${repo.stars} stars)` : ''}: ${repo.description || 'Open source project'}`
      ),
      openSource: [
        `Active open source contributor with ${integration.profile?.publicRepos || 0} public repositories`,
        `Areas of focus: ${integration.topicsOfInterest.slice(0, 3).join(', ')}`,
      ],
    };

    return snippets;
  }
}

export function createGitHubIntegrationService(): GitHubIntegrationService {
  const clientId = process.env['GITHUB_CLIENT_ID'] || '';
  const clientSecret = process.env['GITHUB_CLIENT_SECRET'] || '';
  const redirectUri = process.env['GITHUB_REDIRECT_URI'] || 'http://localhost:3000/integrations/github/callback';

  return new GitHubIntegrationService(clientId, clientSecret, redirectUri);
}
// Force rebuild

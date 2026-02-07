import { z } from 'zod';
import type { JobPosting, Profile, FeatureKey } from '@in-midst-my-life/schema';
import { type JobSearchProvider, type JobSearchQuery } from '../jobs';
import { MockJobSearchProvider } from '../search';
import type { LicensingService } from '../licensing/licensing-service';

export interface HunterAgentOptions {
  searchProvider?: JobSearchProvider;
  licensingService?: LicensingService;
  isDev?: boolean;
}

/**
 * Error thrown when a user hits a feature quota limit
 */
export class HunterQuotaExceededError extends Error {
  constructor(
    public feature: FeatureKey,
    public remaining: number,
    public tier: string,
  ) {
    super(`Quota exceeded for feature: ${feature}`);
    this.name = 'HunterQuotaExceededError';
  }
}

export const HunterSearchFilterSchema = z.object({
  keywords: z.array(z.string()),
  locations: z.array(z.string()).optional(),
  remote_requirement: z.enum(['fully', 'hybrid', 'onsite', 'any']).optional(),
  min_salary: z.number().optional(),
  max_salary: z.number().optional(),
  company_sizes: z.array(z.string()).optional(),
  required_technologies: z.array(z.string()).optional(),
  posted_within_days: z.number().optional(),
});

export type HunterSearchFilter = z.infer<typeof HunterSearchFilterSchema>;

/**
 * HunterService: Autonomous job search agent
 * Handles job discovery, compatibility analysis, resume tailoring, and application generation
 * Enforces feature gates and rate limits for quota compliance
 */
export class HunterService {
  private searchProvider: JobSearchProvider;
  private licensingService?: LicensingService;

  constructor(options?: HunterAgentOptions) {
    this.searchProvider = options?.searchProvider ?? new MockJobSearchProvider();
    this.licensingService = options?.licensingService;
  }

  /**
   * Check if a feature is available for a user, consume quota if allowed
   */
  private async checkFeatureQuota(
    profileId: string,
    feature: FeatureKey,
    amount: number = 1,
  ): Promise<void> {
    if (!this.licensingService) {
      return; // No licensing configured, allow all
    }

    const [allowed, remaining] = await this.licensingService.checkAndConsume(
      profileId,
      feature,
      amount,
    );

    if (!allowed) {
      const entitlements = await this.licensingService.getEntitlements(profileId);
      throw new HunterQuotaExceededError(feature, remaining, entitlements.tier);
    }
  }

  async findJobs(params: { profileId: string; filter: HunterSearchFilter; maxResults: number }) {
    const { profileId, filter, maxResults } = params;

    // Check feature quota
    await this.checkFeatureQuota(profileId, 'hunter_job_searches');

    // Convert Hunter filter to JobSearchQuery
    const query: JobSearchQuery = {
      keywords: filter.keywords,
      location: filter.locations?.[0], // simple mapping
      limit: maxResults,
    };

    const jobs = await this.searchProvider.search(query);

    // Filter locally if provider doesn't support all filters (e.g. salary)
    // For now, return as is
    return {
      jobs,
      totalFound: jobs.length,
      searchDurationMs: 0, // Mock
    };
  }

  analyzeGap(params: {
    profileId?: string;
    job: JobPosting;
    profile: Profile;
    personaId?: string;
  }) {
    const { job, profile } = params;

    // analyzeGap doesn't directly consume quota - it's used as part of other operations
    // However, if called standalone with profileId, we could track it separately

    // Logic from Orchestrator agent (simplified)
    const description = job.descriptionMarkdown || job.title; // Fallback
    const requiredSkills = this.extractSkillsRegex(description);

    // Extract profile skills from the optional skills array on Profile
    const profileSkills = new Set<string>();
    if (profile.skills && Array.isArray(profile.skills)) {
      for (const s of profile.skills) {
        profileSkills.add(s.name.toLowerCase());
      }
    }

    const required = requiredSkills.map((s) => s.toLowerCase());
    const present = required.filter((s) => profileSkills.has(s));
    const missing = required.filter((s) => !profileSkills.has(s));

    const score = required.length > 0 ? Math.round((present.length / required.length) * 100) : 50; // Neutral if no skills found

    const compatibility = {
      overall_score: score,
      skill_match: score,
      cultural_match: 50, // Placeholder
      growth_potential: 50,
      compensation_fit: 50,
      location_suitability: 50,
      recommendation: score > 80 ? 'apply_now' : score > 50 ? 'strong_candidate' : 'moderate_fit',
      skill_gaps: missing.map((s) => ({ skill: s, gap_severity: 'medium', learnable: true })),
      strengths: present,
      concerns: [],
    };

    return {
      compatibility,
      recommendation: compatibility.recommendation,
      effortEstimate: 2, // Hours
    };
  }

  async tailorResume(params: {
    profileId: string;
    jobId: string;
    profile: Profile;
    personaId: string;
  }) {
    const { profileId, personaId } = params;

    // Check feature quota for resume tailoring
    await this.checkFeatureQuota(profileId, 'resume_tailoring');

    // Placeholder logic
    return {
      maskedResume: 'Masked Resume Content...',
      keyPointsToEmphasize: ['Experience A', 'Skill B'],
      areasToDeEmphasize: ['Irrelevant C'],
      personaRecommendation: personaId,
    };
  }

  writeCoverLetter(params: {
    profileId: string;
    job: JobPosting;
    profile: Profile;
    personaId: string;
    tailoredResume: string;
  }) {
    const { job, profile } = params;
    const candidateName = profile.displayName || 'Candidate';

    // Note: Cover letter generation could be gated under narrative_generation
    // For now, it's included with the complete application pipeline

    const letter = `Dear Hiring Team,\n\nI am excited to apply for the ${job.title} position at ${job.company}.\n\nSincerely,\n${candidateName}`;

    return {
      coverLetter: letter,
      personalizedElements: ['Company Name', 'Job Title'],
      tone: 'formal' as const,
    };
  }

  async completeApplicationPipeline(params: {
    profileId: string;
    profile: Profile;
    personaId: string;
    searchFilter: HunterSearchFilter;
    autoApplyThreshold: number;
    maxApplications: number;
  }) {
    const { profileId, profile, personaId, searchFilter, autoApplyThreshold, maxApplications } =
      params;

    // Check if auto-apply is allowed (some tiers might not have this feature)
    // This is checked here rather than in a separate method since it's the bulk operation feature
    // Note: Individual job searches consume hunter_job_searches quota
    try {
      await this.checkFeatureQuota(profileId, 'auto_apply');
    } catch (error) {
      if (error instanceof HunterQuotaExceededError && error.feature === 'auto_apply') {
        // If auto-apply is blocked (e.g., Free tier), we can still do the search but not auto-apply
        // This is a design choice - could also fail entirely
        console.warn(`Auto-apply not available for profile ${profileId}`);
      } else {
        throw error;
      }
    }

    // Chain the methods
    const { jobs } = await this.findJobs({
      profileId,
      filter: searchFilter,
      maxResults: maxApplications,
    });
    const applications = [];
    const errors = [];

    for (const job of jobs) {
      try {
        const analysis = this.analyzeGap({ profileId, job: job as JobPosting, profile, personaId });

        let status = 'skipped';
        const recommendation = analysis.recommendation;

        if (analysis.compatibility.overall_score >= autoApplyThreshold) {
          status = 'draft'; // We don't auto-submit yet
          // In real flow, we'd generate resume and cover letter here
        }

        applications.push({
          id: 'app-' + Math.random().toString(36).substr(2, 9),
          job_id: job.id,
          status,
          resume_version: 'v1',
          compatibility_analysis: analysis.compatibility,
          recommendation,
        });
      } catch (error) {
        errors.push({
          jobId: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      applications,
      skipped: Math.max(0, jobs.length - applications.length),
      errors,
    };
  }

  private extractSkillsRegex(description: string): string[] {
    const skillKeywords = [
      'javascript',
      'typescript',
      'react',
      'node',
      'postgres',
      'aws',
      'docker',
    ];
    const found = new Set<string>();
    const lowerDesc = description.toLowerCase();
    for (const skill of skillKeywords) {
      if (lowerDesc.includes(skill)) found.add(skill);
    }
    return Array.from(found);
  }
}

/**
 * Factory function to create a Hunter Agent
 * @param isDev - Whether to use development mode (mocks)
 * @param licensingService - Optional licensing service for quota enforcement
 * @returns Configured HunterService instance
 */
export function createHunterAgent(
  isDev: boolean = false,
  licensingService?: LicensingService,
): HunterService {
  return new HunterService({ isDev, licensingService });
}

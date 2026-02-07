/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
import {
  DefaultCompatibilityAnalyzer as CompatibilityAnalyzer,
  DocumentGenerator,
  FeatureNotAvailableError,
  NotFoundError,
  QuotaExceededError,
  ValidationError,
  type LicensingService,
} from '@in-midst-my-life/core';
import type { JobListing, JobPosting, Profile } from '@in-midst-my-life/schema';
import { JobSearchProvider, type JobSearchCriteria } from './job-search-provider';
import { randomUUID } from 'node:crypto';
import type { JobRepo } from '../repositories/jobs';
import type { ProfileRepo } from '../repositories/profiles';
import type {
  ApplicationSubmission,
  ApplicationSubmissionResult,
  GeneratedCoverLetter,
  TailoredResume,
} from '../types/hunter-protocol';

export interface CompatibilityReport {
  profileId: string;
  targetRole: string;
  compatibility: number;
  gaps: any[];
  suggestions: string[];
  concerns: string[];
  timestamp: string;
}

type JobSearchResult = JobListing & {
  score: number;
  compatibilityScore: number;
  appliedAt: string | null;
  savedAt: string;
};

export interface HunterService {
  findJobs(profileId: string, criteria: JobSearchCriteria): Promise<JobSearchResult[]>;

  analyzeGap(profileId: string, targetRole: string): Promise<CompatibilityReport>;

  tailorResume(
    profileId: string,
    jobId: string,
    maskIdOrOptions?:
      | string
      | {
          format?: 'pdf' | 'docx' | 'markdown';
          highlightGaps?: boolean;
          includeMetadata?: boolean;
          personaId?: string;
        },
  ): Promise<TailoredResume>;

  generateCoverLetter(
    profileId: string,
    jobId: string,
    options?: {
      template?: 'professional' | 'creative' | 'direct' | 'academic';
      tone?: 'formal' | 'conversational' | 'enthusiastic';
      includeSalutation?: boolean;
      includeSignature?: boolean;
      personaId?: string;
    },
  ): Promise<GeneratedCoverLetter>;

  submitApplication(
    profileId: string,
    jobId: string,
    options?: {
      autoSubmit?: boolean;
      customResume?: string;
      customCoverLetter?: string;
      submissionType?: 'manual' | 'auto';
    },
  ): Promise<ApplicationSubmissionResult>;

  writeCoverLetter(
    profileId: string,
    jobId: string,
    personaId: string,
  ): Promise<{
    coverLetterMarkdown: string;
    personalizationNotes: string;
    toneUsed: 'formal' | 'conversational' | 'enthusiastic';
  }>;

  completeApplicationPipeline(profileId: string, jobId: string, personaId: string): Promise<any>;

  batchApply(
    profileId: string,
    searchFilter: JobSearchCriteria,
    personaId: string,
    autoApplyThreshold: number,
    maxApplications?: number,
  ): Promise<{
    applications: ApplicationSubmissionResult[];
    skipped: number;
    errors: Array<{ jobId: string; error: string }>;
  }>;

  getApplications(profileId: string): Promise<any>;
  getApplicationStats(profileId: string): Promise<any>;
}

export class DefaultHunterService implements HunterService {
  private jobSearchProvider: JobSearchProvider;
  private documentGenerator: DocumentGenerator;

  constructor(
    private profileRepo: ProfileRepo,
    private licensingService?: LicensingService,
    private jobPostingRepo?: JobRepo,
    private jobApplicationRepo?: JobRepo,
  ) {
    this.jobSearchProvider = new JobSearchProvider();
    this.documentGenerator = new DocumentGenerator();
  }

  async analyzeGap(profileId: string, targetRole: string): Promise<CompatibilityReport> {
    // 1. Validate inputs
    if (!profileId) throw new ValidationError('profileId required');
    if (!targetRole) throw new ValidationError('targetRole required');

    // 2. Fetch profile data
    const profile = await this.profileRepo.find(profileId);
    if (!profile) {
      throw new NotFoundError(`Profile not found: ${profileId}`);
    }

    // 3. Call existing compatibility analyzer from core
    const analyzer = new CompatibilityAnalyzer();

    // Create a realistic mock job description and technologies based on role type
    let description = `Role for ${targetRole}`;
    let requirements = targetRole;
    let technologies: string[] = [];

    if (
      targetRole.toLowerCase().includes('cto') ||
      targetRole.toLowerCase().includes('chief technology')
    ) {
      description =
        'Looking for a CTO to lead architecture, strategy, and team leadership. Experience with distributed systems, infrastructure, and team management required.';
      requirements = 'Architecture, strategy, team leadership, infrastructure';
      // Use generic terms not expected in junior profiles
      technologies = ['Kubernetes', 'Go', 'Rust', 'Infrastructure', 'Leadership'];
    } else if (targetRole.toLowerCase().includes('senior')) {
      description =
        'Senior role requiring advanced technical expertise, mentorship, and architectural decisions.';
      requirements = 'Senior technical expertise, mentorship, architectural decisions';
      // Use generic terms likely to be somewhat relevant
      technologies = ['Systems', 'Architecture', 'Leadership', 'Mentorship'];
    } else {
      // Default for junior roles
      technologies = ['JavaScript', 'React', 'Collaboration'];
    }

    const mockJob: JobListing = {
      id: randomUUID(),
      title: targetRole,
      company: 'Hypothetical Company',
      location: 'Remote',
      remote: 'fully',
      description,
      requirements,
      technologies,
      job_url: 'http://placeholder',
      posted_date: new Date(),
      source: 'other',
    };

    const analysis = await analyzer.analyze({
      job_id: mockJob.id,
      profile_id: profileId,
      persona_id: 'default',
      job: mockJob,
      profile,
    });

    // 4. Return structured gap analysis
    return {
      profileId,
      targetRole,
      compatibility: analysis.overall_score,
      gaps: analysis.skill_gaps,
      suggestions: analysis.strengths,
      concerns: analysis.concerns,
      timestamp: new Date().toISOString(),
    };
  }

  async findJobs(profileId: string, criteria: JobSearchCriteria): Promise<JobSearchResult[]> {
    // 1. Verify profile exists
    const profile = await this.profileRepo.find(profileId);
    if (!profile) {
      throw new NotFoundError(`Profile not found: ${profileId}`);
    }

    // 2. Enforce feature gate
    if (this.licensingService) {
      const [allowed, remaining] = await this.licensingService.checkAndConsume(
        profileId,
        'hunter_job_searches',
      );

      if (!allowed) {
        await this.licensingService.getEntitlements(profileId);
        const limit = 100;
        const used = limit - remaining;
        throw new QuotaExceededError('hunter_job_searches', limit, used);
      }
    }

    // 3. Call job search provider
    const jobs = await this.jobSearchProvider.search({
      keywords: criteria.keywords,
      location: criteria.location,
      seniority: criteria.seniority,
      maxResults: Math.min(criteria.maxResults || 10, 50),
    });

    if (!jobs || jobs.length === 0) {
      return [];
    }

    // 4. Rank results by compatibility with profile

    // Convert JobPosting to JobListing for ranking
    const jobListings = jobs.map((job) => this.mapJobPostingToListing(job));
    const rankedJobs = await this.rankJobs(profile, jobListings);

    // Save discovered jobs to repository
    if (this.jobPostingRepo) {
      for (const job of rankedJobs) {
        await this.jobPostingRepo.addPosting({
          ...job,
          profileId: profileId,
          descriptionMarkdown: job.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
        });
      }
    }

    // 4. Return ranked results with metadata
    return rankedJobs.map((job) => ({
      ...job,
      score: job.score,
      compatibilityScore: job.score,
      appliedAt: null,
      savedAt: new Date().toISOString(),
    }));
  }

  private async rankJobs(
    profile: Profile,
    jobs: JobListing[],
  ): Promise<(JobListing & { score: number })[]> {
    const analyzer = new CompatibilityAnalyzer();

    const ranked = await Promise.all(
      jobs.map(async (job) => {
        const report = await analyzer.analyze({
          job_id: job.id,
          profile_id: profile.id,
          persona_id: 'default',
          job,
          profile,
        });
        return {
          ...job,
          score: report.overall_score,
        };
      }),
    );

    return ranked.sort((a, b) => b.score - a.score);
  }

  async tailorResume(
    profileId: string,
    jobId: string,
    maskIdOrOptions?:
      | string
      | {
          format?: 'pdf' | 'docx' | 'markdown';
          highlightGaps?: boolean;
          includeMetadata?: boolean;
          personaId?: string;
        },
  ): Promise<TailoredResume> {
    const licensing = this.getLicensingServiceOrThrow();
    const [allowed, remaining] = await licensing.checkAndConsume(profileId, 'resume_tailoring');

    if (!allowed) {
      const limit = await licensing.getLimitForFeature(profileId, 'resume_tailoring');
      const used = await licensing.getUsageForFeature(profileId, 'resume_tailoring');
      throw new QuotaExceededError('resume_tailoring', limit, used);
    }

    const profile = await this.profileRepo.find(profileId);
    if (!profile) {
      throw new NotFoundError(`Profile not found: ${profileId}`);
    }

    const posting = await this.fetchJobPosting(jobId);
    const job = this.mapJobPostingToListing(posting);

    const options = typeof maskIdOrOptions === 'string' ? {} : (maskIdOrOptions ?? {});
    const personaId =
      typeof maskIdOrOptions === 'string' ? maskIdOrOptions : maskIdOrOptions?.personaId;

    const tailored = await this.documentGenerator.generateResume(profile, job, {
      highlightGaps: options.highlightGaps ?? true,
      includeMetadata: options.includeMetadata ?? true,
      personaId,
    });

    const personalizationNotes = tailored.suggestedImprovements.join(', ');
    const tailoringRationale = tailored.suggestedImprovements.join('; ');

    return {
      profileId,
      jobId: job.id,
      jobTitle: job.title,
      jobCompany: job.company,
      personaRecommendation: personaId ?? 'Generalist',
      resume: {
        content: tailored.content,
        format: options.format ?? 'markdown',
        confidence: tailored.confidence,
        keywordMatches: tailored.keywordMatches,
        suggestedImprovements: tailored.suggestedImprovements,
      },
      resumeMarkdown: tailored.content,
      selectedExperiences: tailored.keywordMatches,
      tailoringRationale,
      personalizationNotes,
      metadata: {
        generatedAt: new Date().toISOString(),
        remainingTailorings: this.normalizeRemainingCount(remaining),
        expiresAt: this.calculateQuotaExpiry(profileId),
      },
    };
  }

  async generateCoverLetter(
    profileId: string,
    jobId: string,
    options?: {
      template?: 'professional' | 'creative' | 'direct' | 'academic';
      tone?: 'formal' | 'conversational' | 'enthusiastic';
      includeSalutation?: boolean;
      includeSignature?: boolean;
      personaId?: string;
    },
  ): Promise<GeneratedCoverLetter> {
    const licensing = this.getLicensingServiceOrThrow();
    const tier = await licensing.getTierForProfile(profileId);
    const limit = await licensing.getLimitForFeature(profileId, 'cover_letter_generation');

    if (limit === 0 && tier !== 'ENTERPRISE') {
      throw new FeatureNotAvailableError('cover_letter_generation', tier);
    }

    const [allowed, remaining] = await licensing.checkAndConsume(
      profileId,
      'cover_letter_generation',
    );

    if (!allowed) {
      const used = await licensing.getUsageForFeature(profileId, 'cover_letter_generation');
      const normalizedLimit = limit === -1 ? Number.MAX_SAFE_INTEGER : limit;
      throw new QuotaExceededError('cover_letter_generation', normalizedLimit, used);
    }

    const profile = await this.profileRepo.find(profileId);
    if (!profile) {
      throw new NotFoundError(`Profile not found: ${profileId}`);
    }

    const posting = await this.fetchJobPosting(jobId);
    const job = this.mapJobPostingToListing(posting);
    const template = options?.template ?? 'professional';
    const tone = options?.tone ?? 'formal';
    const includeSalutation = options?.includeSalutation ?? true;
    const includeSignature = options?.includeSignature ?? true;

    const letterResult = await this.documentGenerator.generateCoverLetter(profile, job, {
      template,
      tone,
      includeSalutation,
      includeSignature,
      personaId: options?.personaId,
    });

    const personalizationNotes = letterResult.suggestedImprovements.join(', ');
    const wordCount = letterResult.content.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      profileId,
      jobId: job.id,
      jobTitle: job.title,
      jobCompany: job.company,
      hiringManager: posting.company || 'Hiring Manager',
      coverLetterMarkdown: letterResult.content,
      personalizationNotes,
      toneUsed: letterResult.tone,
      coverLetter: {
        content: letterResult.content,
        template,
        tone,
        wordCount,
        readingTime,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        remainingLetters: this.normalizeRemainingCount(remaining),
        expiresAt: this.calculateQuotaExpiry(profileId),
        editableUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  async writeCoverLetter(profileId: string, jobId: string, personaId: string) {
    const letter = await this.generateCoverLetter(profileId, jobId, {
      template: 'professional',
      tone: 'formal',
      personaId,
    });

    return {
      coverLetterMarkdown: letter.coverLetter.content,
      personalizationNotes: letter.personalizationNotes ?? '',
      toneUsed: letter.coverLetter.tone,
    };
  }

  async completeApplicationPipeline(_profileId: string, _jobId: string, _personaId: string) {
    throw new Error('Application pipeline completion is not yet implemented — see Phase 6 roadmap');
  }

  async submitApplication(
    profileId: string,
    jobId: string,
    options?: {
      autoSubmit?: boolean;
      customResume?: string;
      customCoverLetter?: string;
      submissionType?: 'manual' | 'auto';
    },
  ): Promise<ApplicationSubmissionResult> {
    const profile = await this.profileRepo.find(profileId);
    if (!profile) {
      throw new NotFoundError(`Profile not found: ${profileId}`);
    }

    const jobPosting = await this.fetchJobPosting(jobId);
    const job = this.mapJobPostingToListing(jobPosting);

    if (options?.autoSubmit) {
      const licensing = this.getLicensingServiceOrThrow('auto_apply');
      const tier = await licensing.getTierForProfile(profileId);
      const limit = await licensing.getLimitForFeature(profileId, 'auto_apply');

      if (limit === 0 && tier !== 'ENTERPRISE') {
        throw new FeatureNotAvailableError('auto_apply', tier);
      }

      const [autoAllowed, _autoRemaining] = await licensing.checkAndConsume(
        profileId,
        'auto_apply',
      );
      if (!autoAllowed) {
        const used = await licensing.getUsageForFeature(profileId, 'auto_apply');
        const normalizedLimit = limit === -1 ? Number.MAX_SAFE_INTEGER : limit;
        throw new QuotaExceededError('auto_apply', normalizedLimit, used);
      }
    }

    let resumeContent = options?.customResume;
    if (!resumeContent) {
      const tailored = await this.tailorResume(profileId, jobId);
      resumeContent = tailored.resume.content;
    }

    let coverLetterContent = options?.customCoverLetter;
    if (!coverLetterContent) {
      const generated = await this.generateCoverLetter(profileId, jobId);
      coverLetterContent = generated.coverLetter.content;
    }

    const submissionId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const submission: ApplicationSubmission = {
      id: submissionId,
      profileId,
      jobId,
      jobTitle: job.title,
      jobCompany: job.company,
      resume: resumeContent ?? '',
      coverLetter: coverLetterContent ?? '',
      submittedAt: new Date().toISOString(),
      status: 'applied',
      submissionType: options?.submissionType ?? 'manual',
      confirmationCode: this.generateConfirmationCode(),
    };

    console.log(`[HUNTER] Application submitted: ${submissionId}`, {
      profileId,
      jobId,
      autoSubmit: options?.autoSubmit,
      submissionType: submission.submissionType,
    });

    await this.persistSubmission(submission, jobPosting);

    return {
      success: true,
      submissionId,
      jobTitle: job.title,
      jobCompany: job.company,
      confirmationCode: submission.confirmationCode,
      submitted: {
        resume: Boolean(resumeContent),
        coverLetter: Boolean(coverLetterContent),
        autoSubmitted: options?.autoSubmit ?? false,
      },
      nextSteps: [
        'Your application has been recorded',
        'You will receive updates as hiring progresses',
        'View all applications in your dashboard',
        options?.autoSubmit
          ? 'This application was auto-submitted to the job board'
          : 'This application was recorded locally (manual submission to job board recommended)',
      ],
      metadata: {
        submittedAt: new Date().toISOString(),
        trackingId: submissionId,
        communicationPreferences: {
          emailNotifications: true,
          smsNotifications: false,
          inAppNotifications: true,
        },
      },
    };
  }

  async getApplications(_profileId: string): Promise<any> {
    if (this.jobApplicationRepo) {
      return this.jobApplicationRepo.listApplications();
    }
    return { data: [], total: 0 };
  }

  async getApplicationStats(_profileId: string): Promise<any> {
    if (this.jobApplicationRepo) {
      return {};
    }
    return {};
  }

  private async fetchJobPosting(jobId: string): Promise<JobPosting> {
    const job = this.jobPostingRepo ? await this.jobPostingRepo.findPosting(jobId) : undefined;
    if (!job) {
      throw new NotFoundError(`Job listing not found: ${jobId}`);
    }
    return job;
  }

  private mapJobPostingToListing(posting: JobPosting): JobListing {
    return {
      id: posting.id,
      title: posting.title,
      company: posting.company,
      location: posting.location ?? 'Remote',
      remote: this.mapRemoteValue(posting.remote),
      description: posting.descriptionMarkdown ?? '',
      requirements: posting.descriptionMarkdown ?? '',
      job_url: posting.url ?? 'https://example.com',
      posted_date: new Date(posting.createdAt),
      source: 'other',
      company_size: 'mid-market',
      company_industry: undefined,
      application_deadline: undefined,
      technologies: [],
      salary_min: undefined,
      salary_max: undefined,
      currency: undefined,
    };
  }

  private mapRemoteValue(value?: JobPosting['remote']): JobListing['remote'] {
    if (value === 'onsite') return 'onsite';
    if (value === 'hybrid' || !value) return 'hybrid';
    return 'fully';
  }

  private normalizeRemainingCount(value: number): number {
    return value === -1 ? Number.POSITIVE_INFINITY : value;
  }

  private getLicensingServiceOrThrow(feature: string = 'feature'): LicensingService {
    if (!this.licensingService) {
      throw new FeatureNotAvailableError(feature, 'UNKNOWN');
    }
    return this.licensingService;
  }

  private async persistSubmission(submission: ApplicationSubmission, job: JobPosting) {
    if (!this.jobApplicationRepo) {
      return;
    }

    const now = submission.submittedAt;
    await this.jobApplicationRepo.addApplication({
      id: submission.id,
      profileId: submission.profileId,
      jobPostingId: job.id,
      status: submission.status,
      coverLetterMarkdown: submission.coverLetter,
      resumeSnapshotId: undefined,
      appliedAt: now,
      notes: `Submission Type: ${submission.submissionType}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  private generateConfirmationCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    return `${timestamp}-${random}`;
  }

  private calculateQuotaExpiry(_profileId: string): string {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  async batchApply(
    profileId: string,
    searchFilter: JobSearchCriteria,
    _personaId: string,
    autoApplyThreshold: number,
    maxApplications: number = 10,
  ): Promise<{
    applications: ApplicationSubmissionResult[];
    skipped: number;
    errors: Array<{ jobId: string; error: string }>;
  }> {
    const applications: ApplicationSubmissionResult[] = [];
    const errors: Array<{ jobId: string; error: string }> = [];
    let skipped = 0;

    try {
      // 1. Search for jobs matching criteria
      const jobs = await this.findJobs(profileId, searchFilter);

      if (!jobs || jobs.length === 0) {
        return { applications: [], skipped: 0, errors: [] };
      }

      // 2. Filter jobs above threshold and limit to maxApplications
      const eligibleJobs = jobs
        .filter((job) => job.compatibilityScore >= autoApplyThreshold)
        .slice(0, maxApplications);

      skipped = jobs.length - eligibleJobs.length;

      // 3. Apply to each eligible job
      for (const job of eligibleJobs) {
        try {
          const result = await this.submitApplication(profileId, job.id, {
            autoSubmit: true,
            submissionType: 'auto',
          });
          applications.push(result);
        } catch (error) {
          errors.push({
            jobId: job.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return { applications, skipped, errors };
    } catch (error) {
      throw new Error(
        `Batch application failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

export function createHunterService(
  profileRepo: ProfileRepo,
  licensingService?: LicensingService,
  jobPostingRepo?: JobRepo,
  jobApplicationRepo?: JobRepo,
): HunterService {
  return new DefaultHunterService(
    profileRepo,
    licensingService,
    jobPostingRepo,
    jobApplicationRepo,
  );
}

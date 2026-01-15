import type {
  JobListing,
  CompatibilityAnalysis,
  HunterSearchFilter,
  Application,
  Profile,
} from "@in-midst-my-life/schema";

/**
 * Hunter Protocol Agent
 * Autonomous job-search orchestrator with 4 core tools:
 * 1. find_jobs - Search job boards intelligently
 * 2. analyze_gap - Honest skill assessment
 * 3. tailor_resume - Show the right mask for this role
 * 4. write_cover_letter - Personalized, authentic
 */

export interface FindJobsInput {
  filter: HunterSearchFilter;
  maxResults?: number;
}

export interface FindJobsOutput {
  jobs: JobListing[];
  totalFound: number;
  searchDurationMs: number;
}

export interface AnalyzeGapInput {
  job: JobListing;
  profile: Profile;
  personaId?: string;
}

export interface AnalyzeGapOutput {
  compatibility: CompatibilityAnalysis;
  recommendation: "apply_now" | "strong_candidate" | "moderate_fit" | "stretch_goal" | "skip";
  effortEstimate: number; // minutes to complete application
}

export interface TailorResumeInput {
  jobId: string;
  profile: Profile;
  personaId: string;
}

export interface TailorResumeOutput {
  maskedResume: string;
  keyPointsToEmphasize: string[];
  areasToDeEmphasize: string[];
  personaRecommendation: string;
}

export interface WriteCoverLetterInput {
  job: JobListing;
  profile: Profile;
  personaId: string;
  tailoredResume: string;
}

export interface WriteCoverLetterOutput {
  coverLetter: string;
  personalizedElements: string[];
  tone: "formal" | "conversational" | "enthusiastic";
}

export class HunterAgent {
  private jobSearchService: JobSearchService;
  private compatibilityAnalyzer: CompatibilityAnalyzer;
  private resumeTailor: ResumeTailor;
  private coverLetterGenerator: CoverLetterGenerator;

  constructor(
    jobSearchService: JobSearchService,
    compatibilityAnalyzer: CompatibilityAnalyzer,
    resumeTailor: ResumeTailor,
    coverLetterGenerator: CoverLetterGenerator
  ) {
    this.jobSearchService = jobSearchService;
    this.compatibilityAnalyzer = compatibilityAnalyzer;
    this.resumeTailor = resumeTailor;
    this.coverLetterGenerator = coverLetterGenerator;
  }

  /**
   * Tool 1: Find Jobs
   * Intelligently search job boards with filters
   * Solves: Avoid applying to 2000 jobs - be strategic
   */
  async findJobs(input: FindJobsInput): Promise<FindJobsOutput> {
    const startTime = Date.now();

    // Search across configured sources
    const jobs = await this.jobSearchService.search(input.filter);

    // Rank by recency and relevance
    const rankedJobs = this.rankJobs(jobs, input.filter);

    const results = rankedJobs.slice(0, input.maxResults || 50);

    return {
      jobs: results,
      totalFound: jobs.length,
      searchDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Tool 2: Analyze Gap
   * Honest skill assessment between job requirements and candidate
   * Solves: Know exactly what the gap is before applying
   */
  async analyzeGap(input: AnalyzeGapInput): Promise<AnalyzeGapOutput> {
    const compatibility = await this.compatibilityAnalyzer.analyze({
      job_id: input.job.id,
      profile_id: input.profile.id,
      persona_id: input.personaId || "default",
      job: input.job,
      profile: input.profile,
    });

    // Recommendation logic
    let recommendation: AnalyzeGapOutput["recommendation"] = "skip";

    if (compatibility.overall_score >= 80) {
      recommendation = "apply_now";
    } else if (compatibility.overall_score >= 70) {
      recommendation = "strong_candidate";
    } else if (compatibility.overall_score >= 60) {
      recommendation = "moderate_fit";
    } else if (compatibility.overall_score >= 40) {
      recommendation = "stretch_goal";
    }

    // Effort estimation based on gap severity
    let effortMinutes = 20; // Base time for any application
    if (compatibility.skill_gaps.length > 0) {
      const criticalGaps = compatibility.skill_gaps.filter(
        (gap) => gap.gap_severity === "critical"
      );
      effortMinutes += criticalGaps.length * 10; // Extra time to address critical gaps
    }

    return {
      compatibility,
      recommendation,
      effortEstimate: effortMinutes,
    };
  }

  /**
   * Tool 3: Tailor Resume
   * Generate mask-specific resume showing the right face for this role
   * Solves: Don't send generic resume - show the relevant persona
   */
  async tailorResume(input: TailorResumeInput): Promise<TailorResumeOutput> {
    const tailored = await this.resumeTailor.generateForJob(
      input.profile,
      input.personaId,
      input.jobId
    );

    return {
      maskedResume: tailored.resume,
      keyPointsToEmphasize: tailored.emphasize,
      areasToDeEmphasize: tailored.deEmphasize,
      personaRecommendation: tailored.personaName,
    };
  }

  /**
   * Tool 4: Write Cover Letter
   * Generate personalized, authentic cover letter
   * Solves: Personalized > generic. Authentic > bullshit.
   */
  async writeCoverLetter(input: WriteCoverLetterInput): Promise<WriteCoverLetterOutput> {
    const coverLetter = await this.coverLetterGenerator.generate({
      job: input.job,
      profile: input.profile,
      personaId: input.personaId,
      tailoredResume: input.tailoredResume,
    });

    return {
      coverLetter: coverLetter.letter,
      personalizedElements: coverLetter.personalized,
      tone: coverLetter.tone,
    };
  }

  /**
   * Complete Application Pipeline
   * 1. Find jobs → 2. Analyze gap → 3. Tailor resume → 4. Write cover letter
   * Returns complete application ready to submit (or skip)
   */
  async completeApplicationPipeline(input: {
    profile: Profile;
    personaId: string;
    searchFilter: HunterSearchFilter;
    autoApplyThreshold: number; // Only auto-apply if compatibility >= this
    maxApplications: number;
  }): Promise<{
    applications: Application[];
    skipped: number;
    errors: string[];
  }> {
    const applications: Application[] = [];
    const errors: string[] = [];
    let skipped = 0;

    try {
      // Step 1: Find jobs
      const jobResults = await this.findJobs({
        filter: input.searchFilter,
        maxResults: input.maxApplications * 3, // Search wider to account for filtering
      });

      // Step 2-4: For each job, analyze, tailor, and write
      for (const job of jobResults.jobs) {
        if (applications.length >= input.maxApplications) break;

        try {
          // Analyze compatibility
          const gapAnalysis = await this.analyzeGap({
            job,
            profile: input.profile,
            personaId: input.personaId,
          });

          // Skip if below threshold
          if (
            gapAnalysis.compatibility.overall_score < input.autoApplyThreshold &&
            gapAnalysis.recommendation === "skip"
          ) {
            skipped++;
            continue;
          }

          // Tailor resume
          const resumeTailoring = await this.tailorResume({
            jobId: job.id,
            profile: input.profile,
            personaId: input.personaId,
          });

          // Write cover letter
          const coverLetterContent = await this.writeCoverLetter({
            job,
            profile: input.profile,
            personaId: input.personaId,
            tailoredResume: resumeTailoring.maskedResume,
          });

          // Create application
          const application: Application = {
            id: this.generateId(),
            job_id: job.id,
            profile_id: input.profile.id,
            persona_id: input.personaId,
            status: "draft",
            resume_version: resumeTailoring.personaRecommendation,
            cover_letter: coverLetterContent.coverLetter,
            application_date: new Date(),
            compatibility_analysis: gapAnalysis.compatibility,
            recommendation: this.scoreToRecommendation(
              gapAnalysis.compatibility.overall_score
            ),
          };

          applications.push(application);
        } catch (error) {
          errors.push(
            `Failed to process ${job.title} at ${job.company}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      return {
        applications,
        skipped,
        errors,
      };
    } catch (error) {
      throw new Error(
        `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Private helper methods
  private rankJobs(jobs: JobListing[], _filter: HunterSearchFilter): JobListing[] {
    return jobs.sort((a, b) => {
      // Rank by posting recency
      const aDate = a.posted_date.getTime();
      const bDate = b.posted_date.getTime();
      return bDate - aDate;
    });
  }

  private scoreToRecommendation(
    score: number
  ): "strong_yes" | "yes" | "maybe" | "no" {
    if (score >= 80) return "strong_yes";
    if (score >= 70) return "yes";
    if (score >= 50) return "maybe";
    return "no";
  }

  private generateId(): string {
    return `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Job Search Service Interface
 * Implement to integrate with LinkedIn, Indeed, etc.
 */
export interface JobSearchService {
  search(filter: HunterSearchFilter): Promise<JobListing[]>;
}

/**
 * Compatibility Analyzer Interface
 * Analyzes skill gaps and cultural fit
 */
export interface CompatibilityAnalyzer {
  analyze(input: {
    job_id: string;
    profile_id: string;
    persona_id: string;
    job: JobListing;
    profile: Profile;
  }): Promise<CompatibilityAnalysis>;
}

/**
 * Resume Tailor Interface
 * Generates mask-specific resumes
 */
export interface ResumeTailor {
  generateForJob(
    profile: Profile,
    personaId: string,
    jobId: string
  ): Promise<{
    resume: string;
    emphasize: string[];
    deEmphasize: string[];
    personaName: string;
  }>;
}

/**
 * Cover Letter Generator Interface
 * Generates personalized cover letters
 */
export interface CoverLetterGenerator {
  generate(input: {
    job: JobListing;
    profile: Profile;
    personaId: string;
    tailoredResume: string;
  }): Promise<{
    letter: string;
    personalized: string[];
    tone: "formal" | "conversational" | "enthusiastic";
  }>;
}

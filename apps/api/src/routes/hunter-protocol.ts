import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  FeatureNotAvailableError,
  NotFoundError,
  QuotaExceededError,
  type LicensingService,
} from "@in-midst-my-life/core";
import { HunterSearchFilterSchema } from "@in-midst-my-life/schema";
import type { Profile } from "@in-midst-my-life/schema";
import { profileRepo, type ProfileRepo } from "../repositories/profiles";
import { jobRepo as defaultJobRepo, type JobRepo } from "../repositories/jobs";
import { createFeatureGateMiddleware } from "../middleware/feature-gate";
import { createHunterService } from "../services/hunter";

/**
 * Hunter Protocol API Routes
 * Autonomous job-search agent endpoints
 */

export async function registerHunterProtocolRoutes(
  fastify: FastifyInstance,
  deps?: { repo?: ProfileRepo; jobRepo?: JobRepo; licensingService?: LicensingService }
) {
  const repo = deps?.repo ?? profileRepo;
  const jobRepoInstance = deps?.jobRepo ?? defaultJobRepo;

  // Use core hunter agent for logic
  // Use API service for orchestration and DB access
  const hunterService = createHunterService(
    repo,
    deps?.licensingService as LicensingService,
    jobRepoInstance,
    jobRepoInstance
  );

  /**
   * POST /hunter/tailor-resume/:jobId
   * Generate resume tailored to job listing
   */
  fastify.post<{ Params: { jobId: string } }>(
    "/hunter/tailor-resume/:jobId",
    {
      schema: {
        params: {
          type: "object",
          required: ["jobId"],
          properties: {
            jobId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const profileId = request.user?.profileId;

      if (!profileId) {
        return reply.code(401).send({
          ok: false,
          error: "unauthorized",
          message: "Authentication required",
        });
      }

      try {
        const result = await hunterService.tailorResume(profileId, jobId, {
          format: "markdown",
          highlightGaps: true,
        });

        return reply.code(200).send({
          ok: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          return reply.code(403).send({
            ok: false,
            error: "quota_exceeded",
            message: error.message,
            context: {
              feature: error.feature,
              limit: error.limit,
              used: error.used,
              remaining: error.limit - error.used,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /hunter/generate-letter/:jobId
   * Generate customized cover letter for job
   */
  fastify.post<{ Params: { jobId: string } }>(
    "/hunter/generate-letter/:jobId",
    {
      schema: {
        params: {
          type: "object",
          required: ["jobId"],
          properties: {
            jobId: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const profileId = request.user?.profileId;

      if (!profileId) {
        return reply.code(401).send({
          ok: false,
          error: "unauthorized",
          message: "Authentication required",
        });
      }

      try {
        const result = await hunterService.generateCoverLetter(profileId, jobId, {
          template: "professional",
          tone: "formal",
        });

        return reply.code(200).send({
          ok: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof FeatureNotAvailableError) {
          return reply.code(403).send({
            ok: false,
            error: "feature_not_available",
            message: error.message,
          });
        }
        if (error instanceof QuotaExceededError) {
          return reply.code(403).send({
            ok: false,
            error: "quota_exceeded",
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  /**
   * POST /hunter/submit-application/:jobId
   * Submit application with resume and cover letter
   */
  fastify.post<{ Params: { jobId: string } }>(
    "/hunter/submit-application/:jobId",
    {
      schema: {
        params: {
          type: "object",
          required: ["jobId"],
          properties: {
            jobId: { type: "string" },
          },
        },
        body: {
          type: "object",
          properties: {
            autoSubmit: { type: "boolean", default: false },
            customResume: { type: "string" },
            customCoverLetter: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const { autoSubmit, customResume, customCoverLetter } = request.body as any;
      const profileId = request.user?.profileId;

      if (!profileId) {
        return reply.code(401).send({
          ok: false,
          error: "unauthorized",
          message: "Authentication required",
        });
      }

      try {
        const result = await hunterService.submitApplication(profileId, jobId, {
          autoSubmit,
          customResume,
          customCoverLetter,
          submissionType: "manual",
        });

        return reply.code(200).send({
          ok: true,
          data: result,
        });
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          return reply.code(403).send({
            ok: false,
            error: "quota_exceeded",
            message: error.message,
          });
        }
        if (error instanceof FeatureNotAvailableError) {
          return reply.code(403).send({
            ok: false,
            error: "feature_not_available",
            message: error.message,
          });
        }
        throw error;
      }
    }
  );
  
  // Create middleware if licensing service is available
  const licensing = deps?.licensingService;
  const searchGate = licensing 
    ? [createFeatureGateMiddleware(licensing, "hunter_job_searches")]
    : [];
  const tailorGate = licensing
    ? [createFeatureGateMiddleware(licensing, "resume_tailoring")]
    : [];
  const applyGate = licensing
    ? [createFeatureGateMiddleware(licensing, "auto_apply")]
    : [];

  /**
   * POST /profiles/:id/hunter/search
   * Search jobs with intelligent filtering
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/hunter/search",
    {
      onRequest: searchGate,
    },
    async (request, reply) => {
      const { id } = request.params;
      
      const bodyParsed = HunterSearchFilterSchema.extend({
        maxResults: z.number().min(1).max(100).optional(),
      }).safeParse(request.body);

      if (!bodyParsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          errors: bodyParsed.error.flatten(),
        });
      }

      const { maxResults, ...filter } = bodyParsed.data;

      try {
        const start = Date.now();
        const jobs = await hunterService.findJobs(id, {
            keywords: filter.keywords,
            location: filter.locations?.[0],
            seniority: filter.seniority_levels?.[0],
            maxResults
        });

        reply.code(200).send({
          jobs,
          totalFound: jobs.length,
          searchDurationMs: Date.now() - start,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          error: "Failed to search jobs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/hunter/analyze/:jobId
   * Analyze compatibility between profile and specific job
   */
  fastify.post<{ Params: { id: string; jobId: string } }>(
    "/:id/hunter/analyze/:jobId",
    async (request, reply) => {
      const { id, jobId } = request.params;
      const body = request.body as any;

      try {
        let job = await jobRepoInstance.findPosting(jobId);

        // Fallback to job provided in body if not in repo
        if (!job && body.job) {
          job = body.job;
        }

        if (!job) {
          return reply.code(404).send({ error: "Job not found" });
        }

        const report = await hunterService.analyzeGap(id, job.title);

        // Map CompatibilityReport to expected API response structure (partial CompatibilityAnalysis)
        const compatibility = {
          overall_score: report.compatibility,
          skill_gaps: report.gaps,
          strengths: report.suggestions,
          concerns: report.concerns,
          recommendation:
            report.compatibility > 80 ? "apply_now" : "moderate_fit",
          skill_match: report.compatibility, // simplified
          cultural_match: 50,
          growth_potential: 50,
          compensation_fit: 50,
          location_suitability: 50,
          analysis_date: report.timestamp,
        };

        reply.code(200).send({
          compatibility,
          recommendation: compatibility.recommendation,
          effortEstimate: 15,
        });
      } catch (error) {
        fastify.log.error(error);

        if (error instanceof NotFoundError) {
          return reply.code(404).send({
            error: "not_found",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Failed to analyze job compatibility",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/hunter/tailor-resume
   * Generate tailored resume for specific job and persona
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/hunter/tailor-resume",
    {
      onRequest: tailorGate,
    },
    async (request, reply) => {
      const { id } = request.params;
      
      const bodyParsed = z.object({
        jobId: z.string(),
        personaId: z.string(),
      }).safeParse(request.body);

      if (!bodyParsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          errors: bodyParsed.error.flatten(),
        });
      }

      const { jobId, personaId } = bodyParsed.data;

      try {
        const result = await hunterService.tailorResume(id, jobId, {
          format: "markdown",
          highlightGaps: true,
        });

        // Use suggested improvements as emphasis points if no keyword matches found
        const emphasisPoints = result.resume.keywordMatches.length > 0 
          ? result.resume.keywordMatches 
          : result.resume.suggestedImprovements;

        reply.code(200).send({
          tailoredResume: result,
          maskedResume: result.resume.content,
          keyPointsToEmphasize: emphasisPoints,
          emphasisPoints: emphasisPoints,
          areasToDeEmphasize: [],
          tailoringRationale: result.resume.suggestedImprovements,
          personaRecommendation: personaId,
        });
      } catch (error) {
        fastify.log.error(error);

        // Check for quota exceeded error
        if (error instanceof QuotaExceededError) {
          return reply.code(403).send({
            ok: false,
            error: "quota_exceeded",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Failed to tailor resume",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/hunter/write-cover-letter
   * Generate personalized cover letter
   */
  fastify.post<{ Params: { id: string } }>(
    "/:id/hunter/write-cover-letter",
    async (request, reply) => {
      const { id } = request.params;

      const bodyParsed = z.object({
        job: z.object({
          id: z.string(),
          title: z.string().optional(),
          company: z.string().optional(),
        }).optional(),
        jobId: z.string().optional(),
        personaId: z.string(),
        tailoredResume: z.string().optional(),
      }).safeParse(request.body);

      if (!bodyParsed.success) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          errors: bodyParsed.error.flatten(),
        });
      }

      const { job, jobId: bodyJobId, personaId, tailoredResume } = bodyParsed.data;
      const jobId = job?.id || bodyJobId;

      if (!jobId) {
        return reply.code(400).send({
          ok: false,
          error: "invalid_request",
          message: "jobId is required",
        });
      }

      try {
        const result = await hunterService.generateCoverLetter(id, jobId, {
          template: "professional",
          tone: "formal",
        });

        // Extract personalized elements from notes (split comma-separated string)
        const personalizedElements = result.personalizationNotes
          .split(", ")
          .filter((note) => note.trim().length > 0);

        reply.code(200).send({
          coverLetter: result.coverLetter.content,
          template: result.coverLetter.template,
          tone: result.coverLetter.tone,
          wordCount: result.coverLetter.wordCount,
          readingTime: result.coverLetter.readingTime,
          personalizedElements: personalizedElements,
          metadata: result.metadata,
          hiringManager: result.hiringManager,
          personaRecommendation: personaId,
        });
      } catch (error) {
        fastify.log.error(error);

        // Check for not found error
        if (error instanceof NotFoundError) {
          return reply.code(404).send({
            ok: false,
            error: "not_found",
            message: error.message,
          });
        }

        // Check for quota exceeded error
        if (error instanceof QuotaExceededError) {
          return reply.code(403).send({
            ok: false,
            error: "quota_exceeded",
            message: error.message,
          });
        }

        reply.code(500).send({
          error: "Failed to generate cover letter",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * GET /profiles/:id/hunter/stats
   * Get job application statistics
   */
  fastify.get<{ Params: { id: string } }>(
    "/:id/hunter/stats",
    async (request, reply) => {
      const { id } = request.params;
      try {
        const stats = await hunterService.getApplicationStats(id);
        reply.code(200).send(stats);
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          error: "Failed to fetch hunter stats",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/hunter/applications/batch
   * Batch auto-apply to multiple jobs based on compatibility threshold
   */
  fastify.post<{
    Params: { id: string };
    Body: {
      searchFilter: Record<string, unknown>;
      personaId?: string;
      autoApplyThreshold: number;
      maxApplications?: number;
    };
  }>(
    "/:id/hunter/applications/batch",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
        body: {
          type: "object",
          required: ["searchFilter", "autoApplyThreshold"],
          properties: {
            searchFilter: { type: "object" },
            personaId: { type: "string" },
            autoApplyThreshold: { type: "number", minimum: 0, maximum: 100 },
            maxApplications: { type: "number", minimum: 1, maximum: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const {
        searchFilter,
        personaId = "default",
        autoApplyThreshold,
        maxApplications = 10,
      } = request.body;

      const profileId = request.user?.profileId;
      if (!profileId) {
        return reply.code(401).send({
          ok: false,
          error: "unauthorized",
          message: "Authentication required",
        });
      }

      try {
        const result = await hunterService.batchApply(
          id,
          searchFilter as any,
          personaId,
          autoApplyThreshold,
          maxApplications
        );

        return reply.code(200).send({
          ok: true,
          applications: result.applications,
          skipped: result.skipped,
          errors: result.errors,
          summary: {
            totalApplied: result.applications.length,
            totalSkipped: result.skipped,
            totalErrors: result.errors.length,
          },
        });
      } catch (error) {
        if (error instanceof QuotaExceededError) {
          return reply.code(403).send({
            ok: false,
            error: "quota_exceeded",
            message: error.message,
            context: {
              feature: error.feature,
              limit: error.limit,
              used: error.used,
              remaining: error.limit - error.used,
            },
          });
        }
        fastify.log.error(error);
        return reply.code(500).send({
          ok: false,
          error: "batch_application_failed",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}

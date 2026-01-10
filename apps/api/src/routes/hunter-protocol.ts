import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createHunterAgent,
  HunterSearchFilterSchema,
} from "@in-midst-my-life/core";
import type { Profile } from "@in-midst-my-life/schema";

/**
 * Hunter Protocol API Routes
 * Autonomous job-search agent endpoints
 *
 * POST /profiles/:id/hunter/search - Search jobs with filters
 * POST /profiles/:id/hunter/analyze/:jobId - Analyze job compatibility
 * POST /profiles/:id/hunter/tailor-resume - Generate tailored resume
 * POST /profiles/:id/hunter/applications - Bulk application generation
 * GET /profiles/:id/hunter/applications - List applications
 */

export async function registerHunterProtocolRoutes(
  fastify: FastifyInstance
) {
  const hunterAgent = createHunterAgent(
    process.env.NODE_ENV === "development"
  );

  /**
   * POST /profiles/:id/hunter/search
   * Search jobs with intelligent filtering
   *
   * Request body:
   * {
   *   keywords: string[],
   *   locations?: string[],
   *   remote_requirement?: "fully" | "hybrid" | "onsite" | "any",
   *   min_salary?: number,
   *   max_salary?: number,
   *   company_sizes?: string[],
   *   required_technologies?: string[],
   *   posted_within_days?: number,
   *   maxResults?: number
   * }
   */
  fastify.post<{ Params: { id: string } }>(
    "/profiles/:id/hunter/search",
    {
      schema: {
        description: "Search jobs with Hunter Protocol intelligent filtering",
        tags: ["Hunter Protocol"],
        params: z.object({ id: z.string().uuid() }),
        body: HunterSearchFilterSchema.extend({
          maxResults: z.number().min(1).max(100).optional(),
        }),
        response: {
          200: z.object({
            jobs: z.array(z.object({
              id: z.string(),
              title: z.string(),
              company: z.string(),
              location: z.string(),
              salary_min: z.number().optional(),
              salary_max: z.number().optional(),
              job_url: z.string(),
              remote: z.string(),
              technologies: z.array(z.string()).optional(),
            })),
            totalFound: z.number(),
            searchDurationMs: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { maxResults, ...filter } = request.body as any;

      try {
        const result = await hunterAgent.findJobs({
          filter,
          maxResults: maxResults || 50,
        });

        reply.code(200).send({
          jobs: result.jobs,
          totalFound: result.totalFound,
          searchDurationMs: result.searchDurationMs,
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
   *
   * Request body:
   * {
   *   job: JobListing,
   *   personaId?: string
   * }
   */
  fastify.post<{ Params: { id: string; jobId: string } }>(
    "/profiles/:id/hunter/analyze/:jobId",
    {
      schema: {
        description: "Analyze job compatibility for profile",
        tags: ["Hunter Protocol"],
        params: z.object({
          id: z.string().uuid(),
          jobId: z.string(),
        }),
        body: z.object({
          job: z.any(), // JobListing schema
          personaId: z.string().optional(),
        }),
        response: {
          200: z.object({
            compatibility: z.object({
              overall_score: z.number(),
              skill_match: z.number(),
              cultural_match: z.number(),
              recommendation: z.string(),
              skill_gaps: z.array(z.object({
                skill: z.string(),
                gap_severity: z.string(),
                learnable: z.boolean(),
              })),
              strengths: z.array(z.string()),
              concerns: z.array(z.string()),
            }),
            recommendation: z.string(),
            effortEstimate: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { job, personaId } = request.body as any;

      try {
        // In production: fetch profile from database
        const mockProfile: Profile = {
          id,
          name: "Test User",
          email: "test@example.com",
          summary: "Full-stack engineer with 5+ years experience",
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = await hunterAgent.analyzeGap({
          job,
          profile: mockProfile,
          personaId,
        });

        reply.code(200).send({
          compatibility: result.compatibility,
          recommendation: result.recommendation,
          effortEstimate: result.effortEstimate,
        });
      } catch (error) {
        fastify.log.error(error);
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
   *
   * Request body:
   * {
   *   jobId: string,
   *   personaId: string
   * }
   */
  fastify.post<{ Params: { id: string } }>(
    "/profiles/:id/hunter/tailor-resume",
    {
      schema: {
        description: "Generate persona-tailored resume for job",
        tags: ["Hunter Protocol"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          jobId: z.string(),
          personaId: z.string(),
        }),
        response: {
          200: z.object({
            maskedResume: z.string(),
            keyPointsToEmphasize: z.array(z.string()),
            areasToDeEmphasize: z.array(z.string()),
            personaRecommendation: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { jobId, personaId } = request.body as any;

      try {
        // In production: fetch profile from database
        const mockProfile: Profile = {
          id,
          name: "Test User",
          email: "test@example.com",
          summary: "Full-stack engineer with 5+ years experience",
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = await hunterAgent.tailorResume({
          jobId,
          profile: mockProfile,
          personaId,
        });

        reply.code(200).send({
          maskedResume: result.maskedResume,
          keyPointsToEmphasize: result.keyPointsToEmphasize,
          areasToDeEmphasize: result.areasToDeEmphasize,
          personaRecommendation: result.personaRecommendation,
        });
      } catch (error) {
        fastify.log.error(error);
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
   *
   * Request body:
   * {
   *   job: JobListing,
   *   personaId: string,
   *   tailoredResume: string
   * }
   */
  fastify.post<{ Params: { id: string } }>(
    "/profiles/:id/hunter/write-cover-letter",
    {
      schema: {
        description: "Generate personalized cover letter",
        tags: ["Hunter Protocol"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          job: z.any(), // JobListing
          personaId: z.string(),
          tailoredResume: z.string(),
        }),
        response: {
          200: z.object({
            coverLetter: z.string(),
            personalizedElements: z.array(z.string()),
            tone: z.enum(["formal", "conversational", "enthusiastic"]),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { job, personaId, tailoredResume } = request.body as any;

      try {
        // In production: fetch profile from database
        const mockProfile: Profile = {
          id,
          name: "Test User",
          email: "test@example.com",
          summary: "Full-stack engineer with 5+ years experience",
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = await hunterAgent.writeCoverLetter({
          job,
          profile: mockProfile,
          personaId,
          tailoredResume,
        });

        reply.code(200).send({
          coverLetter: result.coverLetter,
          personalizedElements: result.personalizedElements,
          tone: result.tone,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          error: "Failed to generate cover letter",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  /**
   * POST /profiles/:id/hunter/applications/batch
   * Generate complete applications for multiple jobs
   *
   * Request body:
   * {
   *   searchFilter: HunterSearchFilter,
   *   personaId: string,
   *   autoApplyThreshold: number (0-100),
   *   maxApplications: number
   * }
   */
  fastify.post<{ Params: { id: string } }>(
    "/profiles/:id/hunter/applications/batch",
    {
      schema: {
        description: "Generate batch applications",
        tags: ["Hunter Protocol"],
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          searchFilter: HunterSearchFilterSchema,
          personaId: z.string(),
          autoApplyThreshold: z.number().min(0).max(100).default(70),
          maxApplications: z.number().min(1).max(20).default(5),
        }),
        response: {
          200: z.object({
            applications: z.array(z.object({
              id: z.string(),
              job_id: z.string(),
              status: z.string(),
              resume_version: z.string(),
              compatibility_analysis: z.object({
                overall_score: z.number(),
                recommendation: z.string(),
              }),
              recommendation: z.string(),
            })),
            skipped: z.number(),
            errors: z.array(z.string()),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { searchFilter, personaId, autoApplyThreshold, maxApplications } =
        request.body as any;

      try {
        // In production: fetch profile from database
        const mockProfile: Profile = {
          id,
          name: "Test User",
          email: "test@example.com",
          summary: "Full-stack engineer with 5+ years experience",
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = await hunterAgent.completeApplicationPipeline({
          profile: mockProfile,
          personaId,
          searchFilter,
          autoApplyThreshold,
          maxApplications,
        });

        reply.code(200).send({
          applications: result.applications.map((app) => ({
            id: app.id,
            job_id: app.job_id,
            status: app.status,
            resume_version: app.resume_version,
            compatibility_analysis: app.compatibility_analysis
              ? {
                overall_score:
                  app.compatibility_analysis.overall_score,
                recommendation:
                  app.compatibility_analysis.recommendation,
              }
              : undefined,
            recommendation: app.recommendation,
          })),
          skipped: result.skipped,
          errors: result.errors,
        });
      } catch (error) {
        fastify.log.error(error);
        reply.code(500).send({
          error: "Failed to generate batch applications",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );
}

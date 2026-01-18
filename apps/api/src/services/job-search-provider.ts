import type { JobPosting } from "@in-midst-my-life/schema";
import type { HunterSearchFilter } from "@in-midst-my-life/schema";
import { createJobSearchProvider } from "@in-midst-my-life/core";

export interface JobSearchCriteria {
  keywords: string[];
  location?: string;
  seniority?: string;
  maxResults?: number;
}

/**
 * JobSearchProvider - Integration layer for real job data
 *
 * Features:
 * - Automatic detection of real vs. mock providers via environment variables
 * - Serper API integration (requires SERPER_API_KEY)
 * - Fallback to mock data for development/testing
 * - Seamless API transformation from core layer to schema
 */
export class JobSearchProvider {
  private provider = createJobSearchProvider(
    process.env["NODE_ENV"] === "production" || !!process.env["SERPER_API_KEY"]
  );

  async search(criteria: JobSearchCriteria): Promise<JobPosting[]> {
    // Convert JobSearchCriteria to HunterSearchFilter format
    // Note: seniority_levels is not part of HunterSearchFilter in the actual schema
    // This method should use the mock provider directly which returns JobListing[]
    const filter: HunterSearchFilter = {
      keywords: criteria.keywords || [],
      locations: criteria.location ? [criteria.location] : [],
      remote_requirement: "any",
    };

    try {
      // Use core provider (real Serper or mock based on environment)
      const results = await this.provider.search(filter);

      // Limit results if specified
      if (criteria.maxResults) {
        return results.slice(0, criteria.maxResults);
      }

      return results;
    } catch (error) {
      // Log and fallback to mock data on error
      console.error("Job search provider error:", error);
      return this.getMockFallback(criteria);
    }
  }

  /**
   * Fallback mock data for development/testing
   * Used when real providers are unavailable
   */
  private getMockFallback(criteria: JobSearchCriteria): JobPosting[] {
    const mockJobs: JobPosting[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        profileId: "550e8400-e29b-41d4-a716-446655440001",
        title: "Senior Software Engineer",
        company: "Tech Corp",
        location: criteria.location || "Remote",
        descriptionMarkdown: "Looking for experienced engineer. Experience with TypeScript, Node.js, and AWS required.",
        salaryRange: "$150,000 - $180,000 USD",
        url: "https://example.com/job/001",
        remote: "hybrid",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440002",
        profileId: "550e8400-e29b-41d4-a716-446655440001",
        title: "Full Stack Developer",
        company: "StartUp Inc",
        location: criteria.location || "Remote",
        descriptionMarkdown: "Build amazing products using TypeScript, React, and modern tooling. Join our growing team.",
        salaryRange: "$120,000 - $150,000 USD",
        url: "https://example.com/job/002",
        remote: "fully",
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Filter by keywords if provided
    if (criteria.keywords && criteria.keywords.length > 0) {
      return mockJobs.filter((job) =>
        criteria.keywords.some(
          (keyword) =>
            job.title.toLowerCase().includes(keyword.toLowerCase()) ||
            job.descriptionMarkdown?.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    return mockJobs;
  }
}

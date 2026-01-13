/**
 * API Client Utility
 *
 * Centralized fetch wrapper for type-safe API calls.
 * Provides methods for Hunter Protocol and Mask management endpoints.
 */

import type { Mask, JobListing, CompatibilityAnalysis } from "@in-midst-my-life/schema";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001") {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...options?.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ApiError(
        response.status,
        response.statusText,
        `API error: ${error || response.statusText}`
      );
    }

    // Handle empty responses
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0") {
      return undefined as unknown as T;
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: "DELETE" });
  }
}

// Singleton instance
const apiClient = new ApiClient();

/**
 * Mask API endpoints
 */
export const maskApi = {
  /**
   * GET /profiles/:profileId/masks
   * List all masks for a profile
   */
  async list(profileId: string): Promise<Mask[]> {
    return apiClient.get<Mask[]>(`/profiles/${profileId}/masks`);
  },

  /**
   * POST /profiles/:profileId/masks
   * Create a new mask
   */
  async create(
    profileId: string,
    data: Partial<Mask>
  ): Promise<Mask> {
    return apiClient.post<Mask>(`/profiles/${profileId}/masks`, data);
  },

  /**
   * PATCH /profiles/:profileId/masks/:maskId
   * Update an existing mask
   */
  async update(
    profileId: string,
    maskId: string,
    data: Partial<Mask>
  ): Promise<Mask> {
    return apiClient.patch<Mask>(
      `/profiles/${profileId}/masks/${maskId}`,
      data
    );
  },

  /**
   * DELETE /profiles/:profileId/masks/:maskId
   * Delete a mask
   */
  async delete(profileId: string, maskId: string): Promise<void> {
    return apiClient.delete<void>(
      `/profiles/${profileId}/masks/${maskId}`
    );
  },
};

/**
 * Hunter Protocol API endpoints
 */
export const hunterApi = {
  /**
   * POST /profiles/:profileId/hunter/search
   * Search for jobs with filters
   */
  async search(
    profileId: string,
    filter: {
      keywords?: string[];
      locations?: string[];
      remote_requirement?: "fully" | "hybrid" | "onsite" | "any";
      min_salary?: number;
      max_salary?: number;
      company_sizes?: string[];
      required_technologies?: string[];
      posted_within_days?: number;
      limit?: number;
    }
  ): Promise<{
    jobs: JobListing[];
    totalFound: number;
    searchDurationMs: number;
  }> {
    return apiClient.post(
      `/profiles/${profileId}/hunter/search`,
      { ...filter, maxResults: filter.limit || 50 }
    );
  },

  /**
   * POST /profiles/:profileId/hunter/analyze/:jobId
   * Analyze compatibility between profile and job
   */
  async analyze(
    profileId: string,
    jobId: string,
    job: JobListing,
    personaId?: string
  ): Promise<{
    compatibility: CompatibilityAnalysis["compatibility"];
    recommendation: string;
    effortEstimate: number;
  }> {
    return apiClient.post(
      `/profiles/${profileId}/hunter/analyze/${jobId}`,
      { job, personaId }
    );
  },

  /**
   * POST /profiles/:profileId/hunter/tailor-resume
   * Generate a tailored resume for a job
   */
  async tailorResume(
    profileId: string,
    jobId: string,
    personaId: string
  ): Promise<{
    maskedResume: string;
    keyPointsToEmphasize: string[];
    areasToDeEmphasize: string[];
    personaRecommendation: string;
  }> {
    return apiClient.post(
      `/profiles/${profileId}/hunter/tailor-resume`,
      { jobId, personaId }
    );
  },

  /**
   * POST /profiles/:profileId/hunter/write-cover-letter
   * Generate a personalized cover letter
   */
  async writeCoverLetter(
    profileId: string,
    job: JobListing,
    personaId: string,
    tailoredResume: string
  ): Promise<{
    coverLetter: string;
    personalizedElements: string[];
    tone: "formal" | "conversational" | "enthusiastic";
  }> {
    return apiClient.post(
      `/profiles/${profileId}/hunter/write-cover-letter`,
      { job, personaId, tailoredResume }
    );
  },

  /**
   * POST /profiles/:profileId/hunter/applications/batch
   * Generate batch applications for multiple jobs
   */
  async batchApplications(
    profileId: string,
    searchFilter: unknown,
    personaId: string,
    autoApplyThreshold = 70,
    maxApplications = 5
  ): Promise<{
    applications: Array<{
      id: string;
      job_id: string;
      status: string;
      resume_version: string;
      compatibility_analysis?: {
        overall_score: number;
        recommendation: string;
      };
      recommendation: string;
    }>;
    skipped: number;
    errors: string[];
  }> {
    return apiClient.post(
      `/profiles/${profileId}/hunter/applications/batch`,
      {
        searchFilter,
        personaId,
        autoApplyThreshold,
        maxApplications,
      }
    );
  },
};

export { apiClient };

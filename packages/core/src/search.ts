import type { JobPosting } from "@in-midst-my-life/schema";
import type { JobSearchQuery, JobSearchProvider } from "./jobs";

export interface SerperApiResponse {
  searchParameters: {
    q: string;
    location?: string;
    remote?: boolean;
  };
  jobs: Array<{
    title: string;
    company: string;
    description?: string;
    location?: string;
    url?: string;
    salary?: string;
    jobType?: string;
    postedDate?: string;
  }>;
}

export interface SerperSearchOptions {
  apiKey: string; // allow-secret
  baseUrl?: string;
}

/**
 * Serper API implementation of JobSearchProvider
 * Uses Serper (serper.dev) to search for job postings
 */
export class SerperJobSearchProvider implements JobSearchProvider {
  name = "serper";
  private apiKey: string; // allow-secret
  private baseUrl: string;

  constructor(options: SerperSearchOptions) {
    this.apiKey = options.apiKey; // allow-secret
    this.baseUrl = options.baseUrl ?? "https://google.serper.dev";
  }

  async search(query: JobSearchQuery): Promise<JobPosting[]> {
    const keywords = query.keywords.join(" ");
    const location = query.location ?? "";
    const searchQuery = [keywords, location].filter(Boolean).join(" ");

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: searchQuery,
          location: location || undefined,
          type: "jobs"
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as SerperApiResponse;
      const postings = data.jobs
        .slice(0, query.limit ?? 10)
        .map((job, index) => ({
          id: `serper_${Date.now()}_${index}`,
          profileId: "",
          title: job.title,
          company: job.company,
          descriptionMarkdown: job.description,
          url: job.url,
          salaryRange: job.salary,
          location: job.location,
          status: "active" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));

      return postings;
    } catch (error) {
      throw new Error(`Job search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getById(_id: string): Promise<JobPosting | null> {
    // Serper doesn't provide a way to fetch individual jobs by ID
    // This would need to be fetched from the database instead
    return null;
  }
}

/**
 * Mock job search provider for testing/demo purposes
 */
export class MockJobSearchProvider implements JobSearchProvider {
  name = "mock";

  async search(query: JobSearchQuery): Promise<JobPosting[]> {
    const keywords = query.keywords.join(" ").toLowerCase();
    const mockJobs: JobPosting[] = [
      {
        id: "mock_1",
        profileId: "",
        title: "Senior TypeScript Engineer",
        company: "TechCorp",
        location: query.location ?? "Remote",
        remote: "fully",
        salaryRange: "$150k - $200k",
        descriptionMarkdown: `We're looking for a senior TypeScript engineer to join our team.
          
**Responsibilities:**
- Build scalable TypeScript applications
- Lead technical initiatives
- Mentor junior developers
          
**Requirements:**
- 5+ years of TypeScript experience
- Experience with Node.js and React
- Strong system design knowledge`,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "mock_2",
        profileId: "",
        title: "Full Stack Engineer",
        company: "StartupXYZ",
        location: query.location ?? "San Francisco, CA",
        remote: "hybrid",
        salaryRange: "$120k - $160k",
        descriptionMarkdown: `Join our growing startup as a full stack engineer.
          
**Responsibilities:**
- Build features across our tech stack
- Collaborate with product and design
- Ship fast and iterate
          
**Requirements:**
- 3+ years of full stack experience
- Proficiency in modern JavaScript/TypeScript
- PostgreSQL experience a plus`,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "mock_3",
        profileId: "",
        title: "Solutions Architect",
        company: "EnterpriseInc",
        location: query.location ?? "New York, NY",
        remote: "onsite",
        salaryRange: "$180k - $240k",
        descriptionMarkdown: `Lead technical architecture for enterprise clients.
          
**Responsibilities:**
- Design scalable cloud solutions
- Present to C-level executives
- Manage technical relationships
          
**Requirements:**
- 8+ years of architecture experience
- AWS or GCP certification
- Strong communication skills`,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return mockJobs
      .filter((job) =>
        keywords.split(" ").some((keyword) => job.title.toLowerCase().includes(keyword) || job.company.toLowerCase().includes(keyword))
      )
      .slice(0, query.limit ?? 10);
  }

  async getById(_id: string): Promise<JobPosting | null> {
    return null;
  }
}

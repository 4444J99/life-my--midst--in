import type {
  JobListing,
  HunterSearchFilter,
} from "@in-midst-my-life/schema";
import { type JobSearchService } from "../jobs";
import { SerperJobSearchProvider } from "../search";

/**
 * Job Search Service
 * Integrates with multiple job boards:
 * - Serper (Google Jobs)
 * - LinkedIn Jobs API (planned)
 * - Indeed API (planned)
 */

export class MockJobSearchProvider implements JobSearchService {
  name = "mock-hunter";
  // ... (keeping MockJobSearchProvider as is for dev)
  private mockJobs: JobListing[] = [
    {
      id: "job-1",
      title: "Senior Software Engineer",
      company: "TechCorp",
      location: "Remote",
      remote: "fully",
      description:
        "Join our growing engineering team. We build scalable systems serving millions of users. TypeScript and Node.js experience required.",
      requirements:
        "5+ years TypeScript, React, Node.js. Experience with microservices. Strong system design.",
      salary_min: 180000,
      salary_max: 240000,
      currency: "USD",
      job_url: "https://example.com/jobs/senior-engineer",
      posted_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      source: "linkedin",
      company_industry: "Software/SaaS",
      company_size: "scale-up",
      technologies: ["TypeScript", "React", "Node.js", "PostgreSQL", "Docker"],
    },
    {
      id: "job-2",
      title: "Frontend Engineer",
      company: "DesignStudio",
      location: "Remote",
      remote: "fully",
      description:
        "Help us build beautiful user interfaces. Design-focused engineering role. TypeScript and React expertise needed.",
      requirements: "3+ years React, TypeScript, CSS. Strong design sense.",
      salary_min: 140000,
      salary_max: 180000,
      currency: "USD",
      job_url: "https://example.com/jobs/frontend-engineer",
      posted_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      source: "indeed",
      company_industry: "Design/Creative",
      company_size: "mid-market",
      technologies: ["React", "TypeScript", "CSS", "Figma"],
    }
  ];

  async search(filter: HunterSearchFilter): Promise<JobListing[]> {
    // Filter mock jobs based on criteria
    let results = [...this.mockJobs];

    // Filter by keywords
    if (filter.keywords && filter.keywords.length > 0) {
      results = results.filter((job) => {
        const jobText = (
          job.title +
          " " +
          job.description +
          " " +
          job.requirements
        ).toLowerCase();

        return filter.keywords?.some((keyword) =>
          jobText.includes(keyword.toLowerCase())
        );
      });
    }

    // Filter by location
    if (filter.locations && filter.locations.length > 0) {
      results = results.filter((job) =>
        filter.locations?.some((loc) =>
          job.location.toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    // Filter by remote requirement
    if (filter.remote_requirement && filter.remote_requirement !== "any") {
      results = results.filter((job) =>
        filter.remote_requirement === "fully"
          ? job.remote === "fully"
          : filter.remote_requirement === "hybrid"
            ? ["hybrid", "fully"].includes(job.remote)
            : job.remote === filter.remote_requirement
      );
    }

    // Sort by recency
    results.sort(
      (a, b) => b.posted_date.getTime() - a.posted_date.getTime()
    );

    return results;
  }
}

/**
 * Production Job Search Provider
 * Integrates with real APIs via Serper
 */
export class ProductionJobSearchProvider implements JobSearchService {
  name = "production-hunter";
  private serperProvider?: SerperJobSearchProvider;

  constructor(serperApiKey?: string) {
    if (serperApiKey) {
      this.serperProvider = new SerperJobSearchProvider({ apiKey: serperApiKey }); // allow-secret
    }
  }

  async search(filter: HunterSearchFilter): Promise<JobListing[]> {
    if (!this.serperProvider) {
      throw new Error("Serper API key not configured");
    }

    const query = {
      keywords: filter.keywords,
      location: filter.locations?.[0],
      limit: 20
    };

    const postings = await this.serperProvider.search(query);

    // Map JobPosting back to JobListing (schema alignment)
    return postings.map(p => ({
      id: p.id,
      title: p.title,
      company: p.company,
      location: p.location || "Remote",
      remote: p.remote === "fully" ? "fully" : p.remote === "hybrid" ? "hybrid" : "onsite",
      description: p.descriptionMarkdown || "",
      requirements: "", // Serper doesn't split these
      job_url: p.url || "",
      posted_date: new Date(p.createdAt),
      source: "other",
      technologies: []
    }));
  }
}

/**
 * Create job search provider based on environment
 */
export function createJobSearchProvider(useProduction = false): JobSearchService {
  if (useProduction || process.env['SERPER_API_KEY']) { // allow-secret
    return new ProductionJobSearchProvider(process.env['SERPER_API_KEY']); // allow-secret
  }

  return new MockJobSearchProvider();
}


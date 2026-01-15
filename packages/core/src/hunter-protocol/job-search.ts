import type {
  JobListing,
  HunterSearchFilter,
} from "@in-midst-my-life/schema";
import type { JobSearchService } from "./hunter-agent";

/**
 * Job Search Service
 * Integrates with multiple job boards:
 * - LinkedIn Jobs API
 * - Indeed API
 * - AngelList (for startups)
 * - Wellfound (formerly AngelList Talent)
 *
 * For MVP: Mock implementation
 * For Production: Integrate with actual APIs
 */

export class MockJobSearchProvider implements JobSearchService {
  /**
   * Mock job listings for development
   * In production, these would come from real APIs
   */
  private mockJobs: JobListing[] = [
    {
      id: "job-1",
      title: "Senior Software Engineer",
      company: "TechCorp",
      location: "San Francisco, CA",
      remote: "hybrid",
      description:
        "Join our growing engineering team. We build scalable systems serving millions of users.",
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
      location: "New York, NY",
      remote: "fully",
      description:
        "Help us build beautiful user interfaces. Design-focused engineering role.",
      requirements: "3+ years React, CSS, Figma collaboration. Strong design sense.",
      salary_min: 140000,
      salary_max: 180000,
      currency: "USD",
      job_url: "https://example.com/jobs/frontend-engineer",
      posted_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      source: "indeed",
      company_industry: "Design/Creative",
      company_size: "mid-market",
      technologies: ["React", "TypeScript", "CSS", "Figma"],
    },
    {
      id: "job-3",
      title: "Startup Founder - Looking for CTO",
      company: "AI Startup",
      location: "Palo Alto, CA",
      remote: "hybrid",
      description:
        "We're building an AI-powered platform and need a technical cofounder. Equity-focused.",
      requirements:
        "Full-stack expertise. ML/AI background. Startup experience preferred.",
      salary_min: 0,
      salary_max: 150000,
      currency: "USD",
      job_url: "https://example.com/jobs/cto",
      posted_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      source: "angellist",
      company_industry: "Artificial Intelligence",
      company_size: "startup",
      technologies: ["Python", "React", "FastAPI", "PyTorch"],
    },
    {
      id: "job-4",
      title: "Product Engineer",
      company: "HealthTech",
      location: "Boston, MA",
      remote: "onsite",
      description: "Build healthcare products that change lives. Full-stack opportunity.",
      requirements:
        "3+ years full-stack. Healthcare background nice-to-have. HIPAA knowledge helpful.",
      salary_min: 150000,
      salary_max: 200000,
      currency: "USD",
      job_url: "https://example.com/jobs/product-engineer",
      posted_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      source: "linkedin",
      company_industry: "Healthcare",
      company_size: "mid-market",
      technologies: ["TypeScript", "React", "Node.js", "PostgreSQL", "AWS"],
    },
    {
      id: "job-5",
      title: "Staff Engineer - Infrastructure",
      company: "CloudCorp",
      location: "Seattle, WA",
      remote: "hybrid",
      description: "Lead infrastructure initiatives for a global cloud platform.",
      requirements:
        "8+ years infrastructure/DevOps. Kubernetes, Terraform, CI/CD. Communication skills.",
      salary_min: 220000,
      salary_max: 300000,
      currency: "USD",
      job_url: "https://example.com/jobs/staff-engineer",
      posted_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      source: "indeed",
      company_industry: "Cloud Infrastructure",
      company_size: "enterprise",
      technologies: ["Kubernetes", "Terraform", "Go", "AWS", "GCP"],
    },
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

    // Filter by excluded keywords
    if (filter.exclude_keywords && filter.exclude_keywords.length > 0) {
      results = results.filter((job) => {
        const jobText = (
          job.title +
          " " +
          job.description +
          " " +
          job.requirements
        ).toLowerCase();

        return !filter.exclude_keywords?.some((keyword) =>
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

    // Filter by salary
    if (filter.min_salary) {
      results = results.filter(
        (job) =>
          job.salary_max === undefined ||
          job.salary_max >= filter.min_salary!
      );
    }

    if (filter.max_salary) {
      results = results.filter(
        (job) =>
          job.salary_min === undefined ||
          job.salary_min <= filter.max_salary!
      );
    }

    // Filter by company size
    if (filter.company_sizes && filter.company_sizes.length > 0) {
      results = results.filter((job) =>
        job.company_size ? filter.company_sizes?.includes(job.company_size) : true
      );
    }

    // Filter by technologies
    if (filter.required_technologies && filter.required_technologies.length > 0) {
      results = results.filter((job) => {
        const jobTechs = (job.technologies || []).map((t) => t.toLowerCase());

        return filter.required_technologies?.some((tech) =>
          jobTechs.includes(tech.toLowerCase())
        );
      });
    }

    // Filter by posting recency
    if (filter.posted_within_days) {
      const cutoffDate = new Date(
        Date.now() - filter.posted_within_days * 24 * 60 * 60 * 1000
      );

      results = results.filter((job) => job.posted_date >= cutoffDate);
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
 * Integrates with real APIs (stub for now)
 */
export class ProductionJobSearchProvider implements JobSearchService {
  constructor(
    private linkedInApiKey?: string,
    private indeedApiKey?: string,
    private angelListApiKey?: string
  ) {}

  async search(filter: HunterSearchFilter): Promise<JobListing[]> {
    const jobs: JobListing[] = [];

    // Search LinkedIn if configured
    if (this.linkedInApiKey && filter.sources?.includes("linkedin")) {
      const linkedInJobs = await this.searchLinkedIn(filter);
      jobs.push(...linkedInJobs);
    }

    // Search Indeed if configured
    if (this.indeedApiKey && filter.sources?.includes("indeed")) {
      const indeedJobs = await this.searchIndeed(filter);
      jobs.push(...indeedJobs);
    }

    // Search AngelList/Wellfound if configured
    if (this.angelListApiKey && filter.sources?.includes("angellist")) {
      const angelListJobs = await this.searchAngelList(filter);
      jobs.push(...angelListJobs);
    }

    // Deduplicate and sort
    const uniqueJobs = Array.from(
      new Map(jobs.map((job) => [job.job_url, job])).values()
    );

    return uniqueJobs.sort(
      (a, b) => b.posted_date.getTime() - a.posted_date.getTime()
    );
  }

  private async searchLinkedIn(_filter: HunterSearchFilter): Promise<JobListing[]> {
    // Implementation would call LinkedIn Jobs API
    // For now, return empty array
    return [];
  }

  private async searchIndeed(_filter: HunterSearchFilter): Promise<JobListing[]> {
    // Implementation would call Indeed API
    // For now, return empty array
    return [];
  }

  private async searchAngelList(_filter: HunterSearchFilter): Promise<JobListing[]> {
    // Implementation would call AngelList/Wellfound API
    // For now, return empty array
    return [];
  }
}

/**
 * Create job search provider based on environment
 */
export function createJobSearchProvider(useProduction = false): JobSearchService {
  if (useProduction) {
    return new ProductionJobSearchProvider(
      process.env['LINKEDIN_API_KEY'],
      process.env['INDEED_API_KEY'],
      process.env['ANGELLIST_API_KEY']
    );
  }

  return new MockJobSearchProvider();
}

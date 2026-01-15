import type { JobPosting } from "@in-midst-my-life/schema";
export type { JobPosting };

export interface JobSearchQuery {
  keywords: string[];
  location?: string;
  remote?: boolean;
  limit?: number;
}

export interface JobSearchProvider {
  name: string;
  search(query: JobSearchQuery): Promise<JobPosting[]>;
  getById(id: string): Promise<JobPosting | null>;
}

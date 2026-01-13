import type { JobPosting, JobApplication } from "@in-midst-my-life/schema";
import { Pool } from "pg";

export interface JobRepo {
  // Postings
  addPosting(posting: JobPosting): Promise<JobPosting>;
  listPostings(limit?: number): Promise<JobPosting[]>;
  findPosting(id: string): Promise<JobPosting | undefined>;
  
  // Applications
  addApplication(application: JobApplication): Promise<JobApplication>;
  listApplications(limit?: number): Promise<JobApplication[]>;
}

export type JobRepoKind = "memory" | "postgres";

export interface JobRepoOptions {
  kind?: JobRepoKind;
  connectionString?: string;
  pool?: Pool;
}

class InMemoryJobRepo implements JobRepo {
  private postings = new Map<string, JobPosting>();
  private applications = new Map<string, JobApplication>();

  async addPosting(posting: JobPosting) {
    this.postings.set(posting.id, posting);
    return posting;
  }

  async listPostings(limit = 100) {
    return Array.from(this.postings.values()).slice(0, limit);
  }

  async findPosting(id: string) {
    return this.postings.get(id);
  }

  async addApplication(application: JobApplication) {
    this.applications.set(application.id, application);
    return application;
  }

  async listApplications(limit = 100) {
    return Array.from(this.applications.values()).slice(0, limit);
  }
}

class PostgresJobRepo implements JobRepo {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async addPosting(posting: JobPosting) {
    const vectors = posting.vectors ? `{${posting.vectors.join(",")}}` : null;
    await this.pool.query(
      `
      INSERT INTO job_postings (
        id, profile_id, title, company, description_markdown, 
        url, salary_range, location, vectors, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        description_markdown = EXCLUDED.description_markdown,
        url = EXCLUDED.url,
        salary_range = EXCLUDED.salary_range,
        location = EXCLUDED.location,
        vectors = EXCLUDED.vectors,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
      `,
      [
        posting.id,
        posting.profileId,
        posting.title,
        posting.company,
        posting.descriptionMarkdown,
        posting.url,
        posting.salaryRange,
        posting.location,
        vectors,
        posting.status,
        posting.createdAt,
        posting.updatedAt
      ]
    );
    return posting;
  }

  async listPostings(limit = 100) {
    const res = await this.pool.query(
      `SELECT * FROM job_postings ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map(this.mapPostingRow);
  }

  async findPosting(id: string) {
    const res = await this.pool.query(
      `SELECT * FROM job_postings WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? this.mapPostingRow(res.rows[0]) : undefined;
  }

  async addApplication(app: JobApplication) {
    await this.pool.query(
      `
      INSERT INTO job_applications (
        id, profile_id, job_posting_id, status, cover_letter_markdown,
        resume_snapshot_id, applied_at, notes, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        cover_letter_markdown = EXCLUDED.cover_letter_markdown,
        notes = EXCLUDED.notes,
        updated_at = EXCLUDED.updated_at
      `,
      [
        app.id,
        app.profileId,
        app.jobPostingId,
        app.status,
        app.coverLetterMarkdown,
        app.resumeSnapshotId,
        app.appliedAt,
        app.notes,
        app.createdAt,
        app.updatedAt
      ]
    );
    return app;
  }

  async listApplications(limit = 100) {
    const res = await this.pool.query(
      `SELECT * FROM job_applications ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.rows.map(this.mapApplicationRow);
  }

  private mapPostingRow(row: any): JobPosting {
    return {
      id: row.id,
      profileId: row.profile_id,
      title: row.title,
      company: row.company,
      descriptionMarkdown: row.description_markdown,
      url: row.url,
      salaryRange: row.salary_range,
      location: row.location,
      vectors: row.vectors, // pg usually returns array for float8[]
      status: row.status as any,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  private mapApplicationRow(row: any): JobApplication {
    return {
      id: row.id,
      profileId: row.profile_id,
      jobPostingId: row.job_posting_id,
      status: row.status as any,
      coverLetterMarkdown: row.cover_letter_markdown,
      resumeSnapshotId: row.resume_snapshot_id,
      appliedAt: row.applied_at?.toISOString(),
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }
}

export function createJobRepo(options: JobRepoOptions = {}): JobRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const kind = options.kind ?? (hasPostgres ? "postgres" : "memory");

  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresJobRepo(pool);
  }
  return new InMemoryJobRepo();
}

export const jobRepo: JobRepo = createJobRepo();

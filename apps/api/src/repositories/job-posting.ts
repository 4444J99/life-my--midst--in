/**
 * Job Posting Repository
 * 
 * Abstraction layer for Job Posting persistence
 * Supports both in-memory (dev) and PostgreSQL (prod)
 */

import type { JobPosting } from "@in-midst-my-life/schema";
import { Pool } from "pg";

/**
 * Repository interface for JobPosting entities
 */
export interface JobPostingRepository {
  // Read operations
  find(id: string): Promise<JobPosting | undefined>;
  list(profileId: string, options?: { offset?: number; limit?: number }): Promise<{
    data: JobPosting[];
    total: number;
  }>;
  listByStatus(
    profileId: string,
    status: JobPosting["status"],
    options?: { offset?: number; limit?: number }
  ): Promise<JobPosting[]>;

  // Write operations
  create(job: JobPosting): Promise<JobPosting>;
  update(id: string, patch: Partial<JobPosting>): Promise<JobPosting | undefined>;
  delete(id: string): Promise<boolean>;

  // Bulk operations
  createBatch(jobs: JobPosting[]): Promise<JobPosting[]>;
}

/**
 * In-Memory Job Posting Repository (Development)
 * Uses Map for fast lookups, suitable for dev/test
 */
export class InMemoryJobPostingRepository implements JobPostingRepository {
  private jobs: Map<string, JobPosting> = new Map();

  async find(id: string): Promise<JobPosting | undefined> {
    return this.jobs.get(id);
  }

  async list(profileId: string, options: { offset?: number; limit?: number } = {}): Promise<{
    data: JobPosting[];
    total: number;
  }> {
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    const all = Array.from(this.jobs.values())
      .filter((job) => job.profileId === profileId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const data = all.slice(offset, offset + limit);

    return {
      data,
      total: all.length,
    };
  }

  async listByStatus(
    profileId: string,
    status: JobPosting["status"],
    options: { offset?: number; limit?: number } = {}
  ): Promise<JobPosting[]> {
    const offset = options.offset || 0;
    const limit = options.limit || 50;

    const byStatus = Array.from(this.jobs.values())
      .filter((job) => job.profileId === profileId && job.status === status)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return byStatus.slice(offset, offset + limit);
  }

  async create(job: JobPosting): Promise<JobPosting> {
    this.jobs.set(job.id, job);
    return job;
  }

  async update(id: string, patch: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.jobs.delete(id);
  }

  async createBatch(jobs: JobPosting[]): Promise<JobPosting[]> {
    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
    return jobs;
  }
}

/**
 * PostgreSQL Job Posting Repository (Production)
 */
export class PostgresJobPostingRepository implements JobPostingRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: any): JobPosting {
    return {
      id: row.id,
      profileId: row.profile_id,
      title: row.title,
      company: row.company,
      descriptionMarkdown: row.description_markdown,
      url: row.url,
      salaryRange: row.salary_range,
      location: row.location,
      remote: row.remote, // Ensure DB column exists or map accordingly
      vectors: row.vectors,
      status: row.status,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async find(id: string): Promise<JobPosting | undefined> {
    const res = await this.pool.query(
      `SELECT * FROM job_postings WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? this.mapRow(res.rows[0]) : undefined;
  }

  async list(profileId: string, options: { offset?: number; limit?: number } = {}): Promise<{
    data: JobPosting[];
    total: number;
  }> {
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    const countRes = await this.pool.query(
      `SELECT COUNT(*) as count FROM job_postings WHERE profile_id = $1`,
      [profileId]
    );
    
    const res = await this.pool.query(
      `SELECT * FROM job_postings WHERE profile_id = $1 ORDER BY updated_at DESC OFFSET $2 LIMIT $3`,
      [profileId, offset, limit]
    );

    return {
      data: res.rows.map(this.mapRow),
      total: parseInt(countRes.rows[0].count, 10)
    };
  }

  async listByStatus(
    profileId: string,
    status: JobPosting["status"],
    options: { offset?: number; limit?: number } = {}
  ): Promise<JobPosting[]> {
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    const res = await this.pool.query(
      `SELECT * FROM job_postings WHERE profile_id = $1 AND status = $2 ORDER BY updated_at DESC OFFSET $3 LIMIT $4`,
      [profileId, status, offset, limit]
    );

    return res.rows.map(this.mapRow);
  }

  async create(job: JobPosting): Promise<JobPosting> {
    const query = `
      INSERT INTO job_postings (
        id, profile_id, title, company, description_markdown, url, salary_range, location, vectors, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      job.id,
      job.profileId,
      job.title,
      job.company,
      job.descriptionMarkdown,
      job.url,
      job.salaryRange,
      job.location,
      job.vectors,
      job.status,
      job.createdAt,
      job.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  async update(id: string, patch: Partial<JobPosting>): Promise<JobPosting | undefined> {
    const existing = await this.find(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    
    const query = `
      UPDATE job_postings SET
        title = $2,
        company = $3,
        description_markdown = $4,
        url = $5,
        salary_range = $6,
        location = $7,
        vectors = $8,
        status = $9,
        updated_at = $10
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      updated.title,
      updated.company,
      updated.descriptionMarkdown,
      updated.url,
      updated.salaryRange,
      updated.location,
      updated.vectors,
      updated.status,
      updated.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM job_postings WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async createBatch(jobs: JobPosting[]): Promise<JobPosting[]> {
    if (jobs.length === 0) return [];
    
    // Simple iterative implementation - could be optimized with unnest for very large batches
    const results: JobPosting[] = [];
    // Start transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const job of jobs) {
        const query = `
          INSERT INTO job_postings (
            id, profile_id, title, company, description_markdown, url, salary_range, location, vectors, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            company = EXCLUDED.company,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
          RETURNING *
        `;
        const values = [
          job.id,
          job.profileId,
          job.title,
          job.company,
          job.descriptionMarkdown,
          job.url,
          job.salaryRange,
          job.location,
          job.vectors,
          job.status,
          job.createdAt,
          job.updatedAt
        ];
        const res = await client.query(query, values);
        results.push(this.mapRow(res.rows[0]));
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return results;
  }
}

/**
 * Factory function to create appropriate repository based on environment
 */
export function createJobPostingRepository(
  options?: {
    type?: "memory" | "postgres";
    db?: Pool;
  }
): JobPostingRepository {
  const type = options?.type || process.env['JOB_REPO_TYPE'] || "memory";

  if (type === "postgres") {
    if (!options?.db) {
      throw new Error("PostgreSQL repository requires database connection pool");
    }
    return new PostgresJobPostingRepository(options.db);
  }

  return new InMemoryJobPostingRepository();
}

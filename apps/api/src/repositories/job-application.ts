/**
 * Job Application Repository
 * 
 * Abstraction layer for Job Application persistence
 * Tracks user applications, their status, and outcomes
 */

import type { JobApplication } from "@in-midst-my-life/schema";
import { Pool } from "pg";

/**
 * Repository interface for JobApplication entities
 */
export interface JobApplicationRepository {
  // Read operations
  find(id: string): Promise<JobApplication | undefined>;
  findByProfileAndJob(
    profileId: string,
    jobPostingId: string
  ): Promise<JobApplication | undefined>;
  listByProfile(
    profileId: string,
    options?: { status?: JobApplication["status"]; offset?: number; limit?: number }
  ): Promise<{
    data: JobApplication[];
    total: number;
  }>;

  // Write operations
  create(app: JobApplication): Promise<JobApplication>;
  update(
    id: string,
    patch: Partial<JobApplication>
  ): Promise<JobApplication | undefined>;
  delete(id: string): Promise<boolean>;

  // Workflow operations
  markAsSubmitted(
    id: string,
    submittedDate: string
  ): Promise<JobApplication | undefined>;
  markAsRejected(
    id: string,
    notes?: string
  ): Promise<JobApplication | undefined>;
}

/**
 * In-Memory Job Application Repository (Development)
 */
export class InMemoryJobApplicationRepository implements JobApplicationRepository {
  private applications: Map<string, JobApplication> = new Map();

  async find(id: string): Promise<JobApplication | undefined> {
    return this.applications.get(id);
  }

  async findByProfileAndJob(
    profileId: string,
    jobPostingId: string
  ): Promise<JobApplication | undefined> {
    return Array.from(this.applications.values()).find(
      (app) => app.profileId === profileId && app.jobPostingId === jobPostingId
    );
  }

  async listByProfile(
    profileId: string,
    options?: { status?: JobApplication["status"]; offset?: number; limit?: number }
  ): Promise<{ data: JobApplication[]; total: number }> {
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;

    let filtered = Array.from(this.applications.values()).filter(
      (app) => app.profileId === profileId
    );

    if (options?.status) {
      filtered = filtered.filter((app) => app.status === options.status);
    }

    const sorted = filtered.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return {
      data: sorted.slice(offset, offset + limit),
      total: sorted.length,
    };
  }

  async create(app: JobApplication): Promise<JobApplication> {
    this.applications.set(app.id, app);
    return app;
  }

  async update(
    id: string,
    patch: Partial<JobApplication>
  ): Promise<JobApplication | undefined> {
    const app = this.applications.get(id);
    if (!app) return undefined;

    const updated: JobApplication = {
      ...app,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    this.applications.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.applications.delete(id);
  }

  async markAsSubmitted(
    id: string,
    submittedDate: string
  ): Promise<JobApplication | undefined> {
    return this.update(id, {
      status: "applied",
      appliedAt: submittedDate,
    });
  }

  async markAsRejected(
    id: string,
    notes?: string
  ): Promise<JobApplication | undefined> {
    return this.update(id, {
      status: "rejected",
      notes: notes ? (this.applications.get(id)?.notes ? `${this.applications.get(id)?.notes}\n${notes}` : notes) : undefined,
    });
  }
}

/**
 * PostgreSQL Job Application Repository (Production)
 */
export class PostgresJobApplicationRepository implements JobApplicationRepository {
  constructor(private pool: Pool) {}

  private mapRow(row: any): JobApplication {
    return {
      id: row.id,
      profileId: row.profile_id,
      jobPostingId: row.job_posting_id,
      status: row.status,
      coverLetterMarkdown: row.cover_letter_markdown,
      resumeSnapshotId: row.resume_snapshot_id,
      appliedAt: row.applied_at?.toISOString(),
      notes: row.notes,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async find(id: string): Promise<JobApplication | undefined> {
    const res = await this.pool.query(
      `SELECT * FROM job_applications WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? this.mapRow(res.rows[0]) : undefined;
  }

  async findByProfileAndJob(
    profileId: string,
    jobPostingId: string
  ): Promise<JobApplication | undefined> {
    const res = await this.pool.query(
      `SELECT * FROM job_applications WHERE profile_id = $1 AND job_posting_id = $2`,
      [profileId, jobPostingId]
    );
    return res.rows[0] ? this.mapRow(res.rows[0]) : undefined;
  }

  async listByProfile(
    profileId: string,
    options?: { status?: JobApplication["status"]; offset?: number; limit?: number }
  ): Promise<{ data: JobApplication[]; total: number }> {
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    
    let query = `SELECT * FROM job_applications WHERE profile_id = $1`;
    const params: any[] = [profileId];

    if (options?.status) {
      params.push(options.status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY updated_at DESC OFFSET $${params.length + 1} LIMIT $${params.length + 2}`;
    
    const countRes = await this.pool.query(
      `SELECT COUNT(*) as count FROM job_applications WHERE profile_id = $1 ${options?.status ? `AND status = '${options.status}'` : ''}`,
      [profileId]
    );

    const res = await this.pool.query(query, [...params, offset, limit]);

    return {
      data: res.rows.map(this.mapRow),
      total: parseInt(countRes.rows[0].count, 10)
    };
  }

  async create(app: JobApplication): Promise<JobApplication> {
    const query = `
      INSERT INTO job_applications (
        id, profile_id, job_posting_id, status, cover_letter_markdown, resume_snapshot_id, applied_at, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
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
    ];

    const res = await this.pool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  async update(
    id: string,
    patch: Partial<JobApplication>
  ): Promise<JobApplication | undefined> {
    const existing = await this.find(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    
    const query = `
      UPDATE job_applications SET
        status = $2,
        cover_letter_markdown = $3,
        resume_snapshot_id = $4,
        applied_at = $5,
        notes = $6,
        updated_at = $7
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      updated.status,
      updated.coverLetterMarkdown,
      updated.resumeSnapshotId,
      updated.appliedAt,
      updated.notes,
      updated.updatedAt
    ];

    const res = await this.pool.query(query, values);
    return this.mapRow(res.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM job_applications WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async markAsSubmitted(
    id: string,
    submittedDate: string
  ): Promise<JobApplication | undefined> {
    return this.update(id, {
      status: "applied",
      appliedAt: submittedDate
    });
  }

  async markAsRejected(
    id: string,
    notes?: string
  ): Promise<JobApplication | undefined> {
    const existing = await this.find(id);
    const newNotes = notes ? (existing?.notes ? `${existing.notes}\n${notes}` : notes) : existing?.notes;
    return this.update(id, {
      status: "rejected",
      notes: newNotes
    });
  }
}

/**
 * Factory function to create appropriate repository based on environment
 */
export function createJobApplicationRepository(
  options?: {
    type?: "memory" | "postgres";
    db?: Pool;
  }
): JobApplicationRepository {
  const type = options?.type || process.env['JOB_APP_REPO_TYPE'] || "memory";

  if (type === "postgres") {
    if (!options?.db) {
      throw new Error(
        "PostgreSQL repository requires database connection pool"
      );
    }
    return new PostgresJobApplicationRepository(options.db);
  }

  return new InMemoryJobApplicationRepository();
}

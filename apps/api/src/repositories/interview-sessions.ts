import type { Pool } from 'pg';

export interface InterviewAnswer {
  questionId: string;
  answer: string;
  duration: number;
  timestamp: string;
  tone?: 'defensive' | 'neutral' | 'transparent' | 'enthusiastic';
}

export interface JobRequirement {
  skill: string;
  level: 'novice' | 'intermediate' | 'advanced' | 'expert';
  required: boolean;
}

export interface InterviewSessionRecord {
  id: string;
  profileId: string;
  interviewerName: string;
  organizationName: string;
  jobTitle: string;
  jobRequirements: JobRequirement[];
  salaryRange?: { min: number; max: number };
  answers: InterviewAnswer[];
  status: 'in-progress' | 'completed' | 'archived';
  compatibilityScore?: number;
  compatibilityAnalysis?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewSessionRepo {
  create(session: InterviewSessionRecord): Promise<InterviewSessionRecord>;
  find(id: string): Promise<InterviewSessionRecord | undefined>;
  update(
    id: string,
    patch: Partial<InterviewSessionRecord>,
  ): Promise<InterviewSessionRecord | undefined>;
  listByProfile(profileId: string, limit?: number): Promise<InterviewSessionRecord[]>;
}

interface SessionRow {
  id: string;
  profile_id: string;
  interviewer_name: string;
  organization_name: string;
  job_title: string;
  job_requirements: JobRequirement[];
  salary_range: { min: number; max: number } | null;
  answers: InterviewAnswer[];
  status: string;
  compatibility_score: number | null;
  compatibility_analysis: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: SessionRow): InterviewSessionRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    interviewerName: row.interviewer_name,
    organizationName: row.organization_name,
    jobTitle: row.job_title,
    jobRequirements: row.job_requirements,
    salaryRange: row.salary_range ?? undefined,
    answers: row.answers,
    status: row.status as InterviewSessionRecord['status'],
    compatibilityScore: row.compatibility_score ?? undefined,
    compatibilityAnalysis: row.compatibility_analysis ?? undefined,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

class InMemoryInterviewSessionRepo implements InterviewSessionRepo {
  private data = new Map<string, InterviewSessionRecord>();

  create(session: InterviewSessionRecord): Promise<InterviewSessionRecord> {
    this.data.set(session.id, session);
    return Promise.resolve(session);
  }

  find(id: string): Promise<InterviewSessionRecord | undefined> {
    return Promise.resolve(this.data.get(id));
  }

  update(
    id: string,
    patch: Partial<InterviewSessionRecord>,
  ): Promise<InterviewSessionRecord | undefined> {
    const existing = this.data.get(id);
    if (!existing) return Promise.resolve(undefined);
    const updated: InterviewSessionRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    };
    this.data.set(id, updated);
    return Promise.resolve(updated);
  }

  listByProfile(profileId: string, limit = 20): Promise<InterviewSessionRecord[]> {
    const results = Array.from(this.data.values())
      .filter((s) => s.profileId === profileId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, limit);
    return Promise.resolve(results);
  }
}

class PostgresInterviewSessionRepo implements InterviewSessionRepo {
  constructor(private pool: Pool) {}

  async create(session: InterviewSessionRecord): Promise<InterviewSessionRecord> {
    const { rows } = await this.pool.query<SessionRow>(
      `INSERT INTO interview_sessions
        (id, profile_id, interviewer_name, organization_name, job_title,
         job_requirements, salary_range, answers, status,
         compatibility_score, compatibility_analysis, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        session.id,
        session.profileId,
        session.interviewerName,
        session.organizationName,
        session.jobTitle,
        JSON.stringify(session.jobRequirements),
        session.salaryRange ? JSON.stringify(session.salaryRange) : null,
        JSON.stringify(session.answers),
        session.status,
        session.compatibilityScore ?? null,
        session.compatibilityAnalysis ? JSON.stringify(session.compatibilityAnalysis) : null,
        session.createdAt,
        session.updatedAt,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error('Insert returned no rows');
    return rowToRecord(row);
  }

  async find(id: string): Promise<InterviewSessionRecord | undefined> {
    const { rows } = await this.pool.query<SessionRow>(
      'SELECT * FROM interview_sessions WHERE id = $1',
      [id],
    );
    const row = rows[0];
    return row ? rowToRecord(row) : undefined;
  }

  async update(
    id: string,
    patch: Partial<InterviewSessionRecord>,
  ): Promise<InterviewSessionRecord | undefined> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (patch.answers !== undefined) {
      sets.push(`answers = $${idx++}`);
      values.push(JSON.stringify(patch.answers));
    }
    if (patch.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(patch.status);
    }
    if (patch.compatibilityScore !== undefined) {
      sets.push(`compatibility_score = $${idx++}`);
      values.push(patch.compatibilityScore);
    }
    if (patch.compatibilityAnalysis !== undefined) {
      sets.push(`compatibility_analysis = $${idx++}`);
      values.push(JSON.stringify(patch.compatibilityAnalysis));
    }

    sets.push(`updated_at = $${idx++}`);
    values.push(patch.updatedAt ?? new Date().toISOString());

    values.push(id);

    const { rows } = await this.pool.query<SessionRow>(
      `UPDATE interview_sessions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    const row = rows[0];
    return row ? rowToRecord(row) : undefined;
  }

  async listByProfile(profileId: string, limit = 20): Promise<InterviewSessionRecord[]> {
    const { rows } = await this.pool.query<SessionRow>(
      'SELECT * FROM interview_sessions WHERE profile_id = $1 ORDER BY created_at DESC LIMIT $2',
      [profileId, limit],
    );
    return rows.map(rowToRecord);
  }
}

export function createInterviewSessionRepo(pool?: Pool): InterviewSessionRepo {
  if (pool) {
    return new PostgresInterviewSessionRepo(pool);
  }
  return new InMemoryInterviewSessionRepo();
}

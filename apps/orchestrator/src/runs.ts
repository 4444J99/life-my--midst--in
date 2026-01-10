import { Pool } from "pg";
import { loadTaskStoreConfig, type TaskStoreKind } from "./config";
import type { TaskStatus } from "./tasks";

export type RunStatus = "queued" | "running" | "completed" | "failed";
export type RunType = "github" | "schedule" | "manual";

export interface RunRecord {
  id: string;
  type: RunType;
  status: RunStatus;
  payload?: Record<string, unknown>;
  taskIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RunStore {
  add(run: RunRecord): Promise<void>;
  updateStatus(id: string, status: RunStatus, metadata?: Record<string, unknown>): Promise<void>;
  appendTask(id: string, taskId: string): Promise<void>;
  get(id: string): Promise<RunRecord | undefined>;
  list(offset: number, limit: number, status?: RunStatus): Promise<{ data: RunRecord[]; total: number }>;
}

export function deriveRunStatus(tasks: Array<{ status: TaskStatus }>): RunStatus {
  if (tasks.length === 0) return "queued";
  const terminal = tasks.every((task) => task.status === "completed" || task.status === "failed");
  if (terminal) {
    return tasks.some((task) => task.status === "failed") ? "failed" : "completed";
  }
  const hasRunning = tasks.some((task) => task.status === "running");
  const hasCompleted = tasks.some((task) => task.status === "completed");
  if (hasRunning || hasCompleted) return "running";
  return "queued";
}

class InMemoryRunStore implements RunStore {
  private runs = new Map<string, RunRecord>();

  async add(run: RunRecord) {
    const normalized: RunRecord = {
      ...run,
      payload: run.payload ?? {},
      metadata: run.metadata ?? {},
      taskIds: run.taskIds ?? [],
      createdAt: run.createdAt ?? new Date().toISOString(),
      updatedAt: run.updatedAt ?? new Date().toISOString()
    };
    this.runs.set(run.id, normalized);
  }

  async updateStatus(id: string, status: RunStatus, metadata?: Record<string, unknown>) {
    const existing = this.runs.get(id);
    if (!existing) return;
    this.runs.set(id, {
      ...existing,
      status,
      metadata: { ...(existing.metadata ?? {}), ...(metadata ?? {}) },
      updatedAt: new Date().toISOString()
    });
  }

  async appendTask(id: string, taskId: string) {
    const existing = this.runs.get(id);
    if (!existing) return;
    this.runs.set(id, {
      ...existing,
      taskIds: [...(existing.taskIds ?? []), taskId],
      updatedAt: new Date().toISOString()
    });
  }

  async get(id: string) {
    return this.runs.get(id);
  }

  async list(offset: number, limit: number, status?: RunStatus) {
    const values = Array.from(this.runs.values()).filter((run) => (status ? run.status === status : true));
    const sorted = [...values].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const slice = sorted.slice(offset, offset + limit);
    return { data: slice, total: sorted.length };
  }
}

class PostgresRunStore implements RunStore {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS runs (
        id text PRIMARY KEY,
        type text NOT NULL,
        status text NOT NULL,
        payload jsonb DEFAULT '{}'::jsonb,
        task_ids jsonb DEFAULT '[]'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
  }

  async add(run: RunRecord) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO runs (id, type, status, payload, task_ids, metadata, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         status = EXCLUDED.status,
         payload = EXCLUDED.payload,
         task_ids = EXCLUDED.task_ids,
         metadata = EXCLUDED.metadata,
         updated_at = now()`,
      [
        run.id,
        run.type,
        run.status,
        run.payload ?? {},
        JSON.stringify(run.taskIds ?? []),
        run.metadata ?? {},
        run.createdAt,
        run.updatedAt
      ]
    );
  }

  async updateStatus(id: string, status: RunStatus, metadata?: Record<string, unknown>) {
    await this.ready;
    await this.pool.query(
      `UPDATE runs SET status = $2::text, metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb, updated_at = now() WHERE id = $1`,
      [id, status, metadata ?? {}]
    );
  }

  async appendTask(id: string, taskId: string) {
    await this.ready;
    await this.pool.query(
      `UPDATE runs
       SET task_ids = COALESCE(task_ids, '[]'::jsonb) || jsonb_build_array($2::text),
           updated_at = now()
       WHERE id = $1`,
      [id, taskId]
    );
  }

  async get(id: string) {
    await this.ready;
    const res = await this.pool.query(
      `SELECT id, type, status, payload, task_ids, metadata, created_at, updated_at FROM runs WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? mapRunRow(res.rows[0]) : undefined;
  }

  async list(offset: number, limit: number, status?: RunStatus) {
    await this.ready;
    const params: Array<string | number> = [];
    const where = status ? `WHERE status = $1` : "";
    if (status) params.push(status);
    params.push(offset, limit);
    const dataQuery = `SELECT id, type, status, payload, task_ids, metadata, created_at, updated_at
      FROM runs ${where} ORDER BY created_at DESC OFFSET $${params.length - 1} LIMIT $${params.length}`;
    const countQuery = `SELECT COUNT(*)::text as count FROM runs ${where}`;
    const [{ rows: dataRows }, { rows: countRows }] = await Promise.all([
      this.pool.query(dataQuery, params),
      this.pool.query<{ count: string }>(countQuery, status ? [status] : [])
    ]);
    return { data: dataRows.map(mapRunRow), total: Number(countRows[0]?.count ?? 0) };
  }
}

function mapRunRow(row: any): RunRecord {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    payload: row.payload ?? {},
    taskIds: row.task_ids ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at
  };
}

export interface RunStoreOptions {
  kind?: TaskStoreKind;
  pool?: Pool;
  connectionString?: string;
}

export function createRunStore(options: RunStoreOptions = {}): RunStore {
  const envConfig = loadTaskStoreConfig();
  const kind = options.kind ?? envConfig.kind;
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? envConfig.connectionString
      });
    return new PostgresRunStore(pool);
  }
  return new InMemoryRunStore();
}

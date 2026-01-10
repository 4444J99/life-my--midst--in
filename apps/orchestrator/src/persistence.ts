import { Pool } from "pg";
import { loadTaskStoreConfig, type TaskStoreKind } from "./config";
import type { TrackedTask, TaskStatus } from "./tasks";

export interface TaskStore {
  add(task: TrackedTask): Promise<void>;
  setStatus(id: string, status: TaskStatus, result?: Record<string, unknown>): Promise<void>;
  updateMetadata(id: string, metadata: Record<string, unknown>): Promise<void>;
  get(id: string): Promise<TrackedTask | undefined>;
  all(): Promise<TrackedTask[]>;
  listByRunId?(runId: string): Promise<TrackedTask[]>;
  appendHistory?(id: string, entry: { status: TaskStatus; notes?: string }): Promise<void>;
  history?(id: string): Promise<TrackedTask["history"]>;
}

export class InMemoryTaskStore implements TaskStore {
  private tasks = new Map<string, TrackedTask>();

  constructor(initial: TrackedTask[] = []) {
    initial.forEach((t) => this.tasks.set(t.id, t));
  }

  async add(task: TrackedTask) {
    this.tasks.set(task.id, {
      attempts: 0,
      history: [],
      metadata: {},
      ...task,
      llm: task.llm ?? {}
    });
  }

  async setStatus(id: string, status: TaskStatus, result?: Record<string, unknown>) {
    const existing = this.tasks.get(id);
    if (!existing) return;
    const attempts = status === "running" || status === "failed" ? (existing.attempts ?? 0) + 1 : existing.attempts ?? 0;
    existing.status = status;
    existing.result = result;
    existing.attempts = attempts;
    existing.history = [...(existing.history ?? []), { status, timestamp: new Date().toISOString() }];
    const llm = (result as Record<string, unknown> | undefined)?.['llm'];
    if (llm && typeof llm === "object") {
      existing.llm = { ...(existing.llm ?? {}), ...(llm as Record<string, unknown>) };
    }
    this.tasks.set(id, existing);
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>) {
    const existing = this.tasks.get(id);
    if (!existing) return;
    existing.metadata = { ...(existing.metadata ?? {}), ...metadata };
    this.tasks.set(id, existing);
  }

  async get(id: string) {
    return this.tasks.get(id);
  }

  async all() {
    return Array.from(this.tasks.values());
  }

  async listByRunId(runId: string) {
    return Array.from(this.tasks.values()).filter((task) => task.runId === runId);
  }

  async history(id: string) {
    return this.tasks.get(id)?.history ?? [];
  }
}

export class PostgresTaskStore implements TaskStore {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id text PRIMARY KEY,
        run_id text,
        role text NOT NULL,
        description text NOT NULL,
        payload jsonb DEFAULT '{}'::jsonb,
        status text NOT NULL,
        result jsonb,
        llm jsonb DEFAULT '{}'::jsonb,
        metadata jsonb DEFAULT '{}'::jsonb,
        attempts integer DEFAULT 0,
        history jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
  }

  private mapRow(row: any): TrackedTask {
    return {
      id: row.id,
      runId: row.run_id ?? undefined,
      role: row.role as any,
      description: row.description,
      payload: row.payload ?? {},
      status: row.status as TaskStatus,
      result: row.result ?? undefined,
      llm: row.llm ?? {},
      metadata: row.metadata ?? {},
      attempts: row.attempts ?? 0,
      history: row.history ?? []
    };
  }

  async add(task: TrackedTask) {
    await this.ready;
    await this.pool.query(
      `
      INSERT INTO tasks (id, run_id, role, description, payload, status, result, llm, metadata, attempts, history)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        run_id = EXCLUDED.run_id,
        role = EXCLUDED.role,
        description = EXCLUDED.description,
        payload = EXCLUDED.payload,
        status = EXCLUDED.status,
        result = EXCLUDED.result,
        llm = EXCLUDED.llm,
        metadata = EXCLUDED.metadata,
        attempts = EXCLUDED.attempts,
        history = EXCLUDED.history,
        updated_at = now()
    `,
      [
        task.id,
        task.runId ?? null,
        task.role,
        task.description,
        task.payload ?? {},
        task.status,
        task.result ?? null,
        task.llm ?? {},
        task.metadata ?? {},
        task.attempts ?? 0,
        task.history ?? []
      ]
    );
  }

  async setStatus(id: string, status: TaskStatus, result?: Record<string, unknown>) {
    await this.ready;
    const increment = status === "running" || status === "failed" ? 1 : 0;
    const llm = (result as Record<string, unknown> | undefined)?.['llm'] ?? {};
    await this.pool.query(
      `UPDATE tasks
       SET status = $2::text,
           result = $3::jsonb,
           llm = COALESCE(llm, '{}'::jsonb) || $6::jsonb,
           attempts = attempts + $4,
           history = COALESCE(history, '[]'::jsonb) || jsonb_build_object('status', $2::text, 'timestamp', now(), 'notes', $5::text),
           updated_at = now()
       WHERE id = $1`,
      [id, status, result ?? null, increment, (result as any)?.notes ?? null, llm]
    );
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>) {
    await this.ready;
    await this.pool.query(
      `UPDATE tasks SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb, updated_at = now() WHERE id = $1`,
      [id, metadata]
    );
  }

  async get(id: string) {
    await this.ready;
    const res = await this.pool.query<TrackedTask>(
      `SELECT id, run_id, role, description, payload, status, result, llm, metadata, attempts, history FROM tasks WHERE id = $1`,
      [id]
    );
    const row = res.rows[0];
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async all() {
    await this.ready;
    const res = await this.pool.query<TrackedTask>(
      `SELECT id, run_id, role, description, payload, status, result, llm, metadata, attempts, history FROM tasks ORDER BY created_at DESC`
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async listByRunId(runId: string) {
    await this.ready;
    const res = await this.pool.query<TrackedTask>(
      `SELECT id, run_id, role, description, payload, status, result, llm, metadata, attempts, history
       FROM tasks WHERE run_id = $1 ORDER BY created_at DESC`,
      [runId]
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async history(id: string) {
    await this.ready;
    const res = await this.pool.query<{ history: TrackedTask["history"] }>(`SELECT history FROM tasks WHERE id = $1`, [id]);
    return res.rows[0]?.history ?? [];
  }
}

export interface TaskStoreOptions {
  kind?: TaskStoreKind;
  pool?: Pool;
  connectionString?: string;
}

export function createTaskStore(options: TaskStoreOptions = {}): TaskStore {
  const envConfig = loadTaskStoreConfig();
  const kind = options.kind ?? envConfig.kind;

  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? envConfig.connectionString
      });
    return new PostgresTaskStore(pool);
  }

  return new InMemoryTaskStore();
}

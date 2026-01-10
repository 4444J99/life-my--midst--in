import type { NarrativeSnapshot } from "@in-midst-my-life/schema";
import { Pool } from "pg";

export interface NarrativeRepo {
  create(snapshot: NarrativeSnapshot): Promise<NarrativeSnapshot>;
  update(id: string, patch: Partial<NarrativeSnapshot>): Promise<NarrativeSnapshot | undefined>;
  get(id: string): Promise<NarrativeSnapshot | undefined>;
  list(profileId: string, status?: string, maskId?: string): Promise<NarrativeSnapshot[]>;
  latestApproved(profileId: string, maskId?: string): Promise<NarrativeSnapshot | undefined>;
  reset(): Promise<void>;
}

export type NarrativeRepoKind = "memory" | "postgres";

export interface NarrativeRepoOptions {
  kind?: NarrativeRepoKind;
  pool?: Pool;
  connectionString?: string;
}

class InMemoryNarrativeRepo implements NarrativeRepo {
  private data = new Map<string, NarrativeSnapshot>();

  async create(snapshot: NarrativeSnapshot) {
    this.data.set(snapshot.id, snapshot);
    return snapshot;
  }

  async update(id: string, patch: Partial<NarrativeSnapshot>) {
    const existing = this.data.get(id);
    if (!existing) return undefined;
    const updated: NarrativeSnapshot = {
      ...existing,
      ...patch,
      id: existing.id,
      profileId: existing.profileId,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    this.data.set(id, updated);
    return updated;
  }

  async get(id: string) {
    return this.data.get(id);
  }

  async list(profileId: string, status?: string, maskId?: string) {
    return Array.from(this.data.values()).filter((item) => {
      if (item.profileId !== profileId) return false;
      if (status && item.status !== status) return false;
      if (maskId && item.maskId !== maskId) return false;
      return true;
    });
  }

  async latestApproved(profileId: string, maskId?: string) {
    const items = await this.list(profileId, "approved", maskId);
    return items.sort((a, b) => (a.approvedAt ?? a.updatedAt) < (b.approvedAt ?? b.updatedAt) ? 1 : -1)[0];
  }

  async reset() {
    this.data.clear();
  }
}

class PostgresNarrativeRepo implements NarrativeRepo {
  private pool: Pool;
  private ready: Promise<void>;

  constructor(pool: Pool) {
    this.pool = pool;
    this.ready = this.ensureTable();
  }

  private async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS narrative_snapshots (
        id uuid PRIMARY KEY,
        profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        mask_id text,
        status text NOT NULL,
        data jsonb NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        approved_at timestamptz
      )
    `);
  }

  private mapRow(row: any): NarrativeSnapshot {
    return row.data as NarrativeSnapshot;
  }

  async create(snapshot: NarrativeSnapshot) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO narrative_snapshots (id, profile_id, mask_id, status, data, created_at, updated_at, approved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, approved_at = EXCLUDED.approved_at`,
      [
        snapshot.id,
        snapshot.profileId,
        snapshot.maskId ?? null,
        snapshot.status,
        snapshot,
        snapshot.createdAt,
        snapshot.updatedAt,
        snapshot.approvedAt ?? null
      ]
    );
    return snapshot;
  }

  async update(id: string, patch: Partial<NarrativeSnapshot>) {
    await this.ready;
    const existing = await this.get(id);
    if (!existing) return undefined;
    const updated: NarrativeSnapshot = {
      ...existing,
      ...patch,
      id: existing.id,
      profileId: existing.profileId,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? new Date().toISOString()
    };
    await this.create(updated);
    return updated;
  }

  async get(id: string) {
    await this.ready;
    const res = await this.pool.query(`SELECT data FROM narrative_snapshots WHERE id = $1`, [id]);
    return res.rows[0] ? this.mapRow(res.rows[0]) : undefined;
  }

  async list(profileId: string, status?: string, maskId?: string) {
    await this.ready;
    const clauses: string[] = ["profile_id = $1"];
    const params: any[] = [profileId];
    if (status) {
      clauses.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (maskId) {
      clauses.push(`mask_id = $${params.length + 1}`);
      params.push(maskId);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const res = await this.pool.query(
      `SELECT data FROM narrative_snapshots ${where} ORDER BY updated_at DESC`,
      params
    );
    return res.rows.map((row) => this.mapRow(row));
  }

  async latestApproved(profileId: string, maskId?: string) {
    await this.ready;
    const clauses: string[] = ["profile_id = $1", "status = 'approved'"];
    const params: any[] = [profileId];
    if (maskId) {
      clauses.push(`mask_id = $${params.length + 1}`);
      params.push(maskId);
    }
    const where = `WHERE ${clauses.join(" AND ")}`;
    const res = await this.pool.query(
      `SELECT data FROM narrative_snapshots ${where} ORDER BY approved_at DESC NULLS LAST, updated_at DESC LIMIT 1`,
      params
    );
    return res.rows[0] ? this.mapRow(res.rows[0]) : undefined;
  }

  async reset() {
    await this.ready;
    await this.pool.query(`TRUNCATE TABLE narrative_snapshots`);
  }
}

export function createNarrativeRepo(options: NarrativeRepoOptions = {}): NarrativeRepo {
  const hasPostgres = Boolean(options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]);
  const kind =
    options.kind ??
    (process.env["NARRATIVE_STORE"] ?? (hasPostgres ? "postgres" : "memory"));
  if (kind === "postgres") {
    const pool =
      options.pool ??
      new Pool({
        connectionString: options.connectionString ?? process.env["DATABASE_URL"] ?? process.env["POSTGRES_URL"]
      });
    return new PostgresNarrativeRepo(pool);
  }
  return new InMemoryNarrativeRepo();
}

export const narrativeRepo: NarrativeRepo = createNarrativeRepo();
